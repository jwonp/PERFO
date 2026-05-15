package com.perfo.backend.controller

import com.perfo.backend.dto.TicketDto
import com.perfo.backend.config.InternalAuthenticatedUser
import com.perfo.backend.service.TicketingProjectionQueryService
import com.perfo.backend.service.TicketingService
import jakarta.validation.Valid
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import org.springframework.http.HttpStatus
import org.springframework.security.core.Authentication

@RestController
@RequestMapping("/api/ticketing")
class TicketingController(
    private val ticketingService: TicketingService,
    private val ticketingProjectionQueryService: TicketingProjectionQueryService,
) {
    @PostMapping("/requests")
    fun submitRequest(
        authentication: Authentication,
        @Valid @RequestBody request: TicketDto.TicketingRequestSubmitRequest,
    ): TicketDto.TicketingRequestSubmitResponse {
        val authenticatedUserId = resolveAuthenticatedUserId(authentication)
        return ticketingService.submitRequest(authenticatedUserId, request)
    }

    @GetMapping("/events/{eventId}/projection")
    fun getEventProjection(
        @PathVariable eventId: Long,
        @RequestParam(required = false) limit: Int?,
    ): TicketDto.TicketingProjectionSummaryResponse {
        return ticketingProjectionQueryService.getEventProjectionSummary(eventId, limit)
    }

    @ResponseStatus(HttpStatus.BAD_REQUEST)
    @ExceptionHandler(IllegalArgumentException::class)
    fun handleIllegalArgument(exception: IllegalArgumentException): Map<String, String> {
        return mapOf("message" to (exception.message ?: "Invalid request"))
    }

    private fun resolveAuthenticatedUserId(authentication: Authentication): Long {
        val principal = authentication.principal
        if (principal is InternalAuthenticatedUser && principal.userId != null) {
            return principal.userId
        }

        return authentication.name.toLongOrNull()
            ?: throw IllegalArgumentException("Authenticated user id is missing")
    }
}
