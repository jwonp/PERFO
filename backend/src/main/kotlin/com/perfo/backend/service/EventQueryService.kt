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
import java.time.LocalDate
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
        val listedTickets = issuedTicketRepository.findByDiscoveryMode(TicketDiscoveryMode.LISTED)
        val linkedEventsByTicketId = buildLinkedEventsByTicketId(listedTickets)

        return listedTickets.asSequence()
            .mapNotNull { ticket ->
                val effectiveStatus = resolveLinkedTicketStatus(ticket, now)
                if (effectiveStatus != TicketDto.IssuedTicketStatus.ISSUING &&
                    effectiveStatus != TicketDto.IssuedTicketStatus.VERIFYING
                ) {
                    return@mapNotNull null
                }

                toPublicResponse(ticket, linkedEventsByTicketId[ticket.id], now)
            }
            .sortedWith(
                compareBy<EventDto.EventResponse> { Instant.parse(it.saleOpenAt) }
                    .thenBy { it.id },
            )
            .toList()
    }

    @Transactional(readOnly = true)
    fun getPublicEvent(eventId: Long): EventDto.EventResponse {
        val event = eventRepository.findById(eventId)
            .orElseThrow { IllegalArgumentException("Event not found") }
        val linkedTicket = event.issuedTicketId?.let { issuedTicketRepository.findById(it).orElse(null) }
        return event.toResponse(Instant.now(), linkedTicket)
    }

    private fun buildLinkedEventsByTicketId(tickets: List<IssuedTicket>): Map<Long, Event> {
        if (tickets.isEmpty()) {
            return emptyMap()
        }

        val eventsByEventId = eventRepository.findAllById(tickets.mapNotNull { it.eventId }.distinct())
            .associateBy { requireNotNull(it.id) }
        val eventsByIssuedTicketId = eventRepository.findByIssuedTicketIdIn(tickets.mapNotNull { it.id }.distinct())
            .associateBy { requireNotNull(it.issuedTicketId) }

        return tickets.mapNotNull { ticket ->
            val ticketId = ticket.id ?: return@mapNotNull null
            val linkedEvent = ticket.eventId?.let(eventsByEventId::get) ?: eventsByIssuedTicketId[ticketId]
            linkedEvent?.let { ticketId to it }
        }.toMap()
    }

    private fun toPublicResponse(
        ticket: IssuedTicket,
        linkedEvent: Event?,
        now: Instant,
    ): EventDto.EventResponse {
        val ticketId = requireNotNull(ticket.id) { "Ticket id is missing" }
        val responseId = linkedEvent?.id ?: ticket.eventId ?: ticketId
        val saleStatus = resolveSaleStatus(linkedEvent, now, ticket)

        return EventDto.EventResponse(
            id = responseId,
            issuedTicketId = ticketId,
            name = ticket.name,
            venue = ticket.venue,
            googlePlaceId = ticket.googlePlaceId.ifBlank { null },
            detailAddress = ticket.detailAddress,
            validFrom = resolveResponseValidFrom(ticket, linkedEvent, now),
            validUntil = resolveResponseValidUntil(ticket),
            validDate = ticket.validDate.toString(),
            saleOpenAt = resolveResponseSaleOpenAt(ticket, linkedEvent, now).toString(),
            saleCloseAt = resolveResponseSaleCloseAt(ticket).toString(),
            imageUrl = ticket.imageKey?.let { ticketImageStorageService.buildPublicTicketImageUrl(ticketId) },
            remainingQuantity = linkedEvent?.remainingQuantity ?: (ticket.totalCount - ticket.issuedCount).coerceAtLeast(0),
            totalQuantity = linkedEvent?.totalQuantity ?: ticket.totalCount,
            maxPerUser = ticket.maxPerUser,
            allowDuplicate = ticket.allowDuplicate,
            active = saleStatus != EventDto.SaleStatus.INACTIVE,
            saleStatus = saleStatus,
            discoveryMode = ticket.discoveryMode,
            publicBookingPath = "/events/$responseId",
        )
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
            validFrom = linkedTicket?.let { resolveResponseValidFrom(it, this, now) } ?: validFrom.atOffset(ZoneOffset.UTC).toString(),
            validUntil = linkedTicket?.let { resolveResponseValidUntil(it) } ?: validUntil.atOffset(ZoneOffset.UTC).toString(),
            validDate = linkedTicket?.validDate?.toString() ?: validUntil.toLocalDate().toString(),
            saleOpenAt = linkedTicket?.let { resolveResponseSaleOpenAt(it, this, now) }?.toString() ?: saleOpenAt.toString(),
            saleCloseAt = linkedTicket?.let { resolveResponseSaleCloseAt(it) }?.toString() ?: saleCloseAt.toString(),
            imageUrl = linkedTicketId?.takeIf { linkedTicket?.imageKey != null }?.let(ticketImageStorageService::buildPublicTicketImageUrl),
            remainingQuantity = remainingQuantity,
            totalQuantity = totalQuantity,
            maxPerUser = maxPerUser,
            allowDuplicate = allowDuplicate,
            active = linkedTicket?.let { resolveSaleStatus(this, now, it) != EventDto.SaleStatus.INACTIVE } ?: active,
            saleStatus = resolveSaleStatus(this, now, linkedTicket),
            discoveryMode = discoveryMode,
            publicBookingPath = "/events/$eventId",
        )
    }

    private fun resolveResponseValidFrom(ticket: IssuedTicket, linkedEvent: Event?, now: Instant): String {
        return ticket.openAt?.withOffsetSameInstant(ZoneOffset.UTC)?.toString()
            ?: linkedEvent?.validFrom?.atOffset(ZoneOffset.UTC)?.toString()
            ?: now.atOffset(ZoneOffset.UTC).toString()
    }

    private fun resolveResponseValidUntil(ticket: IssuedTicket): String {
        return ticket.validDate.plusDays(1).atStartOfDay().minusSeconds(1).atOffset(ZoneOffset.UTC).toString()
    }

    private fun resolveResponseSaleOpenAt(ticket: IssuedTicket, linkedEvent: Event?, now: Instant): Instant {
        return ticket.openAt?.toInstant() ?: linkedEvent?.saleOpenAt ?: now
    }

    private fun resolveResponseSaleCloseAt(ticket: IssuedTicket): Instant {
        return endOfDayUtc(ticket.validDate)
    }

    private fun resolveSaleStatus(event: Event?, now: Instant, linkedTicket: IssuedTicket?): EventDto.SaleStatus {
        val linkedStatus = linkedTicket?.let { resolveLinkedTicketStatus(it, now) }
        if (linkedStatus == TicketDto.IssuedTicketStatus.INACTIVE) {
            return EventDto.SaleStatus.INACTIVE
        }
        if (linkedStatus == TicketDto.IssuedTicketStatus.EXPIRED) {
            return EventDto.SaleStatus.CLOSED
        }

        val active = linkedStatus == TicketDto.IssuedTicketStatus.ISSUING ||
            linkedStatus == TicketDto.IssuedTicketStatus.VERIFYING ||
            event?.active == true
        if (!active) {
            return EventDto.SaleStatus.INACTIVE
        }

        val saleOpenAt = linkedTicket?.let { resolveResponseSaleOpenAt(it, event, now) } ?: event?.saleOpenAt ?: now
        val saleCloseAt = linkedTicket?.let { resolveResponseSaleCloseAt(it) } ?: event?.saleCloseAt ?: endOfDayUtc(now.atOffset(ZoneOffset.UTC).toLocalDate())
        if (now.isBefore(saleOpenAt)) {
            return EventDto.SaleStatus.UPCOMING
        }
        if (!now.isBefore(saleCloseAt)) {
            return EventDto.SaleStatus.CLOSED
        }

        val remainingQuantity = event?.remainingQuantity ?: linkedTicket?.let { (it.totalCount - it.issuedCount).coerceAtLeast(0) } ?: 0
        if (remainingQuantity <= 0) {
            return EventDto.SaleStatus.SOLD_OUT
        }
        return EventDto.SaleStatus.OPEN
    }

    private fun resolveLinkedTicketStatus(ticket: IssuedTicket, now: Instant): TicketDto.IssuedTicketStatus {
        val today = now.atOffset(ZoneOffset.UTC).toLocalDate()
        if (ticket.status == TicketDto.IssuedTicketStatus.EXPIRED || ticket.validDate.isBefore(today)) {
            return TicketDto.IssuedTicketStatus.EXPIRED
        }
        if (ticket.status == TicketDto.IssuedTicketStatus.INACTIVE) {
            return TicketDto.IssuedTicketStatus.INACTIVE
        }
        val openAt = ticket.openAt?.toInstant()
        if (openAt != null && now.isBefore(openAt)) {
            return TicketDto.IssuedTicketStatus.ISSUING
        }
        if (ticket.status == TicketDto.IssuedTicketStatus.ISSUING || ticket.status == TicketDto.IssuedTicketStatus.VERIFYING) {
            return TicketDto.IssuedTicketStatus.VERIFYING
        }
        return ticket.status
    }

    private fun endOfDayUtc(date: LocalDate): Instant {
        return date.plusDays(1).atStartOfDay().toInstant(ZoneOffset.UTC)
    }
}
