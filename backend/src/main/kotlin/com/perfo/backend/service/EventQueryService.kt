package com.perfo.backend.service

import com.perfo.backend.dto.EventDto
import com.perfo.backend.dto.TicketDto
import com.perfo.backend.entity.Event
import com.perfo.backend.entity.IssuedTicket
import com.perfo.backend.entity.TicketDiscoveryMode
import com.perfo.backend.repository.EventRepository
import com.perfo.backend.repository.IssuedTicketRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.time.ZoneOffset

@Service
class EventQueryService(
    private val eventRepository: EventRepository,
    private val issuedTicketRepository: IssuedTicketRepository,
    private val ticketImageStorageService: TicketImageStorageService,
) {
    @Transactional(readOnly = true)
    fun listPublicEvents(): List<EventDto.EventResponse> {
        val now = Instant.now()
        val events = eventRepository.findByActiveTrueAndDiscoveryModeOrderBySaleOpenAtAscIdAsc(TicketDiscoveryMode.LISTED)
        val linkedTickets = issuedTicketRepository.findAllById(
            events.mapNotNull { it.issuedTicketId }.distinct(),
        ).associateBy { it.id }

        return events.map { event ->
            event.toResponse(now, event.issuedTicketId?.let(linkedTickets::get))
        }.filterNot { it.saleStatus == EventDto.SaleStatus.INACTIVE }
    }

    @Transactional(readOnly = true)
    fun getPublicEvent(eventId: Long): EventDto.EventResponse {
        val event = eventRepository.findById(eventId)
            .orElseThrow { IllegalArgumentException("Event not found") }
        val linkedTicket = event.issuedTicketId?.let { issuedTicketRepository.findById(it).orElse(null) }
        return event.toResponse(Instant.now(), linkedTicket)
    }

    private fun Event.toResponse(now: Instant, linkedTicket: IssuedTicket?): EventDto.EventResponse {
        val eventId = requireNotNull(id) { "Event id is missing" }
        val linkedTicketId = linkedTicket?.id
        return EventDto.EventResponse(
            id = eventId,
            issuedTicketId = linkedTicketId,
            name = linkedTicket?.name ?: name,
            venue = linkedTicket?.venue ?: venue,
            googlePlaceId = linkedTicket?.googlePlaceId?.ifBlank { null },
            detailAddress = linkedTicket?.detailAddress,
            validFrom = validFrom.atOffset(ZoneOffset.UTC).toString(),
            validUntil = validUntil.atOffset(ZoneOffset.UTC).toString(),
            validDate = linkedTicket?.validDate?.toString() ?: validUntil.toLocalDate().toString(),
            saleOpenAt = saleOpenAt.toString(),
            saleCloseAt = saleCloseAt.toString(),
            imageUrl = linkedTicketId?.takeIf { linkedTicket?.imageKey != null }?.let(ticketImageStorageService::buildTicketImageUrl),
            remainingQuantity = remainingQuantity,
            totalQuantity = totalQuantity,
            maxPerUser = maxPerUser,
            allowDuplicate = allowDuplicate,
            active = active,
            saleStatus = resolveSaleStatus(this, now, linkedTicket),
            discoveryMode = discoveryMode,
            publicBookingPath = "/events/$eventId",
        )
    }

    private fun resolveSaleStatus(event: Event, now: Instant): EventDto.SaleStatus {
        return resolveSaleStatus(event, now, null)
    }

    private fun resolveSaleStatus(event: Event, now: Instant, linkedTicket: IssuedTicket?): EventDto.SaleStatus {
        val linkedStatus = linkedTicket?.let { resolveLinkedTicketStatus(it, now) }
        if (linkedStatus == TicketDto.IssuedTicketStatus.INACTIVE) {
            return EventDto.SaleStatus.INACTIVE
        }
        if (linkedStatus == TicketDto.IssuedTicketStatus.EXPIRED) {
            return EventDto.SaleStatus.CLOSED
        }
        if (!event.active) {
            return EventDto.SaleStatus.INACTIVE
        }
        if (now.isBefore(event.saleOpenAt)) {
            return EventDto.SaleStatus.UPCOMING
        }
        if (!now.isBefore(event.saleCloseAt)) {
            return EventDto.SaleStatus.CLOSED
        }
        if (event.remainingQuantity <= 0) {
            return EventDto.SaleStatus.SOLD_OUT
        }
        return EventDto.SaleStatus.OPEN
    }

    private fun resolveLinkedTicketStatus(ticket: IssuedTicket, now: Instant): TicketDto.IssuedTicketStatus {
        val today = now.atOffset(ZoneOffset.UTC).toLocalDate()
        if (ticket.status == TicketDto.IssuedTicketStatus.EXPIRED || ticket.validDate.isBefore(today)) {
            return TicketDto.IssuedTicketStatus.EXPIRED
        }
        return ticket.status
    }
}
