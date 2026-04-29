package com.perfo.backend.controller

import com.perfo.backend.dto.TicketDto
import com.perfo.backend.service.TicketService
import com.perfo.backend.service.TicketTransitionService
import com.perfo.backend.service.TicketVerificationService
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api")
class TicketController(
    private val ticketService: TicketService,
    private val ticketVerificationService: TicketVerificationService,
    private val ticketTransitionService: TicketTransitionService,
) {
    @PostMapping("/tickets")
    fun createTicket(
        @Valid @RequestBody request: TicketDto.CreateTicketRequest,
    ): TicketDto.TicketResponse {
        return ticketService.create(request)
    }

    @GetMapping("/tickets")
    fun listIssuedTickets(
        @RequestParam ownerUserId: String,
    ): List<TicketDto.TicketResponse> {
        return ticketService.findAllByOwnerUserId(ownerUserId)
    }

    @PostMapping("/reservations/{reservationId}/qr-token")
    fun issueReservationQrToken(
        @PathVariable reservationId: Long,
    ): TicketDto.TicketQrTokenResponse {
        return ticketVerificationService.issueReservationQrToken(reservationId)
    }

    @PostMapping("/tickets/{ticketId}/validations")
    fun validateTicketByQr(
        @PathVariable ticketId: Long,
        @Valid @RequestBody request: TicketDto.TicketValidationRequest,
    ): TicketDto.TicketValidationResponse {
        return ticketVerificationService.validateTicketByQr(ticketId, request)
    }

    @PatchMapping("/internal/tickets/{ticketId}/ticketing-status")
    fun transitionTicketingStatus(
        @PathVariable ticketId: Long,
        @RequestBody request: TicketDto.TicketStatusTransitionRequest,
    ): TicketDto.TicketStateResponse {
        return ticketTransitionService.transitionTicketingStatus(ticketId, request.nextStatus)
    }

    @PatchMapping("/internal/tickets/{ticketId}/usage-status")
    fun transitionUsageStatus(
        @PathVariable ticketId: Long,
        @RequestBody request: TicketDto.TicketUsageTransitionRequest,
    ): TicketDto.TicketStateResponse {
        return ticketTransitionService.transitionUsageStatus(ticketId, request.nextStatus)
    }

    @PatchMapping("/internal/issued-tickets/{ticketId}/status")
    fun transitionIssuedTicketStatus(
        @PathVariable ticketId: Long,
        @RequestBody request: TicketDto.IssuedTicketStatusTransitionRequest,
    ): TicketDto.TicketResponse {
        return ticketService.updateIssuedStatus(ticketId, request.nextStatus)
    }

    @ResponseStatus(HttpStatus.BAD_REQUEST)
    @ExceptionHandler(IllegalArgumentException::class)
    fun handleIllegalArgument(exception: IllegalArgumentException): Map<String, String> {
        return mapOf("message" to (exception.message ?: "Invalid request"))
    }
}
