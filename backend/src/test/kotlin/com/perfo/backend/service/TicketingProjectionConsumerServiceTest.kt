package com.perfo.backend.service

import com.fasterxml.jackson.databind.ObjectMapper
import com.perfo.backend.entity.TicketPurchaseResult
import com.perfo.backend.entity.TicketingOutboxEventType
import com.perfo.backend.repository.TicketingPurchaseProjectionRepository
import io.micrometer.core.instrument.MeterRegistry
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.ActiveProfiles
import java.time.Instant

@SpringBootTest
@ActiveProfiles("test")
class TicketingProjectionConsumerServiceTest {

    @Autowired
    private lateinit var ticketingProjectionConsumerService: TicketingProjectionConsumerService

    @Autowired
    private lateinit var ticketingPurchaseProjectionRepository: TicketingPurchaseProjectionRepository

    @Autowired
    private lateinit var objectMapper: ObjectMapper

    @Autowired
    private lateinit var meterRegistry: MeterRegistry

    @BeforeEach
    fun setUp() {
        ticketingPurchaseProjectionRepository.deleteAll()
    }

    @Test
    @DisplayName("PURCHASE_SUCCEEDED 소비 시 projection이 저장된다")
    fun consumeMessage_savesSucceededProjection() {
        val successBefore = counter(
            "perfo.ticketing.projection.consume.success",
            "eventType",
            "PURCHASE_SUCCEEDED",
            "result",
            "SUCCESS",
        )
        val consumed = ticketingProjectionConsumerService.consumeMessage(
            message(
                outboxId = 1001L,
                requestId = "projection_success_0001",
                eventType = TicketingOutboxEventType.PURCHASE_SUCCEEDED,
                payload = payload(
                    requestId = "projection_success_0001",
                    result = TicketPurchaseResult.SUCCESS,
                    ticketIds = listOf(11L, 12L),
                    ticketNumbers = listOf(1, 2),
                    remainingQuantity = 8,
                ),
            ),
        )

        val projection = ticketingPurchaseProjectionRepository.findByOutboxId(1001L)
        assertThat(consumed).isTrue()
        assertThat(projection).isNotNull
        assertThat(projection?.eventType).isEqualTo(TicketingOutboxEventType.PURCHASE_SUCCEEDED)
        assertThat(projection?.result).isEqualTo(TicketPurchaseResult.SUCCESS)
        assertThat(projection?.ticketNumbers).isEqualTo("1,2")
        assertThat(counter(
            "perfo.ticketing.projection.consume.success",
            "eventType",
            "PURCHASE_SUCCEEDED",
            "result",
            "SUCCESS",
        )).isEqualTo(successBefore + 1.0)
        assertThat(gaugeValue("perfo.ticketing.projection.last_lag.seconds")).isGreaterThanOrEqualTo(0.0)
    }

    @Test
    @DisplayName("PURCHASE_REJECTED 소비 시 projection이 저장된다")
    fun consumeMessage_savesRejectedProjection() {
        val consumed = ticketingProjectionConsumerService.consumeMessage(
            message(
                outboxId = 1002L,
                requestId = "projection_rejected_0001",
                eventType = TicketingOutboxEventType.PURCHASE_REJECTED,
                payload = payload(
                    requestId = "projection_rejected_0001",
                    result = TicketPurchaseResult.NOT_OPEN,
                    remainingQuantity = 10,
                    message = "Ticket sales are not open yet",
                ),
            ),
        )

        val projection = ticketingPurchaseProjectionRepository.findByOutboxId(1002L)
        assertThat(consumed).isTrue()
        assertThat(projection).isNotNull
        assertThat(projection?.eventType).isEqualTo(TicketingOutboxEventType.PURCHASE_REJECTED)
        assertThat(projection?.result).isEqualTo(TicketPurchaseResult.NOT_OPEN)
        assertThat(projection?.remainingQuantity).isEqualTo(10)
    }

