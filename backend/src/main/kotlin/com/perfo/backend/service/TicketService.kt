package com.perfo.backend.service

import com.perfo.backend.dto.TicketDto
import com.perfo.backend.dto.TicketDto.IssuedTicketStatus
import com.perfo.backend.service.ticket.IssuedTicketCommandService
import com.perfo.backend.service.ticket.IssuedTicketQueryService
import com.perfo.backend.service.ticket.TicketImageService
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Service
import org.springframework.web.multipart.MultipartFile

@Service
class TicketService(
    private val commandService: IssuedTicketCommandService,
    private val queryService: IssuedTicketQueryService,
    private val imageService: TicketImageService,
) {
    fun create(
        request: TicketDto.CreateTicketRequest,
        authenticatedOwnerUserId: String,
    ): TicketDto.TicketResponse {
        return create(request, authenticatedOwnerUserId, file = null)
    }

    fun create(
        request: TicketDto.CreateTicketRequest,
        authenticatedOwnerUserId: String,
        file: MultipartFile?,
    ): TicketDto.TicketResponse {
        val saved = commandService.create(request, authenticatedOwnerUserId, file)
        return queryService.toResponse(saved)
    }

    fun findAllByOwnerUserId(
        ownerUserId: String,
        authenticatedOwnerUserId: String,
    ): List<TicketDto.TicketResponse> {
        return queryService.findAllByOwnerUserId(ownerUserId, authenticatedOwnerUserId)
    }

    fun updateTicket(
        ticketId: Long,
        authenticatedOwnerUserId: String,
        request: TicketDto.UpdateTicketRequest,
    ): TicketDto.TicketResponse {
        val saved = commandService.updateTicket(ticketId, authenticatedOwnerUserId, request)
        return queryService.toResponse(saved)
    }

    fun updateIssuedStatus(
        ticketId: Long,
        authenticatedOwnerUserId: String,
        nextStatus: IssuedTicketStatus,
    ): TicketDto.TicketResponse {
        val saved = commandService.updateIssuedStatus(ticketId, authenticatedOwnerUserId, nextStatus)
        return queryService.toResponse(saved)
    }

    @Scheduled(fixedDelay = 60_000)
    fun reconcileIssuedTicketStatuses() {
        commandService.reconcileIssuedTicketStatuses()
    }

    fun uploadTicketImage(
        ticketId: Long,
        authenticatedOwnerUserId: String,
        file: MultipartFile,
    ): TicketDto.TicketImageUploadResponse {
        return imageService.uploadTicketImage(ticketId, authenticatedOwnerUserId, file)
    }

    fun getTicketImage(
        ticketId: Long,
        authenticatedOwnerUserId: String,
    ): ProfileImageContent {
        return imageService.getTicketImage(ticketId, authenticatedOwnerUserId)
    }

    fun getPublicTicketImage(ticketId: Long): ProfileImageContent {
        return imageService.getPublicTicketImage(ticketId)
    }

    fun cleanupUploadedTicketImage(
        ticketId: Long,
        authenticatedOwnerUserId: String,
        imageKey: String,
    ) {
        imageService.cleanupUploadedTicketImage(ticketId, authenticatedOwnerUserId, imageKey)
    }
}
