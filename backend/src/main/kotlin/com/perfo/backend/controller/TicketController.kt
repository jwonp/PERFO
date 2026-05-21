package com.perfo.backend.controller

import com.perfo.backend.config.InternalAuthenticatedUser
import com.perfo.backend.dto.TicketDto
import com.perfo.backend.service.TicketService
import com.perfo.backend.service.TicketTransitionService
import com.perfo.backend.service.TicketVerificationService
import com.perfo.backend.service.ReservationService
import com.perfo.backend.service.ProfileImageContent
import jakarta.validation.Valid
import org.springframework.http.CacheControl
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.security.access.AccessDeniedException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.multipart.MultipartFile
import org.springframework.security.core.Authentication
import java.util.concurrent.TimeUnit

@RestController
@RequestMapping("/api")
class TicketController(
    private val ticketService: TicketService,
    private val reservationService: ReservationService,
    private val ticketVerificationService: TicketVerificationService,
    private val ticketTransitionService: TicketTransitionService,
) {
    @PostMapping("/tickets")
    fun createTicket(
        authentication: Authentication,
        @Valid @RequestBody request: TicketDto.CreateTicketRequest,
    ): TicketDto.TicketResponse {
        return ticketService.create(request, resolveAuthenticatedUserId(authentication))
    }

    @GetMapping("/tickets")
    fun listIssuedTickets(
        authentication: Authentication,
        @RequestParam ownerUserId: String,
    ): List<TicketDto.TicketResponse> {
        return ticketService.findAllByOwnerUserId(ownerUserId, resolveAuthenticatedUserId(authentication))
    }

    @PatchMapping("/tickets/{ticketId}")
    fun updateTicket(
        @PathVariable ticketId: Long,
        authentication: Authentication,
        @Valid @RequestBody request: TicketDto.UpdateTicketRequest,
    ): TicketDto.TicketResponse {
        return ticketService.updateTicket(ticketId, resolveAuthenticatedUserId(authentication), request)
    }

    @PostMapping("/tickets/{ticketId}/image")
    fun uploadTicketImage(
        @PathVariable ticketId: Long,
        authentication: Authentication,
        @RequestParam("file") file: MultipartFile,
    ): TicketDto.TicketImageUploadResponse {
        return ticketService.uploadTicketImage(ticketId, resolveAuthenticatedUserId(authentication), file)
    }

    @GetMapping("/tickets/{ticketId}/image")
    fun getTicketImage(
        @PathVariable ticketId: Long,
        authentication: Authentication,
    ): ResponseEntity<ByteArray> {
        val image: ProfileImageContent = ticketService.getTicketImage(ticketId, resolveAuthenticatedUserId(authentication))

        return ResponseEntity.ok()
            .cacheControl(CacheControl.maxAge(0, TimeUnit.SECONDS).mustRevalidate().cachePrivate())
            .header(HttpHeaders.PRAGMA, "no-cache")
            .contentType(MediaType.parseMediaType(image.contentType))
            .body(image.bytes)
    }

    @DeleteMapping("/tickets/{ticketId}/image")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun cleanupTicketImage(
        @PathVariable ticketId: Long,
        authentication: Authentication,
        @RequestParam imageKey: String,
    ) {
        ticketService.cleanupUploadedTicketImage(ticketId, resolveAuthenticatedUserId(authentication), imageKey)
    }

    @GetMapping("/reservations")
    fun listReservations(
        authentication: Authentication,
        @RequestParam(required = false) userId: Long?,
    ): List<TicketDto.ReservationResponse> {
        val authenticatedUserId = resolveAuthenticatedUserIdAsLong(authentication)
        if (userId != null && userId != authenticatedUserId) {
            throw AccessDeniedException("Reservation owner mismatch")
        }
        return reservationService.findAllByUserId(authenticatedUserId)
    }

    @PostMapping("/reservations/{reservationId}/qr-token")
    fun issueReservationQrToken(
        @PathVariable reservationId: Long,
        authentication: Authentication,
    ): TicketDto.TicketQrTokenResponse {
        return ticketVerificationService.issueReservationQrToken(
            reservationId = reservationId,
            authenticatedUserId = resolveAuthenticatedUserIdAsLong(authentication),
        )
    }

    @PostMapping("/tickets/{ticketId}/validations")
    fun validateTicketByQr(
        @PathVariable ticketId: Long,
        authentication: Authentication,
        @Valid @RequestBody request: TicketDto.TicketValidationRequest,
    ): TicketDto.TicketValidationResponse {
        return ticketVerificationService.validateTicketByQr(
            ticketId = ticketId,
            authenticatedOwnerUserId = resolveAuthenticatedUserIdAsLong(authentication),
            request = request,
        )
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
        authentication: Authentication,
        @RequestBody request: TicketDto.IssuedTicketStatusTransitionRequest,
    ): TicketDto.TicketResponse {
        return ticketService.updateIssuedStatus(ticketId, resolveAuthenticatedUserId(authentication), request.nextStatus)
    }

    @ResponseStatus(HttpStatus.BAD_REQUEST)
    @ExceptionHandler(IllegalArgumentException::class)
    fun handleIllegalArgument(exception: IllegalArgumentException): Map<String, String> {
        return mapOf("message" to (exception.message ?: "Invalid request"))
    }

    @ResponseStatus(HttpStatus.FORBIDDEN)
    @ExceptionHandler(AccessDeniedException::class)
    fun handleAccessDenied(exception: AccessDeniedException): Map<String, String> {
        return mapOf("message" to (exception.message ?: "Forbidden"))
    }

    @ResponseStatus(HttpStatus.SERVICE_UNAVAILABLE)
    @ExceptionHandler(IllegalStateException::class)
    fun handleIllegalState(exception: IllegalStateException): Map<String, String> {
        return mapOf("message" to (exception.message ?: "Storage unavailable"))
    }

    private fun resolveAuthenticatedUserId(authentication: Authentication): String {
        val principal = authentication.principal
        if (principal is InternalAuthenticatedUser && principal.userId != null) {
            return principal.userId.toString()
        }

        return authentication.name.ifBlank {
            throw IllegalArgumentException("Authenticated user id is missing")
        }
    }

    private fun resolveAuthenticatedUserIdAsLong(authentication: Authentication): Long {
        return resolveAuthenticatedUserId(authentication).toLongOrNull()
            ?: throw IllegalArgumentException("Authenticated user id is missing")
    }
}
