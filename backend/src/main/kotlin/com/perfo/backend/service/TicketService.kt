package com.perfo.backend.service

import com.perfo.backend.dto.TicketDto
import com.perfo.backend.entity.Ticket
import com.perfo.backend.entity.TicketUsageStatus
import com.perfo.backend.entity.TicketingStatus
import com.perfo.backend.repository.EventRepository
import com.perfo.backend.repository.TicketRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class TicketService(
    private val eventRepository: EventRepository,
    private val ticketRepository: TicketRepository
) {

    @Transactional
    fun requestTicket(request: TicketDto.TicketRequest): TicketDto.TicketResponse {
        val existingTicket = ticketRepository.findByIdempotencyKey(request.idempotencyKey)
        if (existingTicket != null) {
            return TicketDto.TicketResponse.from(existingTicket, remainingQuantity = 0)
        }

        val event = eventRepository.findById(request.eventId)
            .orElseThrow { IllegalArgumentException("Event not found") }

        if (!event.active || event.remainingQuantity <= 0) {
            return TicketDto.TicketResponse(
                id = null,
                eventId = request.eventId,
                userId = request.userId,
                ticketNumber = null,
                ticketingStatus = TicketingStatus.SOLD_OUT,
                usageStatus = null,
                remainingQuantity = event.remainingQuantity
            )
        }

        val alreadyIssuedCount = ticketRepository.countByEventIdAndUserId(request.eventId, request.userId)
        if (alreadyIssuedCount >= event.maxPerUser) {
            return TicketDto.TicketResponse(
                id = null,
                eventId = request.eventId,
                userId = request.userId,
                ticketNumber = null,
                ticketingStatus = TicketingStatus.DUPLICATE,
                usageStatus = null,
                remainingQuantity = event.remainingQuantity
            )
        }

        val nextRemainingQuantity = event.remainingQuantity - 1
        val ticketNumber = event.totalQuantity - nextRemainingQuantity
        eventRepository.save(event.copyWithRemainingQuantity(nextRemainingQuantity))
        val savedTicket = ticketRepository.save(
            Ticket(
                eventId = request.eventId,
                userId = request.userId,
                ticketNumber = ticketNumber,
                ticketingStatus = TicketingStatus.SUCCESS,
                usageStatus = TicketUsageStatus.BEFORE_SERVING,
                idempotencyKey = request.idempotencyKey
            )
        )

        return TicketDto.TicketResponse.from(savedTicket, nextRemainingQuantity)
    }
}
