package com.perfo.backend.service.ticket

import com.perfo.backend.dto.TicketDto.IssuedTicketStatus
import com.perfo.backend.entity.IssuedTicket
import com.perfo.backend.service.NotificationBridgeService
import com.perfo.backend.service.TicketTransitionNotificationRequest
import org.springframework.stereotype.Service

@Service
class IssuedTicketNotificationService(
    private val notificationBridgeService: NotificationBridgeService,
) {

    fun notifyIssuedStatusTransition(
        ticket: IssuedTicket,
        previousStatus: IssuedTicketStatus,
        nextStatus: IssuedTicketStatus,
    ) {
        if (previousStatus == nextStatus) {
            return
        }

        notificationBridgeService.notifyTicketTransition(
            TicketTransitionNotificationRequest(
                userId = ticket.ownerUserId,
                scope = "issued",
                ticketId = requireNotNull(ticket.id).toString(),
                ticketName = ticket.name,
                targetUrl = "/my-tickets/${ticket.id}/scan",
                statusKey = "issueStatus",
                previousStatus = previousStatus.name,
                nextStatus = nextStatus.name,
            ),
        )
    }
}
