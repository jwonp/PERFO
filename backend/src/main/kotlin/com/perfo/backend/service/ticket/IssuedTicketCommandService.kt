package com.perfo.backend.service.ticket

import com.perfo.backend.dto.TicketDto
import com.perfo.backend.dto.TicketDto.IssuedTicketStatus
import com.perfo.backend.entity.IssuedTicket
import com.perfo.backend.repository.IssuedTicketRepository
import com.perfo.backend.service.TicketingTime
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.multipart.MultipartFile
import java.time.LocalDate
import java.time.OffsetDateTime

@Service
class IssuedTicketCommandService(
    private val issuedTicketRepository: IssuedTicketRepository,
    private val queryService: IssuedTicketQueryService,
    private val eventSyncService: IssuedTicketEventSyncService,
    private val imageService: TicketImageService,
    private val notificationService: IssuedTicketNotificationService,
) {
    private val placeIdPattern = Regex("^[A-Za-z0-9_-]{3,256}$")

    @Transactional
    fun create(
        request: TicketDto.CreateTicketRequest,
        authenticatedOwnerUserId: String,
        file: MultipartFile?,
    ): IssuedTicket {
        queryService.validateOwner(request.ownerUserId, authenticatedOwnerUserId)
        validatePlaceId(request.googlePlaceId)
        val normalizedImageKey = if (file == null) {
            imageService.normalizeImageKey(request.imageKey, "$authenticatedOwnerUserId/")
        } else {
            null
        }

        val saved = issuedTicketRepository.save(
            IssuedTicket(
                ownerUserId = authenticatedOwnerUserId,
                name = request.name.trim(),
                venue = request.venue.trim(),
                googlePlaceId = request.googlePlaceId,
                detailAddress = request.detailAddress?.trim()?.ifBlank { null },
                validDate = LocalDate.parse(request.validDate),
                openAt = normalizeOpenAt(request.openAt),
                imageKey = normalizedImageKey,
                totalCount = request.totalCount,
                allowDuplicate = request.allowDuplicate,
                maxPerUser = request.maxPerUser,
                discoveryMode = request.discoveryMode,
                status = IssuedTicketStatus.INACTIVE,
                issuedCount = 0,
            ),
        )

        val linkedEvent = eventSyncService.syncLinkedEvent(saved)
        saved.eventId = linkedEvent.id

        if (file == null) {
            return issuedTicketRepository.save(saved)
        }

        val storedImageKey = imageService.uploadImageForCreatedTicket(saved, file)
        saved.imageKey = storedImageKey

        return try {
            issuedTicketRepository.save(saved)
        } catch (exception: Exception) {
            imageService.deleteTicketImage(storedImageKey)
            throw exception
        }
    }

    @Transactional
    fun updateTicket(
        ticketId: Long,
        authenticatedOwnerUserId: String,
        request: TicketDto.UpdateTicketRequest,
    ): IssuedTicket {
        validatePlaceId(request.googlePlaceId)

        val ticket = queryService.findOwnedTicket(ticketId, authenticatedOwnerUserId)
        val nextValidDate = LocalDate.parse(request.validDate)
        val currentStatus = IssuedTicketStatusPolicy.resolveEffectiveStatus(
            storedStatus = ticket.status,
            openAt = ticket.openAt,
            validDate = ticket.validDate,
            now = resolveCurrentTime(),
        )
        val previousImageKey = ticket.imageKey
        val nextImageKey = imageService.normalizeImageKey(request.imageKey, "${authenticatedOwnerUserId}/${ticketId}/")
        val nextOpenAt = normalizeOpenAt(request.openAt)
        val nextStatus = try {
            IssuedTicketStatusPolicy.resolveNextStatus(
                currentStatus = currentStatus,
                requestedStatus = request.status,
                openAt = nextOpenAt,
                validDate = nextValidDate,
                now = resolveCurrentTime(),
            )
        } catch (exception: IllegalArgumentException) {
            imageService.cleanupReplacedImage(previousImageKey, nextImageKey)
            throw exception
        }

        ticket.name = request.name.trim()
        ticket.venue = request.venue.trim()
        ticket.googlePlaceId = request.googlePlaceId
        ticket.detailAddress = request.detailAddress?.trim()?.ifBlank { null }
        ticket.validDate = nextValidDate
        ticket.openAt = nextOpenAt
        ticket.totalCount = request.totalCount
        ticket.allowDuplicate = request.allowDuplicate
        ticket.maxPerUser = request.maxPerUser
        ticket.discoveryMode = request.discoveryMode
        ticket.imageKey = nextImageKey
        ticket.status = nextStatus

        val saved = try {
            issuedTicketRepository.save(ticket)
        } catch (exception: Exception) {
            imageService.cleanupReplacedImage(previousImageKey, nextImageKey)
            throw exception
        }

        eventSyncService.syncLinkedEvent(saved)
        imageService.cleanupPreviousImage(previousImageKey, nextImageKey)

        val savedStatus = IssuedTicketStatusPolicy.resolveEffectiveStatus(
            storedStatus = saved.status,
            openAt = saved.openAt,
            validDate = saved.validDate,
            now = resolveCurrentTime(),
        )
        notificationService.notifyIssuedStatusTransition(saved, currentStatus, savedStatus)

        return saved
    }

    @Transactional
    fun updateIssuedStatus(
        ticketId: Long,
        authenticatedOwnerUserId: String,
        nextStatus: IssuedTicketStatus,
    ): IssuedTicket {
        val ticket = queryService.findOwnedTicket(ticketId, authenticatedOwnerUserId)
        val previousStatus = IssuedTicketStatusPolicy.resolveEffectiveStatus(
            storedStatus = ticket.status,
            openAt = ticket.openAt,
            validDate = ticket.validDate,
            now = resolveCurrentTime(),
        )
        val resolvedStatus = IssuedTicketStatusPolicy.resolveNextStatus(
            currentStatus = previousStatus,
            requestedStatus = nextStatus,
            openAt = ticket.openAt,
            validDate = ticket.validDate,
            now = resolveCurrentTime(),
        )
        if (ticket.status == resolvedStatus) {
            return ticket
        }

        ticket.status = resolvedStatus
        val saved = issuedTicketRepository.save(ticket)
        eventSyncService.syncLinkedEvent(saved)
        val savedStatus = IssuedTicketStatusPolicy.resolveEffectiveStatus(
            storedStatus = saved.status,
            openAt = saved.openAt,
            validDate = saved.validDate,
            now = resolveCurrentTime(),
        )
        notificationService.notifyIssuedStatusTransition(saved, previousStatus, savedStatus)
        return saved
    }

    @Transactional
    fun reconcileIssuedTicketStatuses() {
        val now = resolveCurrentTime()
        val today = now.toLocalDate()

        issuedTicketRepository.findByStatusInAndValidDateBefore(
            listOf(
                IssuedTicketStatus.INACTIVE,
                IssuedTicketStatus.ISSUING,
                IssuedTicketStatus.VERIFYING,
            ),
            today,
        ).forEach { ticket ->
            val previousStatus = ticket.status
            ticket.status = IssuedTicketStatus.EXPIRED
            val saved = issuedTicketRepository.save(ticket)
            eventSyncService.syncLinkedEvent(saved, now)
            notificationService.notifyIssuedStatusTransition(saved, previousStatus, IssuedTicketStatus.EXPIRED)
        }

        issuedTicketRepository.findByStatusAndOpenAtLessThanEqual(
            IssuedTicketStatus.ISSUING,
            now,
        ).filter { it.validDate >= today }
            .forEach { ticket ->
                val previousStatus = ticket.status
                ticket.status = IssuedTicketStatus.VERIFYING
                val saved = issuedTicketRepository.save(ticket)
                eventSyncService.syncLinkedEvent(saved, now)
                notificationService.notifyIssuedStatusTransition(saved, previousStatus, IssuedTicketStatus.VERIFYING)
            }
    }

    private fun validatePlaceId(googlePlaceId: String) {
        if (!placeIdPattern.matches(googlePlaceId)) {
            throw IllegalArgumentException("Invalid googlePlaceId")
        }
    }

    private fun normalizeOpenAt(openAt: String?): OffsetDateTime? {
        val normalizedOpenAt = openAt?.trim()?.ifBlank { null } ?: return null
        return try {
            OffsetDateTime.parse(normalizedOpenAt)
        } catch (_: Exception) {
            throw IllegalArgumentException("Invalid openAt")
        }
    }

    private fun resolveCurrentTime(): OffsetDateTime {
        return TicketingTime.utcNow()
    }
}
