package com.perfo.backend.service

import com.fasterxml.jackson.databind.ObjectMapper
import com.perfo.backend.dto.TicketDto
import com.perfo.backend.entity.BookingMode
import com.perfo.backend.entity.TicketPurchaseResult
import com.perfo.backend.entity.TicketingOutbox
import com.perfo.backend.entity.TicketingOutboxEventType
import com.perfo.backend.entity.TicketingOutboxStatus
import com.perfo.backend.repository.TicketingOutboxRepository
import org.springframework.stereotype.Service
import java.time.Instant

@Service
class TicketingOutboxService(
    private val ticketingOutboxRepository: TicketingOutboxRepository,
    private val objectMapper: ObjectMapper,
) {
    fun savePurchaseSucceeded(
        requestId: String,
        eventId: Long,
        userId: Long,
        quantity: Int,
        ticketIds: List<Long>,
        ticketNumbers: List<Int>,
        remainingQuantity: Int?,
        message: String?,
        occurredAt: Instant,
        bookingMode: BookingMode = BookingMode.SIMPLE,
        items: List<TicketDto.TicketingOrderItemResponse> = emptyList(),
    ): TicketingOutbox {
        return save(
            requestId = requestId,
            eventId = eventId,
            userId = userId,
            eventType = TicketingOutboxEventType.PURCHASE_SUCCEEDED,
            payload = TicketingOutboxPayload(
                requestId = requestId,
                eventId = eventId,
                userId = userId,
                quantity = quantity,
                result = TicketPurchaseResult.SUCCESS,
                ticketIds = ticketIds,
                ticketNumbers = ticketNumbers,
                remainingQuantity = remainingQuantity,
                message = message,
                occurredAt = occurredAt,
                bookingMode = bookingMode,
                items = items,
            ),
        )
    }

    fun savePurchaseRejected(
        requestId: String,
        eventId: Long,
        userId: Long,
        quantity: Int,
        result: TicketPurchaseResult,
        remainingQuantity: Int?,
        message: String?,
        occurredAt: Instant,
        bookingMode: BookingMode = BookingMode.SIMPLE,
        items: List<TicketDto.TicketingOrderItemResponse> = emptyList(),
        shortages: List<TicketDto.TicketingItemShortageResponse> = emptyList(),
    ): TicketingOutbox {
        return save(
            requestId = requestId,
            eventId = eventId,
            userId = userId,
            eventType = TicketingOutboxEventType.PURCHASE_REJECTED,
            payload = TicketingOutboxPayload(
                requestId = requestId,
                eventId = eventId,
                userId = userId,
                quantity = quantity,
                result = result,
                remainingQuantity = remainingQuantity,
                message = message,
                occurredAt = occurredAt,
                bookingMode = bookingMode,
                items = items,
                shortages = shortages,
            ),
        )
    }

    private fun save(
        requestId: String,
        eventId: Long,
        userId: Long,
        eventType: TicketingOutboxEventType,
        payload: TicketingOutboxPayload,
    ): TicketingOutbox {
        return ticketingOutboxRepository.save(
            TicketingOutbox(
                requestId = requestId,
                eventId = eventId,
                userId = userId,
                aggregateId = requestId,
                eventType = eventType,
                status = TicketingOutboxStatus.PENDING,
                payload = objectMapper.writeValueAsString(payload),
            ),
        )
    }
}

data class TicketingOutboxPayload(
    val requestId: String,
    val eventId: Long,
    val userId: Long,
    val quantity: Int,
    val result: TicketPurchaseResult,
    val ticketIds: List<Long> = emptyList(),
    val ticketNumbers: List<Int> = emptyList(),
    val remainingQuantity: Int? = null,
    val message: String? = null,
    val occurredAt: Instant,
    val bookingMode: BookingMode = BookingMode.SIMPLE,
    val items: List<TicketDto.TicketingOrderItemResponse> = emptyList(),
    val shortages: List<TicketDto.TicketingItemShortageResponse> = emptyList(),
)
