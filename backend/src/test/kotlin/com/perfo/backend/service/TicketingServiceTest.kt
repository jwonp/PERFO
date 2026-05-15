package com.perfo.backend.service

import com.fasterxml.jackson.databind.ObjectMapper
import com.perfo.backend.dto.TicketDto
import com.perfo.backend.entity.Event
import com.perfo.backend.entity.TicketPurchaseResult
import com.perfo.backend.entity.TicketingOutbox
import com.perfo.backend.entity.TicketingOutboxEventType
import com.perfo.backend.entity.TicketUsageStatus
import com.perfo.backend.repository.EventRepository
import com.perfo.backend.repository.TicketRepository
import com.perfo.backend.repository.TicketingOutboxRepository
import com.perfo.backend.repository.TicketingRequestRepository
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.ActiveProfiles
import java.time.Instant
import java.time.LocalDateTime

@SpringBootTest
@ActiveProfiles("test")
class TicketingServiceTest {

    @Autowired
    private lateinit var eventRepository: EventRepository

    @Autowired
    private lateinit var ticketRepository: TicketRepository

    @Autowired
    private lateinit var ticketingRequestRepository: TicketingRequestRepository

    @Autowired
    private lateinit var ticketingOutboxRepository: TicketingOutboxRepository

    @Autowired
    private lateinit var ticketingService: TicketingService

    @Autowired
    private lateinit var databaseTimeService: DatabaseTimeService

    @Autowired
    private lateinit var objectMapper: ObjectMapper

    @BeforeEach
    fun setUp() {
        ticketRepository.deleteAll()
        ticketingOutboxRepository.deleteAll()
        ticketingRequestRepository.deleteAll()
        eventRepository.deleteAll()
    }

    @Test
    @DisplayName("판매 오픈 전이면 NOT_OPEN을 반환하고 티켓을 생성하지 않는다")
    fun submitRequest_beforeOpen_returnsNotOpen() {
        val event = eventRepository.save(activeEvent(saleOpenAt = databaseTimeService.currentInstant().plusSeconds(300)))

        val response = ticketingService.submitRequest(
            authenticatedUserId = 1L,
            request = TicketDto.TicketingRequestSubmitRequest(
                requestId = "req_before_open_0001",
                eventId = event.id!!,
                quantity = 1,
            ),
        )

        assertThat(response.result).isEqualTo(TicketPurchaseResult.NOT_OPEN)
        assertThat(response.ticketIds).isEmpty()
        assertThat(ticketRepository.findAll()).isEmpty()
        val outbox = ticketingOutboxRepository.findByRequestId("req_before_open_0001")
        assertThat(outbox).isNotNull
        assertThat(outbox?.eventType).isEqualTo(TicketingOutboxEventType.PURCHASE_REJECTED)
        assertThat(outbox?.payload).contains("\"result\":\"NOT_OPEN\"")
    }

    @Test
    @DisplayName("판매 오픈 이후면 즉시 성공하고 재고와 티켓 번호를 같은 트랜잭션에서 반영한다")
    fun submitRequest_afterOpen_createsTicketsAndDecrementsInventory() {
        val now = databaseTimeService.currentInstant()
        val event = eventRepository.save(
            activeEvent(
                remainingQuantity = 5,
                nextTicketNumber = 10,
                saleOpenAt = now.minusSeconds(60),
                saleCloseAt = now.plusSeconds(3600),
            ),
        )

        val response = ticketingService.submitRequest(
            authenticatedUserId = 2L,
            request = TicketDto.TicketingRequestSubmitRequest(
                requestId = "req_after_open_0001",
                eventId = event.id!!,
                quantity = 2,
            ),
        )

        val persistedEvent = eventRepository.findById(event.id!!).orElseThrow()
        val tickets = ticketRepository.findByEventIdAndUserIdOrderByIdAsc(event.id!!, 2L)

        assertThat(response.result).isEqualTo(TicketPurchaseResult.SUCCESS)
        assertThat(response.ticketNumbers).containsExactly(10, 11)
        assertThat(response.remainingQuantity).isEqualTo(3)
        assertThat(persistedEvent.remainingQuantity).isEqualTo(3)
        assertThat(persistedEvent.nextTicketNumber).isEqualTo(12)
        assertThat(tickets).hasSize(2)
        assertThat(tickets.map { it.usageStatus }).containsOnly(TicketUsageStatus.BEFORE_SERVING)
        val outbox = ticketingOutboxRepository.findByRequestId("req_after_open_0001")
        assertThat(outbox).isNotNull
        assertThat(outbox?.eventType).isEqualTo(TicketingOutboxEventType.PURCHASE_SUCCEEDED)
        assertThat(outbox?.payload).contains("\"result\":\"SUCCESS\"")
        assertThat(outbox?.payload).contains("\"ticketNumbers\":[10,11]")
    }