    @Test
    @DisplayName("동일 이벤트 재소비 시 projection은 중복 반영되지 않는다")
    fun consumeMessage_isIdempotent() {
        val message = message(
            outboxId = 1003L,
            requestId = "projection_duplicate_0001",
            eventType = TicketingOutboxEventType.PURCHASE_SUCCEEDED,
            payload = payload(
                requestId = "projection_duplicate_0001",
                result = TicketPurchaseResult.SUCCESS,
            ),
        )
        val duplicateBefore = counter(
            "perfo.ticketing.projection.consume.duplicate_skip",
            "eventType",
            "PURCHASE_SUCCEEDED",
        )

        val first = ticketingProjectionConsumerService.consumeMessage(message)
        val second = ticketingProjectionConsumerService.consumeMessage(message)

        assertThat(first).isTrue()
        assertThat(second).isFalse()
        assertThat(ticketingPurchaseProjectionRepository.count()).isEqualTo(1)
        assertThat(counter(
            "perfo.ticketing.projection.consume.duplicate_skip",
            "eventType",
            "PURCHASE_SUCCEEDED",
        )).isEqualTo(duplicateBefore + 1.0)
    }

    @Test
    @DisplayName("잘못된 메시지는 projection을 저장하지 않고 예외를 던진다")
    fun consumeMessage_invalidPayload_throws() {
        val failureBefore = counter(
            "perfo.ticketing.projection.consume.failure",
            "reason",
            "invalid_message",
            "eventType",
            "UNKNOWN",
        )
        assertThrows<Exception> {
            ticketingProjectionConsumerService.consumeMessage("{invalid-json}")
        }

        assertThat(ticketingPurchaseProjectionRepository.count()).isZero()
        assertThat(counter(
            "perfo.ticketing.projection.consume.failure",
            "reason",
            "invalid_message",
            "eventType",
            "UNKNOWN",
        )).isEqualTo(failureBefore + 1.0)
    }

    @Test
    @DisplayName("eventType과 result가 맞지 않는 메시지는 projection을 저장하지 않는다")
    fun consumeMessage_invalidContract_throws() {
        val failureBefore = counter(
            "perfo.ticketing.projection.consume.failure",
            "reason",
            "invalid_contract",
            "eventType",
            "PURCHASE_SUCCEEDED",
        )

        assertThrows<IllegalArgumentException> {
            ticketingProjectionConsumerService.consumeMessage(
                message(
                    outboxId = 1004L,
                    requestId = "projection_invalid_contract_0001",
                    eventType = TicketingOutboxEventType.PURCHASE_SUCCEEDED,
                    payload = payload(
                        requestId = "projection_invalid_contract_0001",
                        result = TicketPurchaseResult.SOLD_OUT,
                    ),
                ),
            )
        }

        assertThat(ticketingPurchaseProjectionRepository.count()).isZero()
        assertThat(counter(
            "perfo.ticketing.projection.consume.failure",
            "reason",
            "invalid_contract",
            "eventType",
            "PURCHASE_SUCCEEDED",
        )).isEqualTo(failureBefore + 1.0)
    }

    private fun message(
        outboxId: Long,
        requestId: String,
        eventType: TicketingOutboxEventType,
        payload: TicketingOutboxPayload,
    ): String {
        return objectMapper.writeValueAsString(
            TicketingOutboxMessage(
                outboxId = outboxId,
                requestId = requestId,
                eventType = eventType,
                payload = payload,
            ),
        )
    }

    private fun payload(
        requestId: String,
        result: TicketPurchaseResult,
        ticketIds: List<Long> = emptyList(),
        ticketNumbers: List<Int> = emptyList(),
        remainingQuantity: Int? = null,
        message: String? = null,
    ): TicketingOutboxPayload {
        return TicketingOutboxPayload(
            requestId = requestId,
            eventId = 11L,
            userId = 42L,
            quantity = 2,
            result = result,
            ticketIds = ticketIds,
            ticketNumbers = ticketNumbers,
            remainingQuantity = remainingQuantity,
            message = message,
            occurredAt = Instant.parse("2026-05-08T13:00:00Z"),
        )
    }

    private fun counter(name: String, vararg tags: String): Double {
        return meterRegistry.find(name).tags(*tags).counter()?.count() ?: 0.0
    }

    private fun gaugeValue(name: String): Double {
        return meterRegistry.find(name).gauge()?.value() ?: 0.0
    }
}
