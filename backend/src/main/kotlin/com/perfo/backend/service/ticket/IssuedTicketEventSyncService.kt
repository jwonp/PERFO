package com.perfo.backend.service.ticket

import com.perfo.backend.dto.TicketDto.IssuedTicketStatus
import com.perfo.backend.entity.Event
import com.perfo.backend.entity.IssuedTicket
import com.perfo.backend.repository.EventRepository
import com.perfo.backend.service.TicketingTime
import org.springframework.stereotype.Service
import java.time.Instant
import java.time.LocalDateTime
import java.time.OffsetDateTime
import java.time.ZoneOffset

@Service
class IssuedTicketEventSyncService(
    private val eventRepository: EventRepository,
) {

    fun syncLinkedEvent(ticket: IssuedTicket, now: OffsetDateTime = resolveCurrentTime()): Event {
        val event = ticket.eventId?.let { existingEventId ->
            eventRepository.findById(existingEventId).orElse(null)
        } ?: Event()

        val ticketId = requireNotNull(ticket.id) { "Ticket id is missing" }
        val effectiveStatus = IssuedTicketStatusPolicy.resolveEffectiveStatus(
            storedStatus = ticket.status,
            openAt = ticket.openAt,
            validDate = ticket.validDate,
            now = now,
        )
        val persistedTotalQuantity = event.totalQuantity
        val soldCount = (persistedTotalQuantity - event.remainingQuantity).coerceAtLeast(0)
        val nextRemainingQuantity = (ticket.totalCount - soldCount).coerceAtLeast(0)

        event.name = ticket.name
        event.venue = ticket.venue
        event.validFrom = resolveValidFrom(ticket, now)
        event.validUntil = resolveValidUntil(ticket)
        event.totalQuantity = ticket.totalCount
        event.remainingQuantity = nextRemainingQuantity
        event.saleOpenAt = resolveSaleOpenAt(ticket, now)
        event.saleCloseAt = resolveSaleCloseAt(ticket)
        event.maxPerUser = ticket.maxPerUser
        event.allowDuplicate = ticket.allowDuplicate
        event.active = effectiveStatus == IssuedTicketStatus.ISSUING || effectiveStatus == IssuedTicketStatus.VERIFYING
        event.discoveryMode = ticket.discoveryMode
        event.issuedTicketId = ticketId
        event.nextTicketNumber = event.nextTicketNumber.coerceAtLeast(1)

        val savedEvent = eventRepository.save(event)
        ticket.eventId = savedEvent.id
        return savedEvent
    }

    private fun resolveValidFrom(ticket: IssuedTicket, now: OffsetDateTime): LocalDateTime {
        return ticket.openAt?.withOffsetSameInstant(ZoneOffset.UTC)?.toLocalDateTime()
            ?: now.toLocalDateTime()
    }

    private fun resolveValidUntil(ticket: IssuedTicket): LocalDateTime {
        return ticket.validDate.plusDays(1).atStartOfDay().minusSeconds(1)
    }

    private fun resolveSaleOpenAt(ticket: IssuedTicket, now: OffsetDateTime): Instant {
        return ticket.openAt?.toInstant() ?: now.toInstant()
    }

    private fun resolveSaleCloseAt(ticket: IssuedTicket): Instant {
        return ticket.validDate.plusDays(1).atStartOfDay().toInstant(ZoneOffset.UTC)
    }

    private fun resolveCurrentTime(): OffsetDateTime {
        return TicketingTime.utcNow()
    }
}