    @Test
    @DisplayName("같은 requestId 재시도 시 같은 결과를 반환한다")
    fun submitRequest_sameRequestId_returnsStoredResponse() {
        val now = databaseTimeService.currentInstant()
        val event = eventRepository.save(activeEvent(remainingQuantity = 4, saleOpenAt = now.minusSeconds(60), saleCloseAt = now.plusSeconds(3600)))
        val request = TicketDto.TicketingRequestSubmitRequest(
            requestId = "req_idempotent_0001",
            eventId = event.id!!,
            quantity = 1,
        )

        val first = ticketingService.submitRequest(3L, request)
        val second = ticketingService.submitRequest(3L, request)

        assertThat(first).isEqualTo(second)
        assertThat(ticketRepository.findByEventIdAndUserIdOrderByIdAsc(event.id!!, 3L)).hasSize(1)
    }

    @Test
    @DisplayName("allowDuplicate=false 이고 기존 구매 이력이 있으면 DUPLICATE_PURCHASE를 반환한다")
    fun submitRequest_duplicatePurchaseBlocked() {
        val now = databaseTimeService.currentInstant()
        val event = eventRepository.save(activeEvent(allowDuplicate = false, maxPerUser = 3, saleOpenAt = now.minusSeconds(60), saleCloseAt = now.plusSeconds(3600)))

        val first = ticketingService.submitRequest(
            4L,
            TicketDto.TicketingRequestSubmitRequest(
                requestId = "req_duplicate_0001",
                eventId = event.id!!,
                quantity = 1,
            ),
        )
        val second = ticketingService.submitRequest(
            4L,
            TicketDto.TicketingRequestSubmitRequest(
                requestId = "req_duplicate_0002",
                eventId = event.id!!,
                quantity = 1,
            ),
        )

        assertThat(first.result).isEqualTo(TicketPurchaseResult.SUCCESS)
        assertThat(second.result).isEqualTo(TicketPurchaseResult.DUPLICATE_PURCHASE)
    }

    @Test
    @DisplayName("maxPerUser는 트랜잭션 안에서 누적 구매량 기준으로 강제된다")
    fun submitRequest_respectsMaxPerUser() {
        val now = databaseTimeService.currentInstant()
        val event = eventRepository.save(activeEvent(allowDuplicate = true, maxPerUser = 2, remainingQuantity = 5, saleOpenAt = now.minusSeconds(60), saleCloseAt = now.plusSeconds(3600)))

        val first = ticketingService.submitRequest(
            5L,
            TicketDto.TicketingRequestSubmitRequest(
                requestId = "req_limit_0001",
                eventId = event.id!!,
                quantity = 2,
            ),
        )
        val second = ticketingService.submitRequest(
            5L,
            TicketDto.TicketingRequestSubmitRequest(
                requestId = "req_limit_0002",
                eventId = event.id!!,
                quantity = 1,
            ),
        )

        assertThat(first.result).isEqualTo(TicketPurchaseResult.SUCCESS)
        assertThat(second.result).isEqualTo(TicketPurchaseResult.MAX_PER_USER_EXCEEDED)
    }

