package com.perfo.backend.service

import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.databind.ObjectMapper
import com.perfo.backend.dto.TicketDto
import com.perfo.backend.entity.BookingMode
import com.perfo.backend.entity.TicketPurchaseResult
import com.perfo.backend.entity.TicketingRequest
import com.perfo.backend.repository.TicketingRequestRepository
import org.springframework.stereotype.Service

@Service
class TicketingRequestLedgerService(
    private val ticketingRequestRepository: TicketingRequestRepository,
    private val objectMapper: ObjectMapper,
) {
    fun findByRequestId(requestId: String): TicketingRequest? {
        return ticketingRequestRepository.findByRequestId(requestId)
    }

    fun createProcessing(
        requestId: String,
        eventId: Long,
        userId: Long,
        quantity: Int,
        bookingMode: BookingMode = BookingMode.SIMPLE,
        itemsSnapshot: String? = null,
    ): TicketingRequest {
        return ticketingRequestRepository.save(
            TicketingRequest(
                requestId = requestId,
                eventId = eventId,
                userId = userId,
                quantity = quantity,
                bookingMode = bookingMode,
                itemsSnapshot = itemsSnapshot,
                result = TicketPurchaseResult.PROCESSING,
            ),
        )
    }

    fun complete(
        request: TicketingRequest,
        result: TicketPurchaseResult,
        ticketIds: List<Long> = emptyList(),
        ticketNumbers: List<Int> = emptyList(),
        remainingQuantity: Int? = null,
        shortages: List<TicketDto.TicketingItemShortageResponse> = emptyList(),
        items: List<TicketDto.TicketingOrderItemResponse> = emptyList(),
        message: String? = null,
    ): TicketingRequest {
        request.result = result
        request.ticketIds = ticketIds.joinToString(",").ifBlank { null }
        request.ticketNumbers = ticketNumbers.joinToString(",").ifBlank { null }
        request.remainingQuantity = remainingQuantity
        request.shortagesSnapshot = shortages.takeIf { it.isNotEmpty() }?.let(objectMapper::writeValueAsString)
        request.itemsSnapshot = items.takeIf { it.isNotEmpty() }?.let(::writeItemsSnapshot) ?: request.itemsSnapshot
        request.message = message
        return ticketingRequestRepository.save(request)
    }

    fun toResponse(request: TicketingRequest): TicketDto.TicketingRequestSubmitResponse {
        return TicketDto.TicketingRequestSubmitResponse(
            requestId = request.requestId,
            eventId = request.eventId,
            quantity = request.quantity,
            result = request.result,
            ticketIds = request.ticketIds
                ?.split(",")
                ?.filter { it.isNotBlank() }
                ?.map { it.toLong() }
                ?: emptyList(),
            ticketNumbers = request.ticketNumbers
                ?.split(",")
                ?.filter { it.isNotBlank() }
                ?.map { it.toInt() }
                ?: emptyList(),
            remainingQuantity = request.remainingQuantity,
            message = request.message,
            bookingMode = request.bookingMode,
            items = readItems(request.itemsSnapshot),
            shortages = readShortages(request.shortagesSnapshot),
        )
    }

    fun writeItemsSnapshot(items: List<TicketDto.TicketingOrderItemResponse>): String {
        return objectMapper.writeValueAsString(items.sortedBy { it.eventItemId })
    }

    private fun readItems(snapshot: String?): List<TicketDto.TicketingOrderItemResponse> {
        if (snapshot.isNullOrBlank()) {
            return emptyList()
        }
        return objectMapper.readValue(
            snapshot,
            object : TypeReference<List<TicketDto.TicketingOrderItemResponse>>() {},
        )
    }

    private fun readShortages(snapshot: String?): List<TicketDto.TicketingItemShortageResponse> {
        if (snapshot.isNullOrBlank()) {
            return emptyList()
        }
        return objectMapper.readValue(
            snapshot,
            object : TypeReference<List<TicketDto.TicketingItemShortageResponse>>() {},
        )
    }
}
