package com.perfo.backend.controller

import com.perfo.backend.dto.TicketDto
import com.perfo.backend.service.TicketService
import com.perfo.backend.service.TicketVerificationService
import jakarta.validation.Valid
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/tickets")
class TicketController(
    private val ticketService: TicketService,
    private val ticketVerificationService: TicketVerificationService
) {

    @PostMapping("/request")
    fun requestTicket(@Valid @RequestBody request: TicketDto.TicketRequest): ResponseEntity<TicketDto.TicketResponse> {
        return ResponseEntity.ok(ticketService.requestTicket(request))
    }

    @PostMapping("/verify")
    fun verifyTicket(
        @Valid @RequestBody request: TicketDto.VerifyTicketRequest
    ): ResponseEntity<TicketDto.VerifyTicketResponse> {
        return ResponseEntity.ok(ticketVerificationService.verify(request))
    }
}
