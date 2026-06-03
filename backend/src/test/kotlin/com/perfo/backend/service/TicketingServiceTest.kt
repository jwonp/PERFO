package com.perfo.backend.service

import com.fasterxml.jackson.databind.ObjectMapper
import com.perfo.backend.dto.TicketDto
import com.perfo.backend.entity.BookingMode
import com.perfo.backend.entity.Event
import com.perfo.backend.entity.EventItem
import com.perfo.backend.entity.TicketPurchaseResult
import com.perfo.backend.entity.TicketingOutbox
import com.perfo.backend.entity.TicketingOutboxEventType
import com.perfo.backend.entity.TicketUsageStatus
import com.perfo.backend.repository.EventRepository
import com.perfo.backend.repository.EventItemRepository
import com.perfo.backend.repository.BookingOrderItemRepository
import com.perfo.backend.repository.BookingOrderRepository
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
    private lateinit var eventItemRepository: EventItemRepository

    @Autowired
    private lateinit var ticketRepository: TicketRepository

    @Autowired
    private lateinit var bookingOrderRepository: BookingOrderRepository

    @Autowired
    private lateinit var bookingOrderItemRepository: BookingOrderItemRepository

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
        bookingOrderItemRepository.deleteAll()
        bookingOrderRepository.deleteAll()
        eventItemRepository.deleteAll()
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

    @Test
    @DisplayName("ITEMIZED 요청 성공 시 주문 항목을 저장하고 항목별 재고만 차감한다")
    fun submitRequest_itemized_successCreatesOrderItemsAndDecrementsItemInventory() {
        val now = databaseTimeService.currentInstant()
        val event = eventRepository.save(
            activeEvent(
                remainingQuantity = 99,
                saleOpenAt = now.minusSeconds(60),
                saleCloseAt = now.plusSeconds(3600),
                bookingMode = BookingMode.ITEMIZED,
            ),
        )
        val photoCard = eventItemRepository.save(item(event.id!!, name = "Photo card", remainingQuantity = 5, maxPerUser = 3, sortOrder = 1))
        val keyring = eventItemRepository.save(item(event.id!!, name = "Keyring", remainingQuantity = 2, maxPerUser = 2, sortOrder = 2))

        val response = ticketingService.submitRequest(
            authenticatedUserId = 20L,
            request = TicketDto.TicketingRequestSubmitRequest(
                requestId = "req_itemized_success_0001",
                eventId = event.id!!,
                items = listOf(
                    TicketDto.TicketingItemRequest(eventItemId = keyring.id!!, quantity = 1),
                    TicketDto.TicketingItemRequest(eventItemId = photoCard.id!!, quantity = 2),
                ),
            ),
        )

        assertThat(response.result).isEqualTo(TicketPurchaseResult.SUCCESS)
        assertThat(response.bookingMode).isEqualTo(BookingMode.ITEMIZED)
        assertThat(response.quantity).isEqualTo(3)
        assertThat(response.ticketIds).isEmpty()
        assertThat(response.items.map { it.itemName }).containsExactly("Photo card", "Keyring")
        assertThat(eventItemRepository.findById(photoCard.id!!).orElseThrow().remainingQuantity).isEqualTo(3)
        assertThat(eventItemRepository.findById(keyring.id!!).orElseThrow().remainingQuantity).isEqualTo(1)
        assertThat(eventRepository.findById(event.id!!).orElseThrow().remainingQuantity).isEqualTo(99)
        assertThat(bookingOrderRepository.findByRequestId("req_itemized_success_0001")).isNotNull
        assertThat(ticketingOutboxRepository.findByRequestId("req_itemized_success_0001")?.payload).contains("\"bookingMode\":\"ITEMIZED\"")
    }

    @Test
    @DisplayName("ITEMIZED 요청에서 한 항목이라도 재고 부족이면 전체 실패하고 부족 항목을 반환한다")
    fun submitRequest_itemized_inventoryShortageRejectsWholeOrder() {
        val now = databaseTimeService.currentInstant()
        val event = eventRepository.save(activeEvent(saleOpenAt = now.minusSeconds(60), saleCloseAt = now.plusSeconds(3600), bookingMode = BookingMode.ITEMIZED))
        val photoCard = eventItemRepository.save(item(event.id!!, name = "Photo card", remainingQuantity = 5, sortOrder = 1))
        val keyring = eventItemRepository.save(item(event.id!!, name = "Keyring", remainingQuantity = 1, sortOrder = 2))

        val response = ticketingService.submitRequest(
            authenticatedUserId = 21L,
            request = TicketDto.TicketingRequestSubmitRequest(
                requestId = "req_itemized_short_0001",
                eventId = event.id!!,
                items = listOf(
                    TicketDto.TicketingItemRequest(eventItemId = photoCard.id!!, quantity = 2),
                    TicketDto.TicketingItemRequest(eventItemId = keyring.id!!, quantity = 2),
                ),
            ),
        )

        assertThat(response.result).isEqualTo(TicketPurchaseResult.INSUFFICIENT_ITEM_INVENTORY)
        assertThat(response.shortages).containsExactly(
            TicketDto.TicketingItemShortageResponse(
                eventItemId = keyring.id!!,
                requestedQuantity = 2,
                availableQuantity = 1,
            ),
        )
        assertThat(eventItemRepository.findById(photoCard.id!!).orElseThrow().remainingQuantity).isEqualTo(5)
        assertThat(eventItemRepository.findById(keyring.id!!).orElseThrow().remainingQuantity).isEqualTo(1)
        assertThat(bookingOrderRepository.findByRequestId("req_itemized_short_0001")).isNull()
    }

    @Test
    @DisplayName("ITEMIZED 요청은 항목별 maxPerUser 누적 제한을 강제한다")
    fun submitRequest_itemized_respectsItemMaxPerUser() {
        val now = databaseTimeService.currentInstant()
        val event = eventRepository.save(activeEvent(saleOpenAt = now.minusSeconds(60), saleCloseAt = now.plusSeconds(3600), bookingMode = BookingMode.ITEMIZED))
        val photoCard = eventItemRepository.save(item(event.id!!, name = "Photo card", remainingQuantity = 5, maxPerUser = 2))

        val first = ticketingService.submitRequest(
            22L,
            TicketDto.TicketingRequestSubmitRequest(
                requestId = "req_itemized_limit_0001",
                eventId = event.id!!,
                items = listOf(TicketDto.TicketingItemRequest(eventItemId = photoCard.id!!, quantity = 2)),
            ),
        )
        val second = ticketingService.submitRequest(
            22L,
            TicketDto.TicketingRequestSubmitRequest(
                requestId = "req_itemized_limit_0002",
                eventId = event.id!!,
                items = listOf(TicketDto.TicketingItemRequest(eventItemId = photoCard.id!!, quantity = 1)),
            ),
        )

        assertThat(first.result).isEqualTo(TicketPurchaseResult.SUCCESS)
        assertThat(second.result).isEqualTo(TicketPurchaseResult.ITEM_MAX_PER_USER_EXCEEDED)
        assertThat(eventItemRepository.findById(photoCard.id!!).orElseThrow().remainingQuantity).isEqualTo(3)
    }

    @Test
    @DisplayName("ITEMIZED 요청은 같은 requestId와 같은 items를 순서 무관하게 재시도할 수 있다")
    fun submitRequest_itemized_idempotencyIgnoresItemOrder() {
        val now = databaseTimeService.currentInstant()
        val event = eventRepository.save(activeEvent(saleOpenAt = now.minusSeconds(60), saleCloseAt = now.plusSeconds(3600), bookingMode = BookingMode.ITEMIZED))
        val photoCard = eventItemRepository.save(item(event.id!!, name = "Photo card", remainingQuantity = 5, maxPerUser = 3, sortOrder = 1))
        val keyring = eventItemRepository.save(item(event.id!!, name = "Keyring", remainingQuantity = 5, maxPerUser = 3, sortOrder = 2))

        val first = ticketingService.submitRequest(
            23L,
            TicketDto.TicketingRequestSubmitRequest(
                requestId = "req_itemized_replay_0001",
                eventId = event.id!!,
                items = listOf(
                    TicketDto.TicketingItemRequest(eventItemId = keyring.id!!, quantity = 1),
                    TicketDto.TicketingItemRequest(eventItemId = photoCard.id!!, quantity = 1),
                ),
            ),
        )
        val second = ticketingService.submitRequest(
            23L,
            TicketDto.TicketingRequestSubmitRequest(
                requestId = "req_itemized_replay_0001",
                eventId = event.id!!,
                items = listOf(
                    TicketDto.TicketingItemRequest(eventItemId = photoCard.id!!, quantity = 1),
                    TicketDto.TicketingItemRequest(eventItemId = keyring.id!!, quantity = 1),
                ),
            ),
        )

        assertThat(second).isEqualTo(first)
        assertThat(bookingOrderRepository.findAll()).hasSize(1)
    }

    @Test
    @DisplayName("ITEMIZED 같은 requestId에 다른 items를 보내면 거부한다")
    fun submitRequest_itemized_sameRequestIdDifferentItemsRejected() {
        val now = databaseTimeService.currentInstant()
        val event = eventRepository.save(activeEvent(saleOpenAt = now.minusSeconds(60), saleCloseAt = now.plusSeconds(3600), bookingMode = BookingMode.ITEMIZED))
        val photoCard = eventItemRepository.save(item(event.id!!, name = "Photo card", remainingQuantity = 5, maxPerUser = 3))

        ticketingService.submitRequest(
            24L,
            TicketDto.TicketingRequestSubmitRequest(
                requestId = "req_itemized_conflict_0001",
                eventId = event.id!!,
                items = listOf(TicketDto.TicketingItemRequest(eventItemId = photoCard.id!!, quantity = 1)),
            ),
        )

        assertThrows(IllegalArgumentException::class.java) {
            ticketingService.submitRequest(
                24L,
                TicketDto.TicketingRequestSubmitRequest(
                    requestId = "req_itemized_conflict_0001",
                    eventId = event.id!!,
                    items = listOf(TicketDto.TicketingItemRequest(eventItemId = photoCard.id!!, quantity = 2)),
                ),
            )
        }
    }

    @Test
    @DisplayName("ITEMIZED 이벤트에 items 없이 quantity만 보내면 INVALID_BOOKING_MODE로 거부한다")
    fun submitRequest_itemizedEventWithoutItemsRejected() {
        val now = databaseTimeService.currentInstant()
        val event = eventRepository.save(activeEvent(remainingQuantity = 99, saleOpenAt = now.minusSeconds(60), saleCloseAt = now.plusSeconds(3600), bookingMode = BookingMode.ITEMIZED))

        val response = ticketingService.submitRequest(
            25L,
            TicketDto.TicketingRequestSubmitRequest(
                requestId = "req_itemized_no_items_0001",
                eventId = event.id!!,
                quantity = 1,
            ),
        )

        assertThat(response.result).isEqualTo(TicketPurchaseResult.INVALID_BOOKING_MODE)
        assertThat(response.message).isEqualTo("Itemized event requires items")
        assertThat(ticketRepository.findByEventIdAndUserIdOrderByIdAsc(event.id!!, 25L)).isEmpty()
    }

    @Test
    @DisplayName("SIMPLE 이벤트에 items를 보내면 INVALID_BOOKING_MODE로 거부한다")
    fun submitRequest_simpleEventWithItemsRejected() {
        val now = databaseTimeService.currentInstant()
        val event = eventRepository.save(activeEvent(saleOpenAt = now.minusSeconds(60), saleCloseAt = now.plusSeconds(3600)))

        val response = ticketingService.submitRequest(
            26L,
            TicketDto.TicketingRequestSubmitRequest(
                requestId = "req_simple_with_items_0001",
                eventId = event.id!!,
                items = listOf(TicketDto.TicketingItemRequest(eventItemId = 1L, quantity = 1)),
            ),
        )

        assertThat(response.result).isEqualTo(TicketPurchaseResult.INVALID_BOOKING_MODE)
        assertThat(response.message).isEqualTo("Event is not itemized")
    }

    @Test
    @DisplayName("ITEMIZED 요청에 비활성 item이 포함되면 ITEM_INACTIVE로 거부한다")
    fun submitRequest_itemizedInactiveItemRejected() {
        val now = databaseTimeService.currentInstant()
        val event = eventRepository.save(activeEvent(saleOpenAt = now.minusSeconds(60), saleCloseAt = now.plusSeconds(3600), bookingMode = BookingMode.ITEMIZED))
        val inactiveItem = eventItemRepository.save(item(event.id!!, name = "Closed item", remainingQuantity = 5, active = false))

        val response = ticketingService.submitRequest(
            27L,
            TicketDto.TicketingRequestSubmitRequest(
                requestId = "req_itemized_inactive_0001",
                eventId = event.id!!,
                items = listOf(TicketDto.TicketingItemRequest(eventItemId = inactiveItem.id!!, quantity = 1)),
            ),
        )

        assertThat(response.result).isEqualTo(TicketPurchaseResult.ITEM_INACTIVE)
        assertThat(eventItemRepository.findById(inactiveItem.id!!).orElseThrow().remainingQuantity).isEqualTo(5)
    }

    private fun activeEvent(
        remainingQuantity: Int = 10,
        saleOpenAt: Instant = Instant.now().minusSeconds(60),
        saleCloseAt: Instant = Instant.now().plusSeconds(3600),
        allowDuplicate: Boolean = false,
        maxPerUser: Int = 2,
        nextTicketNumber: Int = 1,
        bookingMode: BookingMode = BookingMode.SIMPLE,
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
            bookingMode = bookingMode,
        )
    }

    private fun item(
        eventId: Long,
        name: String,
        remainingQuantity: Int,
        maxPerUser: Int = 10,
        sortOrder: Int = 0,
        active: Boolean = true,
    ): EventItem {
        return EventItem(
            eventId = eventId,
            name = name,
            totalQuantity = remainingQuantity,
            remainingQuantity = remainingQuantity,
            maxPerUser = maxPerUser,
            active = active,
            sortOrder = sortOrder,
        )
    }
}
