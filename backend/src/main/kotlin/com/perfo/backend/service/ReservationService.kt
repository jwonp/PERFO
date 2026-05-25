package com.perfo.backend.service

import com.perfo.backend.dto.TicketDto
import com.perfo.backend.entity.Event
import com.perfo.backend.entity.Ticket
import com.perfo.backend.entity.TicketUsageStatus
import com.perfo.backend.repository.EventRepository
import com.perfo.backend.repository.IssuedTicketRepository
import com.perfo.backend.repository.TicketRepository
import org.springframework.stereotype.Service
import java.time.LocalDateTime

@Service
class ReservationService(
    private val ticketRepository: TicketRepository,
    private val eventRepository: EventRepository,
    private val issuedTicketRepository: IssuedTicketRepository,
    private val ticketImageStorageService: TicketImageStorageService,
) {
    fun findAllByUserId(userId: Long): List<TicketDto.ReservationResponse> {
        val reservations = ticketRepository.findByUserIdOrderByIdDesc(userId)
        if (reservations.isEmpty()) {
            return emptyList()
        }

        val eventsById = eventRepository.findAllById(reservations.map { it.eventId })
            .associateBy { it.id }

        val issuedTicketIds = eventsById.values.mapNotNull { it.issuedTicketId }
        val issuedTicketsById = issuedTicketRepository.findAllById(issuedTicketIds)
            .associateBy { requireNotNull(it.id) }

        return reservations.mapNotNull { reservation ->
            val event = eventsById[reservation.eventId] ?: return@mapNotNull null
            val usageStatus = resolveUsageStatus(reservation.usageStatus, event)
            val issuedTicket = event.issuedTicketId?.let { issuedTicketsById[it] }

            TicketDto.ReservationResponse(
                id = reservation.id ?: return@mapNotNull null,
                name = event.name,
                venue = event.venue,
                validDate = event.validUntil.toLocalDate().toString(),
                ticketNumber = reservation.ticketNumber,
                totalCount = event.totalQuantity,
                ticketingStatus = reservation.ticketingStatus,
                usageStatus = usageStatus.toReservedUsageStatus(),
                imageUrl = issuedTicket?.id?.takeIf { issuedTicket.imageKey != null }
                    ?.let { ticketImageStorageService.buildPublicTicketImageUrl(it) },
            )
        }
    }

    private fun resolveUsageStatus(
        storedStatus: TicketUsageStatus,
        event: Event,
        now: LocalDateTime = TicketingTime.eventNow(),
    ): TicketUsageStatus {
        if (storedStatus == TicketUsageStatus.USED) {
            return TicketUsageStatus.USED
        }

        if (now.isAfter(event.validUntil)) {
            return TicketUsageStatus.EXPIRED
        }

        if (now.isBefore(event.validFrom)) {
            return TicketUsageStatus.BEFORE_SERVING
        }

        return when (storedStatus) {
            TicketUsageStatus.BEFORE_SERVING,
            TicketUsageStatus.WAITING,
            TicketUsageStatus.NOW_SERVING,
            TicketUsageStatus.EXPIRED -> TicketUsageStatus.NOW_SERVING
            TicketUsageStatus.USED -> TicketUsageStatus.USED
        }
    }

    private fun TicketUsageStatus.toReservedUsageStatus(): TicketDto.ReservedUsageStatus {
        return when (this) {
            TicketUsageStatus.BEFORE_SERVING -> TicketDto.ReservedUsageStatus.BEFORE_USE
            TicketUsageStatus.WAITING -> TicketDto.ReservedUsageStatus.WAITING
            TicketUsageStatus.NOW_SERVING -> TicketDto.ReservedUsageStatus.MY_TURN
            TicketUsageStatus.USED, TicketUsageStatus.EXPIRED -> TicketDto.ReservedUsageStatus.USED
        }
    }
}
