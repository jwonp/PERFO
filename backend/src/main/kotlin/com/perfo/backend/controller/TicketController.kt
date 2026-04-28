package com.perfo.backend.controller

import com.perfo.backend.dto.TicketDto
import com.perfo.backend.service.TicketService
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/tickets")
class TicketController(
    private val ticketService: TicketService,
) {
    @PostMapping
    fun createTicket(
        @Valid @RequestBody request: TicketDto.CreateTicketRequest,
    ): TicketDto.TicketResponse {
        return ticketService.create(request)
    }

    @ResponseStatus(HttpStatus.BAD_REQUEST)
    @ExceptionHandler(IllegalArgumentException::class)
    fun handleIllegalArgument(exception: IllegalArgumentException): Map<String, String> {
        return mapOf("message" to (exception.message ?: "Invalid request"))
    }
}
