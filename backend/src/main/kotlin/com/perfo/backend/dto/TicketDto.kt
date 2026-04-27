package com.perfo.backend.dto

import com.perfo.backend.entity.Ticket
import com.perfo.backend.entity.TicketUsageStatus
import com.perfo.backend.entity.TicketingStatus
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Positive

class TicketDto {
    data class TicketRequest(
        @field:Positive
        val eventId: Long,
        @field:Positive
        val userId: Long,
        @field:NotBlank
        val idempotencyKey: String
    )

    data class TicketResponse(
        val id: Long?,
        val eventId: Long,
        val userId: Long,
        val ticketNumber: Int?,
        val ticketingStatus: TicketingStatus,
        val usageStatus: TicketUsageStatus?,
        val remainingQuantity: Int
    ) {
        companion object {
            fun from(ticket: Ticket, remainingQuantity: Int): TicketResponse {
                return TicketResponse(
                    id = ticket.id,
                    eventId = ticket.eventId,
                    userId = ticket.userId,
                    ticketNumber = ticket.ticketNumber,
                    ticketingStatus = ticket.ticketingStatus,
                    usageStatus = ticket.usageStatus,
                    remainingQuantity = remainingQuantity
                )
            }
        }
    }

    data class VerifyTicketRequest(
        @field:Positive
        val ticketId: Long,
        @field:Positive
        val eventId: Long,
        @field:Positive
        val userId: Long,
        @field:NotBlank
        val signature: String
    )

    data class VerifyTicketResponse(
        val verified: Boolean,
        val ticketId: Long,
        val usageStatus: TicketUsageStatus
    )
}
