package com.perfo.backend.service

import com.perfo.backend.dto.TicketDto
import com.perfo.backend.dto.TicketDto.IssuedTicketStatus
import org.springframework.stereotype.Service
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicLong

@Service
class TicketService(
    private val notificationBridgeService: NotificationBridgeService,
) {
    private val idGenerator = AtomicLong(0)
    private val tickets = ConcurrentHashMap<Long, TicketDto.TicketResponse>()
    private val placeIdPattern = Regex("^[A-Za-z0-9_-]{3,256}$")

    fun create(request: TicketDto.CreateTicketRequest): TicketDto.TicketResponse {
        if (!placeIdPattern.matches(request.googlePlaceId)) {
            throw IllegalArgumentException("Invalid googlePlaceId")
        }

        val id = idGenerator.incrementAndGet()
        val created = TicketDto.TicketResponse(
            id = id,
            name = request.name,
            venue = request.venue,
            googlePlaceId = request.googlePlaceId,
            detailAddress = request.detailAddress,
            validDate = request.validDate,
            totalCount = request.totalCount,
            allowDuplicate = request.allowDuplicate,
            maxPerUser = request.maxPerUser,
            status = IssuedTicketStatus.INACTIVE,
            issuedCount = 0,
            ownerUserId = request.ownerUserId ?: "unknown",
        )

        tickets[id] = created
        return created
    }

    fun findAllByOwnerUserId(ownerUserId: String): List<TicketDto.TicketResponse> {
        return tickets.values
            .filter { it.ownerUserId == ownerUserId }
            .sortedByDescending { it.id }
    }

    fun updateIssuedStatus(ticketId: Long, nextStatus: IssuedTicketStatus): TicketDto.TicketResponse {
        val current = tickets[ticketId] ?: throw IllegalArgumentException("Ticket not found")
        if (current.status == nextStatus) {
            return current
        }

        val updated = current.copy(status = nextStatus)
        tickets[ticketId] = updated

        notificationBridgeService.notifyTicketTransition(
            TicketTransitionNotificationRequest(
                userId = updated.ownerUserId,
                scope = "issued",
                ticketId = updated.id.toString(),
                ticketName = updated.name,
                targetUrl = "/my-tickets/${updated.id}/scan",
                statusKey = "issueStatus",
                previousStatus = current.status.name,
                nextStatus = nextStatus.name,
            ),
        )

        return updated
    }
}
