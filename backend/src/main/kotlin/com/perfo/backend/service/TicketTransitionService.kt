package com.perfo.backend.service

import com.perfo.backend.dto.TicketDto
import com.perfo.backend.entity.TicketUsageStatus
import com.perfo.backend.entity.TicketingStatus
import com.perfo.backend.repository.EventRepository
import com.perfo.backend.repository.TicketRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class TicketTransitionService(
    private val ticketRepository: TicketRepository,
    private val eventRepository: EventRepository,
    private val notificationBridgeService: NotificationBridgeService,
) {

    @Transactional
    fun transitionTicketingStatus(ticketId: Long, nextStatus: TicketingStatus): TicketDto.TicketStateResponse {
        val ticket = ticketRepository.findById(ticketId)
            .orElseThrow { IllegalArgumentException("Ticket not found") }
        val previousStatus = ticket.ticketingStatus

        if (previousStatus != nextStatus) {
            ticket.ticketingStatus = nextStatus
            ticketRepository.save(ticket)

            notificationBridgeService.notifyTicketTransition(
                TicketTransitionNotificationRequest(
                    userId = ticket.userId.toString(),
                    scope = "reserved",
                    ticketId = ticketId.toString(),
                    ticketName = resolveTicketName(ticket.eventId, ticket.ticketNumber),
                    targetUrl = "/reserved/$ticketId",
                    statusKey = "ticketingStatus",
                    previousStatus = previousStatus.name,
                    nextStatus = nextStatus.name,
                ),
            )
        }

        return TicketDto.TicketStateResponse(
            ticketId = ticketId,
            ticketingStatus = ticket.ticketingStatus,
            usageStatus = ticket.usageStatus,
        )
    }

    @Transactional
    fun transitionUsageStatus(ticketId: Long, nextStatus: TicketUsageStatus): TicketDto.TicketStateResponse {
        val ticket = ticketRepository.findById(ticketId)
            .orElseThrow { IllegalArgumentException("Ticket not found") }
        val previousStatus = ticket.usageStatus

        if (previousStatus != nextStatus) {
            ticket.usageStatus = nextStatus
            ticketRepository.save(ticket)

            notificationBridgeService.notifyTicketTransition(
                TicketTransitionNotificationRequest(
                    userId = ticket.userId.toString(),
                    scope = "reserved",
                    ticketId = ticketId.toString(),
                    ticketName = resolveTicketName(ticket.eventId, ticket.ticketNumber),
                    targetUrl = "/reserved/$ticketId",
                    statusKey = "usageStatus",
                    previousStatus = previousStatus.name,
                    nextStatus = nextStatus.name,
                ),
            )
        }

        return TicketDto.TicketStateResponse(
            ticketId = ticketId,
            ticketingStatus = ticket.ticketingStatus,
            usageStatus = ticket.usageStatus,
        )
    }

    private fun resolveTicketName(eventId: Long, ticketNumber: Int): String {
        return eventRepository.findById(eventId)
            .map { it.name }
            .orElse("Ticket #$ticketNumber")
    }
}
