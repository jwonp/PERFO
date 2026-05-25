package com.perfo.backend.service.ticket

import com.perfo.backend.dto.TicketDto
import com.perfo.backend.dto.TicketDto.IssuedTicketStatus
import com.perfo.backend.entity.IssuedTicket
import com.perfo.backend.service.ProfileImageContent
import com.perfo.backend.service.PublicTicketImageUnavailableException
import com.perfo.backend.service.TicketImageStorageService
import com.perfo.backend.service.TicketingTime
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.multipart.MultipartFile
import java.time.OffsetDateTime
import java.util.UUID

@Service
class TicketImageService(
    private val queryService: IssuedTicketQueryService,
    private val ticketImageStorageService: TicketImageStorageService,
) {

    @Transactional
    fun uploadTicketImage(
        ticketId: Long,
        authenticatedOwnerUserId: String,
        file: MultipartFile,
    ): TicketDto.TicketImageUploadResponse {
        val ticket = queryService.findOwnedTicket(ticketId, authenticatedOwnerUserId)
        TicketImageValidator.validateUploadFile(file)
        val detectedImage = TicketImageValidator.detectSupportedImage(file.bytes)
        val objectKey = "${ticket.ownerUserId}/${ticketId}/${UUID.randomUUID()}.${detectedImage.extension}"
        val storedObjectKey = ticketImageStorageService.uploadTicketImage(
            objectKey = objectKey,
            bytes = file.bytes,
            contentType = detectedImage.contentType,
        )

        return TicketDto.TicketImageUploadResponse(
            imageKey = storedObjectKey,
            imageUrl = ticketImageStorageService.buildTicketImageUrl(ticketId),
        )
    }

    @Transactional(readOnly = true)
    fun getTicketImage(
        ticketId: Long,
        authenticatedOwnerUserId: String,
    ): ProfileImageContent {
        val ticket = queryService.findOwnedTicket(ticketId, authenticatedOwnerUserId)
        val imageKey = ticket.imageKey ?: throw IllegalArgumentException("Ticket image not found")
        return ticketImageStorageService.downloadTicketImage(imageKey)
    }

    @Transactional(readOnly = true)
    fun getPublicTicketImage(ticketId: Long): ProfileImageContent {
        val ticket = try {
            queryService.findTicket(ticketId)
        } catch (_: IllegalArgumentException) {
            throw PublicTicketImageUnavailableException()
        }
        val imageKey = ticket.imageKey ?: throw PublicTicketImageUnavailableException()
        val effectiveStatus = IssuedTicketStatusPolicy.resolveEffectiveStatus(
            storedStatus = ticket.status,
            openAt = ticket.openAt,
            validDate = ticket.validDate,
            now = resolveCurrentTime(),
        )
        val isPubliclyVisible = effectiveStatus == IssuedTicketStatus.ISSUING ||
            effectiveStatus == IssuedTicketStatus.VERIFYING
        if (!isPubliclyVisible) {
            throw PublicTicketImageUnavailableException()
        }

        return ticketImageStorageService.downloadTicketImage(imageKey)
    }

    @Transactional(readOnly = true)
    fun cleanupUploadedTicketImage(
        ticketId: Long,
        authenticatedOwnerUserId: String,
        imageKey: String,
    ) {
        val ticket = queryService.findOwnedTicket(ticketId, authenticatedOwnerUserId)
        val normalizedImageKey = normalizeImageKey(imageKey, "${authenticatedOwnerUserId}/${ticketId}/")
            ?: throw IllegalArgumentException("Invalid imageKey")

        if (ticket.imageKey == normalizedImageKey) {
            return
        }

        ticketImageStorageService.deleteTicketImage(normalizedImageKey)
    }

    fun uploadImageForCreatedTicket(ticket: IssuedTicket, file: MultipartFile): String {
        TicketImageValidator.validateUploadFile(file)
        val imageBytes = file.bytes
        val detectedImage = TicketImageValidator.detectSupportedImage(imageBytes)
        val ticketId = requireNotNull(ticket.id) { "Ticket id is missing" }
        val objectKey = "${ticket.ownerUserId}/${ticketId}/${UUID.randomUUID()}.${detectedImage.extension}"

        return ticketImageStorageService.uploadTicketImage(
            objectKey = objectKey,
            bytes = imageBytes,
            contentType = detectedImage.contentType,
        )
    }

    fun normalizeImageKey(imageKey: String?, requiredPrefix: String): String? {
        val normalizedImageKey = imageKey?.trim()?.ifBlank { null }
        require(normalizedImageKey == null || !normalizedImageKey.contains("://")) {
            "Invalid imageKey"
        }
        require(normalizedImageKey == null || normalizedImageKey.startsWith(requiredPrefix)) {
            "Invalid imageKey"
        }
        return normalizedImageKey
    }

    fun cleanupPreviousImage(previousImageKey: String?, nextImageKey: String?) {
        if (previousImageKey != null && previousImageKey != nextImageKey) {
            ticketImageStorageService.deleteTicketImage(previousImageKey)
        }
    }

    fun cleanupReplacedImage(previousImageKey: String?, nextImageKey: String?) {
        if (nextImageKey != null && nextImageKey != previousImageKey) {
            ticketImageStorageService.deleteTicketImage(nextImageKey)
        }
    }

    fun deleteTicketImage(imageKey: String) {
        ticketImageStorageService.deleteTicketImage(imageKey)
    }

    private fun resolveCurrentTime(): OffsetDateTime {
        return TicketingTime.utcNow()
    }
}