    @Test
    @DisplayName("판매 종료 시각이 DB 현재 시각보다 과거면 SALE_CLOSED를 반환한다")
    fun submitRequest_afterClose_returnsSaleClosed() {
        val dbNow = databaseTimeService.currentInstant()
        val event = eventRepository.save(
            activeEvent(
                remainingQuantity = 5,
                saleOpenAt = dbNow.minusSeconds(3600),
                saleCloseAt = dbNow.minusSeconds(1),
            ),
        )

        val response = ticketingService.submitRequest(
            authenticatedUserId = 6L,
            request = TicketDto.TicketingRequestSubmitRequest(
                requestId = "req_after_close_0001",
                eventId = event.id!!,
                quantity = 1,
            ),
        )

        assertThat(response.result).isEqualTo(TicketPurchaseResult.SALE_CLOSED)
        assertThat(ticketRepository.findAll()).isEmpty()
    }

    @Test
    @DisplayName("outbox 저장이 실패하면 ledger, ticket, outbox 모두 롤백된다")
    fun submitRequest_outboxFailure_rollsBackWholeTransaction() {
        val now = databaseTimeService.currentInstant()
        val event = eventRepository.save(
            activeEvent(
                remainingQuantity = 5,
                saleOpenAt = now.minusSeconds(60),
                saleCloseAt = now.plusSeconds(3600),
            ),
        )
        val requestId = "req_outbox_conflict_0001"
        ticketingOutboxRepository.save(
            TicketingOutbox(
                requestId = requestId,
                eventId = event.id!!,
                userId = 999L,
                aggregateId = requestId,
                eventType = TicketingOutboxEventType.PURCHASE_SUCCEEDED,
                payload = objectMapper.writeValueAsString(
                    TicketingOutboxPayload(
                        requestId = requestId,
                        eventId = event.id!!,
                        userId = 999L,
                        quantity = 1,
                        result = TicketPurchaseResult.SUCCESS,
                        occurredAt = now,
                    ),
                ),
            ),
        )

        assertThrows(IllegalStateException::class.java) {
            ticketingService.submitRequest(
                authenticatedUserId = 7L,
                request = TicketDto.TicketingRequestSubmitRequest(
                    requestId = requestId,
                    eventId = event.id!!,
                    quantity = 1,
                ),
            )
        }

        assertThat(ticketingRequestRepository.findByRequestId(requestId)).isNull()
        assertThat(ticketRepository.findByEventIdAndUserIdOrderByIdAsc(event.id!!, 7L)).isEmpty()
        assertThat(ticketingOutboxRepository.findAll()).hasSize(1)
        val persistedEvent = eventRepository.findById(event.id!!).orElseThrow()
        assertThat(persistedEvent.remainingQuantity).isEqualTo(5)
        assertThat(persistedEvent.nextTicketNumber).isEqualTo(1)
    }

    private fun activeEvent(
        remainingQuantity: Int = 10,
        saleOpenAt: Instant = Instant.now().minusSeconds(60),
        saleCloseAt: Instant = Instant.now().plusSeconds(3600),
        allowDuplicate: Boolean = false,
        maxPerUser: Int = 2,
        nextTicketNumber: Int = 1,
    ): Event {
        return Event(
            name = "Phase 1 Event",
            venue = "KSPO Dome",
            validFrom = LocalDateTime.now().plusDays(1),
            validUntil = LocalDateTime.now().plusDays(1).plusHours(3),
            totalQuantity = remainingQuantity,
            remainingQuantity = remainingQuantity,
            saleOpenAt = saleOpenAt,
            saleCloseAt = saleCloseAt,
            maxPerUser = maxPerUser,
            allowDuplicate = allowDuplicate,
            nextTicketNumber = nextTicketNumber,
            active = true,
        )
    }
}
