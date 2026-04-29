package com.perfo.backend.service

import com.perfo.backend.dto.TicketDto
import com.perfo.backend.entity.Ticket
import com.perfo.backend.entity.TicketUsageStatus
import com.perfo.backend.repository.EventRepository
import com.perfo.backend.repository.TicketRepository
import org.springframework.stereotype.Service

@Service
class ReservationService(
    private val ticketRepository: TicketRepository,
    private val eventRepository: EventRepository,
) {
    fun findAllByUserId(userId: Long): List<TicketDto.ReservationResponse> {
        val reservations = ticketRepository.findByUserIdOrderByIdDesc(userId)
        if (reservations.isEmpty()) {
            return emptyList()
        }

        val eventsById = eventRepository.findAllById(reservations.map { it.eventId })
            .associateBy { it.id }

        return reservations.mapNotNull { reservation ->
            val event = eventsById[reservation.eventId] ?: return@mapNotNull null

            TicketDto.ReservationResponse(
                id = reservation.id ?: return@mapNotNull null,
                name = event.name,
                venue = event.venue,
                validDate = event.validUntil.toLocalDate().toString(),
                ticketNumber = reservation.ticketNumber,
                totalCount = event.totalQuantity,
                ticketingStatus = reservation.ticketingStatus,
                usageStatus = reservation.usageStatus.toReservedUsageStatus(),
            )
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
