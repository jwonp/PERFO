package com.perfo.backend.service

import com.perfo.backend.dto.TicketDto
import com.perfo.backend.entity.TicketingOutboxEventType
import com.perfo.backend.repository.TicketingPurchaseProjectionRepository
import org.springframework.data.domain.PageRequest
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class TicketingProjectionQueryService(
    private val ticketingPurchaseProjectionRepository: TicketingPurchaseProjectionRepository,
) {
    companion object {
        private const val DEFAULT_LIMIT = 20
        private const val MAX_LIMIT = 100
    }

    @Transactional(readOnly = true)
    fun getEventProjectionSummary(
        eventId: Long,
        limit: Int?,
    ): TicketDto.TicketingProjectionSummaryResponse {
        require(eventId > 0) { "eventId must be positive" }

        val resolvedLimit = (limit ?: DEFAULT_LIMIT).coerceIn(1, MAX_LIMIT)
        val recentAttempts = ticketingPurchaseProjectionRepository.findByEventIdOrderByOccurredAtDescOutboxIdDesc(
            eventId,
            PageRequest.of(0, resolvedLimit),
        )

        return TicketDto.TicketingProjectionSummaryResponse(
            eventId = eventId,
            projectedCount = ticketingPurchaseProjectionRepository.countByEventId(eventId),
            successCount = ticketingPurchaseProjectionRepository.countByEventIdAndEventType(
                eventId,
                TicketingOutboxEventType.PURCHASE_SUCCEEDED,
            ),
            rejectedCount = ticketingPurchaseProjectionRepository.countByEventIdAndEventType(
                eventId,
                TicketingOutboxEventType.PURCHASE_REJECTED,
            ),
            lastOccurredAt = recentAttempts.firstOrNull()?.occurredAt?.toString(),
            lastProjectedAt = recentAttempts.firstOrNull()?.projectedAt?.toString(),
            recentAttempts = recentAttempts.map { projection ->
                TicketDto.TicketingProjectionAttemptResponse(
                    outboxId = projection.outboxId,
                    requestId = projection.requestId,
                    eventType = projection.eventType.name,
                    result = projection.result,
                    quantity = projection.quantity,
                    ticketIds = parseLongList(projection.ticketIds),
                    ticketNumbers = parseIntList(projection.ticketNumbers),
                    remainingQuantity = projection.remainingQuantity,
                    message = projection.message,
                    occurredAt = projection.occurredAt.toString(),
                    projectedAt = projection.projectedAt?.toString(),
                )
            },
        )
    }

    private fun parseLongList(value: String?): List<Long> {
        return value?.split(",")
            ?.mapNotNull { token -> token.trim().takeIf { it.isNotBlank() }?.toLongOrNull() }
            ?: emptyList()
    }

    private fun parseIntList(value: String?): List<Int> {
        return value?.split(",")
            ?.mapNotNull { token -> token.trim().takeIf { it.isNotBlank() }?.toIntOrNull() }
            ?: emptyList()
    }
}
