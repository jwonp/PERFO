package com.perfo.backend.service

import com.perfo.backend.entity.TicketPurchaseResult
import com.perfo.backend.entity.TicketingOutboxEventType
import com.perfo.backend.entity.TicketingPurchaseProjection
import com.perfo.backend.repository.TicketingPurchaseProjectionRepository
import org.assertj.core.api.Assertions.assertThat
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
class TicketingProjectionQueryServiceTest {

    @Autowired
    private lateinit var ticketingProjectionQueryService: TicketingProjectionQueryService

    @Autowired
    private lateinit var ticketingPurchaseProjectionRepository: TicketingPurchaseProjectionRepository

    @BeforeEach
    fun setUp() {
        ticketingPurchaseProjectionRepository.deleteAll()
    }

    @Test
    @DisplayName("event projection summary는 최근 시도와 성공/실패 집계를 반환한다")
    fun getEventProjectionSummary_returnsAggregatedProjection() {
        ticketingPurchaseProjectionRepository.saveAll(
            listOf(
                projection(
                    outboxId = 2001L,
                    eventType = TicketingOutboxEventType.PURCHASE_SUCCEEDED,
                    result = TicketPurchaseResult.SUCCESS,
                    occurredAt = Instant.parse("2026-05-08T13:00:01Z"),
                    projectedAt = LocalDateTime.parse("2026-05-08T22:00:03"),
                    ticketIds = "101,102",
                    ticketNumbers = "1,2",
                    remainingQuantity = 8,
                ),
                projection(
                    outboxId = 2002L,
                    requestId = "projection_summary_0002",
                    eventType = TicketingOutboxEventType.PURCHASE_REJECTED,
                    result = TicketPurchaseResult.SOLD_OUT,
                    occurredAt = Instant.parse("2026-05-08T13:00:02Z"),
                    projectedAt = LocalDateTime.parse("2026-05-08T22:00:04"),
                    message = "Insufficient inventory",
                ),
            ),
        )

        val summary = ticketingProjectionQueryService.getEventProjectionSummary(11L, 10)

        assertThat(summary.eventId).isEqualTo(11L)
        assertThat(summary.projectedCount).isEqualTo(2)
        assertThat(summary.successCount).isEqualTo(1)
        assertThat(summary.rejectedCount).isEqualTo(1)
        assertThat(summary.lastOccurredAt).isEqualTo("2026-05-08T13:00:02Z")
        assertThat(summary.lastProjectedAt).isEqualTo(summary.recentAttempts.first().projectedAt)
        assertThat(summary.recentAttempts).hasSize(2)
        assertThat(summary.recentAttempts.first().outboxId).isEqualTo(2002L)
        assertThat(summary.recentAttempts.last().ticketIds).containsExactly(101L, 102L)
        assertThat(summary.recentAttempts.last().ticketNumbers).containsExactly(1, 2)
    }

    private fun projection(
        outboxId: Long,
        requestId: String = "projection_summary_0001",
        eventType: TicketingOutboxEventType,
        result: TicketPurchaseResult,
        occurredAt: Instant,
        projectedAt: LocalDateTime,
        ticketIds: String? = null,
        ticketNumbers: String? = null,
        remainingQuantity: Int? = null,
        message: String? = null,
    ): TicketingPurchaseProjection {
        return TicketingPurchaseProjection(
            outboxId = outboxId,
            requestId = requestId,
            eventId = 11L,
            userId = 42L,
            eventType = eventType,
            result = result,
            quantity = 2,
            ticketIds = ticketIds,
            ticketNumbers = ticketNumbers,
            remainingQuantity = remainingQuantity,
            message = message,
            occurredAt = occurredAt,
            projectedAt = projectedAt,
        )
    }
}
