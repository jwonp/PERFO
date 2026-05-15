package com.perfo.backend.service

import com.perfo.backend.dto.TicketDto
import com.perfo.backend.entity.TicketPurchaseResult
import com.perfo.backend.entity.TicketingRequest
import com.perfo.backend.repository.TicketingRequestRepository
import org.springframework.stereotype.Service

@Service
class TicketingRequestLedgerService(
    private val ticketingRequestRepository: TicketingRequestRepository,
) {
    fun findByRequestId(requestId: String): TicketingRequest? {
        return ticketingRequestRepository.findByRequestId(requestId)
    }

    fun createProcessing(
        requestId: String,
        eventId: Long,
        userId: Long,
        quantity: Int,
    ): TicketingRequest {
        return ticketingRequestRepository.save(
            TicketingRequest(
                requestId = requestId,
                eventId = eventId,
                userId = userId,
                quantity = quantity,
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
        message: String? = null,
    ): TicketingRequest {
        request.result = result
        request.ticketIds = ticketIds.joinToString(",").ifBlank { null }
        request.ticketNumbers = ticketNumbers.joinToString(",").ifBlank { null }
        request.remainingQuantity = remainingQuantity
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
        )
    }
}
