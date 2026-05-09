package com.perfo.backend.controller

import com.perfo.backend.dto.EventDto
import com.perfo.backend.service.EventQueryService
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/events")
class EventController(
    private val eventQueryService: EventQueryService,
) {
    @GetMapping
    fun listEvents(): List<EventDto.EventResponse> {
        return eventQueryService.listPublicEvents()
    }

    @GetMapping("/{eventId}")
    fun getEvent(
        @PathVariable eventId: Long,
    ): EventDto.EventResponse {
        return eventQueryService.getPublicEvent(eventId)
    }

    @ResponseStatus(HttpStatus.NOT_FOUND)
    @ExceptionHandler(IllegalArgumentException::class)
    fun handleIllegalArgument(exception: IllegalArgumentException): Map<String, String> {
        return mapOf("message" to (exception.message ?: "Event not found"))
    }
}
