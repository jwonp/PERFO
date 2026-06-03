package com.perfo.backend.controller

import com.perfo.backend.config.InternalAuthenticatedUser
import com.perfo.backend.dto.TicketDto
import com.perfo.backend.service.BookingDraftService
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/events/{eventId}/draft")
class BookingDraftController(
    private val bookingDraftService: BookingDraftService,
) {
    @GetMapping
    fun getDraft(
        authentication: Authentication,
        @PathVariable eventId: Long,
    ): TicketDto.BookingDraftResponse {
        return bookingDraftService.getDraft(eventId, resolveAuthenticatedUserId(authentication))
    }

    @PutMapping
    fun saveDraft(
        authentication: Authentication,
        @PathVariable eventId: Long,
        @Valid @RequestBody request: TicketDto.BookingDraftSaveRequest,
    ): TicketDto.BookingDraftResponse {
        return bookingDraftService.saveDraft(eventId, resolveAuthenticatedUserId(authentication), request)
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
