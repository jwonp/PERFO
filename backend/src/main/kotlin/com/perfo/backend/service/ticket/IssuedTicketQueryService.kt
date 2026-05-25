package com.perfo.backend.service.ticket

import com.perfo.backend.dto.TicketDto
import com.perfo.backend.dto.TicketDto.IssuedTicketStatus
import com.perfo.backend.entity.Event
import com.perfo.backend.entity.IssuedTicket
import com.perfo.backend.repository.EventRepository
import com.perfo.backend.repository.IssuedTicketRepository
import com.perfo.backend.service.TicketingTime
import org.springframework.security.access.AccessDeniedException
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import com.perfo.backend.service.TicketImageStorageService
import java.time.OffsetDateTime

@Service
class IssuedTicketQueryService(
    private val issuedTicketRepository: IssuedTicketRepository,
    private val eventRepository: EventRepository,
    private val ticketImageStorageService: TicketImageStorageService,
) {

    @Transactional(readOnly = true)
    fun findAllByOwnerUserId(
        ownerUserId: String,
        authenticatedOwnerUserId: String,
    ): List<TicketDto.TicketResponse> {
        validateOwner(ownerUserId, authenticatedOwnerUserId)
        val now = resolveCurrentTime()
        val tickets = issuedTicketRepository.findByOwnerUserIdOrderByIdDesc(ownerUserId)
        val eventsById = eventRepository.findAllById(tickets.mapNotNull { it.eventId }.distinct())
            .associateBy { requireNotNull(it.id) }

        return tickets.map { ticket ->
            toResponse(
                ticket = ticket,
                now = now,
                linkedEvent = ticket.eventId?.let(eventsById::get),
            )
        }
    }

    @Transactional(readOnly = true)
    fun findOwnedTicket(ticketId: Long, authenticatedOwnerUserId: String): IssuedTicket {
        val normalizedOwnerUserId = authenticatedOwnerUserId.trim()
        require(normalizedOwnerUserId.isNotBlank()) { "Owner user id is required" }

        val ticket = findTicket(ticketId)
        if (ticket.ownerUserId != normalizedOwnerUserId) {
            throw AccessDeniedException("Ticket owner mismatch")
        }

        return ticket
    }

    @Transactional(readOnly = true)
    fun findTicket(ticketId: Long): IssuedTicket {
        return issuedTicketRepository.findById(ticketId)
            .orElseThrow { IllegalArgumentException("Ticket not found") }
    }

    fun toResponse(
        ticket: IssuedTicket,
        now: OffsetDateTime = resolveCurrentTime(),
        linkedEvent: Event? = null,
    ): TicketDto.TicketResponse {
        val ticketId = requireNotNull(ticket.id) { "Ticket id is missing" }
        return TicketDto.TicketResponse(
            id = ticketId,
            name = ticket.name,
            venue = ticket.venue,
            googlePlaceId = ticket.googlePlaceId,
            detailAddress = ticket.detailAddress,
            validDate = ticket.validDate.toString(),
            openAt = ticket.openAt?.toString(),
            imageKey = ticket.imageKey,
            imageUrl = buildTicketImageUrl(ticketId, ticket.imageKey),
            totalCount = ticket.totalCount,
            allowDuplicate = ticket.allowDuplicate,
            maxPerUser = ticket.maxPerUser,
            discoveryMode = ticket.discoveryMode,
            status = IssuedTicketStatusPolicy.resolveEffectiveStatus(
                storedStatus = ticket.status,
                openAt = ticket.openAt,
                validDate = ticket.validDate,
                now = now,
            ),
            issuedCount = resolveIssuedCount(ticket, linkedEvent),
            ownerUserId = ticket.ownerUserId,
            eventId = ticket.eventId,
            publicBookingPath = ticket.eventId?.let { "/events/$it" },
            publicBookingUrl = null,
        )
    }

    fun validateOwner(requestOwnerUserId: String?, authenticatedOwnerUserId: String) {
        val normalizedAuthenticatedOwnerUserId = authenticatedOwnerUserId.trim()
        require(normalizedAuthenticatedOwnerUserId.isNotBlank()) { "Owner user id is required" }
        if (requestOwnerUserId != null && requestOwnerUserId != normalizedAuthenticatedOwnerUserId) {
            throw AccessDeniedException("Ticket owner mismatch")
        }
    }

    private fun buildTicketImageUrl(ticketId: Long, imageKey: String?): String? {
        return imageKey?.let { ticketImageStorageService.buildPublicTicketImageUrl(ticketId) }
    }

    private fun resolveIssuedCount(ticket: IssuedTicket, linkedEvent: Event? = null): Int {
        val resolvedEvent = linkedEvent ?: ticket.eventId?.let { eventRepository.findById(it).orElse(null) }
        if (resolvedEvent != null) {
            return (resolvedEvent.totalQuantity - resolvedEvent.remainingQuantity).coerceIn(0, ticket.totalCount)
        }

        return ticket.issuedCount.coerceIn(0, ticket.totalCount)
    }

    private fun resolveCurrentTime(): OffsetDateTime {
        return TicketingTime.utcNow()
    }
}
