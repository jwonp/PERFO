package com.perfo.backend.service

import com.perfo.backend.dto.EventDto
import com.perfo.backend.entity.Event
import com.perfo.backend.entity.TicketDiscoveryMode
import com.perfo.backend.repository.EventRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.time.ZoneOffset

@Service
class EventQueryService(
    private val eventRepository: EventRepository,
) {
    @Transactional(readOnly = true)
    fun listPublicEvents(): List<EventDto.EventResponse> {
        val now = Instant.now()
        return eventRepository.findByActiveTrueAndDiscoveryModeOrderBySaleOpenAtAscIdAsc(TicketDiscoveryMode.LISTED)
            .map { it.toResponse(now) }
    }

    @Transactional(readOnly = true)
    fun getPublicEvent(eventId: Long): EventDto.EventResponse {
        val event = eventRepository.findById(eventId)
            .orElseThrow { IllegalArgumentException("Event not found") }
        return event.toResponse(Instant.now())
    }

    private fun Event.toResponse(now: Instant): EventDto.EventResponse {
        val eventId = requireNotNull(id) { "Event id is missing" }
        return EventDto.EventResponse(
            id = eventId,
            name = name,
            venue = venue,
            validFrom = validFrom.atOffset(ZoneOffset.UTC).toString(),
            validUntil = validUntil.atOffset(ZoneOffset.UTC).toString(),
            saleOpenAt = saleOpenAt.toString(),
            saleCloseAt = saleCloseAt.toString(),
            remainingQuantity = remainingQuantity,
            totalQuantity = totalQuantity,
            maxPerUser = maxPerUser,
            allowDuplicate = allowDuplicate,
            active = active,
            saleStatus = resolveSaleStatus(this, now),
            discoveryMode = discoveryMode,
            publicBookingPath = "/events/$eventId",
        )
    }

    private fun resolveSaleStatus(event: Event, now: Instant): EventDto.SaleStatus {
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
}
