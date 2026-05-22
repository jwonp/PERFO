package com.perfo.backend.service

import com.perfo.backend.dto.TicketDto
import com.perfo.backend.dto.TicketDto.IssuedTicketStatus
import com.perfo.backend.entity.Event
import com.perfo.backend.entity.IssuedTicket
import com.perfo.backend.entity.TicketDiscoveryMode
import com.perfo.backend.repository.EventRepository
import com.perfo.backend.repository.IssuedTicketRepository
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.security.access.AccessDeniedException
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import org.springframework.web.multipart.MultipartFile
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.OffsetDateTime
import java.time.ZoneOffset
import java.util.UUID

@Service
class TicketService(
    private val issuedTicketRepository: IssuedTicketRepository,
    private val eventRepository: EventRepository,
    private val notificationBridgeService: NotificationBridgeService,
    private val ticketImageStorageService: TicketImageStorageService,
) {
    companion object {
        private const val MAX_TICKET_IMAGE_SIZE_BYTES = 5 * 1024 * 1024L
    }

    private val placeIdPattern = Regex("^[A-Za-z0-9_-]{3,256}$")

    @Transactional
    fun create(
        request: TicketDto.CreateTicketRequest,
        authenticatedOwnerUserId: String,
    ): TicketDto.TicketResponse {
        return create(request, authenticatedOwnerUserId, null)
    }

    @Transactional
    fun create(
        request: TicketDto.CreateTicketRequest,
        authenticatedOwnerUserId: String,
        file: MultipartFile?,
    ): TicketDto.TicketResponse {
        validateOwner(request.ownerUserId, authenticatedOwnerUserId)
        validatePlaceId(request.googlePlaceId)
        val normalizedImageKey = if (file == null) {
            normalizeImageKey(request.imageKey, "$authenticatedOwnerUserId/")
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

        val linkedEvent = syncLinkedEvent(saved)
        saved.eventId = linkedEvent.id

        if (file == null) {
            val savedWithEvent = issuedTicketRepository.save(saved)
            return savedWithEvent.toResponse(resolveCurrentTime())
        }

        val storedImageKey = uploadImageForCreatedTicket(saved, file)
        saved.imageKey = storedImageKey

        val savedWithImage = try {
            issuedTicketRepository.save(saved)
        } catch (exception: Exception) {
            ticketImageStorageService.deleteTicketImage(storedImageKey)
            throw exception
        }

        return savedWithImage.toResponse(resolveCurrentTime())
    }

    @Transactional(readOnly = true)
    fun findAllByOwnerUserId(
        ownerUserId: String,
        authenticatedOwnerUserId: String,
    ): List<TicketDto.TicketResponse> {
        validateOwner(ownerUserId, authenticatedOwnerUserId)
        val now = resolveCurrentTime()
        val tickets = issuedTicketRepository.findByOwnerUserIdOrderByIdDesc(ownerUserId)
        val eventsById = eventRepository.findAllById(tickets.mapNotNull { it.eventId }.distinct())
            .associateBy { requireNotNull(it.id) }

        return tickets.map { ticket ->
            ticket.toResponse(
                now = now,
                linkedEvent = ticket.eventId?.let(eventsById::get),
            )
        }
    }

    @Transactional
    fun updateTicket(
        ticketId: Long,
        authenticatedOwnerUserId: String,
        request: TicketDto.UpdateTicketRequest,
    ): TicketDto.TicketResponse {
        validatePlaceId(request.googlePlaceId)

        val ticket = findOwnedTicket(ticketId, authenticatedOwnerUserId)
        val nextValidDate = LocalDate.parse(request.validDate)
        val currentStatus = resolveEffectiveStatus(ticket.status, ticket.openAt, ticket.validDate)
        val previousStatus = currentStatus
        val previousImageKey = ticket.imageKey
        val nextImageKey = normalizeImageKey(request.imageKey, "${authenticatedOwnerUserId}/${ticketId}/")
        val nextOpenAt = normalizeOpenAt(request.openAt)
        val nextStatus = try {
            resolveNextStatus(currentStatus, request.status, nextOpenAt, nextValidDate)
        } catch (exception: IllegalArgumentException) {
            cleanupReplacedImage(previousImageKey, nextImageKey)
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
            cleanupReplacedImage(previousImageKey, nextImageKey)
            throw exception
        }

        syncLinkedEvent(saved)
        cleanupPreviousImage(previousImageKey, nextImageKey)

        val savedStatus = resolveEffectiveStatus(saved.status, saved.openAt, saved.validDate)
        if (previousStatus != savedStatus) {
            notifyIssuedStatusTransition(saved, previousStatus, savedStatus)
        }

        return saved.toResponse(resolveCurrentTime())
    }

    @Transactional
    fun updateIssuedStatus(
        ticketId: Long,
        authenticatedOwnerUserId: String,
        nextStatus: IssuedTicketStatus,
    ): TicketDto.TicketResponse {
        val ticket = findOwnedTicket(ticketId, authenticatedOwnerUserId)
        val previousStatus = resolveEffectiveStatus(ticket.status, ticket.openAt, ticket.validDate)
        val resolvedStatus = resolveNextStatus(previousStatus, nextStatus, ticket.openAt, ticket.validDate)
        if (ticket.status == resolvedStatus) {
            return ticket.toResponse(resolveCurrentTime())
        }

        ticket.status = resolvedStatus
        val saved = issuedTicketRepository.save(ticket)
        syncLinkedEvent(saved)
        val savedStatus = resolveEffectiveStatus(saved.status, saved.openAt, saved.validDate)
        notifyIssuedStatusTransition(saved, previousStatus, savedStatus)
        return saved.toResponse(resolveCurrentTime())
    }

    @Scheduled(fixedDelay = 60_000)
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
            syncLinkedEvent(saved)
            notifyIssuedStatusTransition(saved, previousStatus, IssuedTicketStatus.EXPIRED)
        }

        issuedTicketRepository.findByStatusAndOpenAtLessThanEqual(
            IssuedTicketStatus.ISSUING,
            now,
        ).filter { it.validDate >= today }
            .forEach { ticket ->
                val previousStatus = ticket.status
                ticket.status = IssuedTicketStatus.VERIFYING
                val saved = issuedTicketRepository.save(ticket)
                syncLinkedEvent(saved)
                notifyIssuedStatusTransition(saved, previousStatus, IssuedTicketStatus.VERIFYING)
            }
    }

    @Transactional
    fun uploadTicketImage(
        ticketId: Long,
        authenticatedOwnerUserId: String,
        file: MultipartFile,
    ): TicketDto.TicketImageUploadResponse {
        val ticket = findOwnedTicket(ticketId, authenticatedOwnerUserId)
        validateUploadFile(file)
        val detectedImage = detectSupportedImage(file.bytes)
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
        val ticket = findOwnedTicket(ticketId, authenticatedOwnerUserId)
        val imageKey = ticket.imageKey ?: throw IllegalArgumentException("Ticket image not found")
        return ticketImageStorageService.downloadTicketImage(imageKey)
    }

    @Transactional(readOnly = true)
    fun cleanupUploadedTicketImage(
        ticketId: Long,
        authenticatedOwnerUserId: String,
        imageKey: String,
    ) {
        val ticket = findOwnedTicket(ticketId, authenticatedOwnerUserId)
        val normalizedImageKey = normalizeImageKey(imageKey, "${authenticatedOwnerUserId}/${ticketId}/")
            ?: throw IllegalArgumentException("Invalid imageKey")

        if (ticket.imageKey == normalizedImageKey) {
            return
        }

        ticketImageStorageService.deleteTicketImage(normalizedImageKey)
    }

    private fun findOwnedTicket(ticketId: Long, authenticatedOwnerUserId: String): IssuedTicket {
        val normalizedOwnerUserId = authenticatedOwnerUserId.trim()
        require(normalizedOwnerUserId.isNotBlank()) { "Owner user id is required" }

        val ticket = issuedTicketRepository.findById(ticketId)
            .orElseThrow { IllegalArgumentException("Ticket not found") }

        if (ticket.ownerUserId != normalizedOwnerUserId) {
            throw AccessDeniedException("Ticket owner mismatch")
        }

        return ticket
    }

    private fun validateOwner(requestOwnerUserId: String?, authenticatedOwnerUserId: String) {
        val normalizedAuthenticatedOwnerUserId = authenticatedOwnerUserId.trim()
        require(normalizedAuthenticatedOwnerUserId.isNotBlank()) { "Owner user id is required" }
        if (requestOwnerUserId != null && requestOwnerUserId != normalizedAuthenticatedOwnerUserId) {
            throw AccessDeniedException("Ticket owner mismatch")
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

    private fun normalizeImageKey(imageKey: String?, requiredPrefix: String): String? {
        val normalizedImageKey = imageKey?.trim()?.ifBlank { null }
        require(normalizedImageKey == null || !normalizedImageKey.contains("://")) {
            "Invalid imageKey"
        }
        require(normalizedImageKey == null || normalizedImageKey.startsWith(requiredPrefix)) {
            "Invalid imageKey"
        }
        return normalizedImageKey
    }

    private fun cleanupPreviousImage(previousImageKey: String?, nextImageKey: String?) {
        if (previousImageKey != null && previousImageKey != nextImageKey) {
            ticketImageStorageService.deleteTicketImage(previousImageKey)
        }
    }

    private fun cleanupReplacedImage(previousImageKey: String?, nextImageKey: String?) {
        if (nextImageKey != null && nextImageKey != previousImageKey) {
            ticketImageStorageService.deleteTicketImage(nextImageKey)
        }
    }

    private fun resolveNextStatus(
        currentStatus: IssuedTicketStatus,
        requestedStatus: IssuedTicketStatus?,
        openAt: OffsetDateTime?,
        validDate: LocalDate,
    ): IssuedTicketStatus {
        val nextStatus = requestedStatus ?: return currentStatus
        if (currentStatus == nextStatus) {
            return currentStatus
        }

        val now = resolveCurrentTime()
        if (validDate.isBefore(now.toLocalDate())) {
            return IssuedTicketStatus.EXPIRED
        }

        val isOpen = openAt == null || !now.isBefore(openAt)

        val allowed = when {
            nextStatus == IssuedTicketStatus.EXPIRED -> true
            nextStatus == IssuedTicketStatus.INACTIVE &&
                currentStatus != IssuedTicketStatus.EXPIRED -> true
            currentStatus == IssuedTicketStatus.INACTIVE && nextStatus == IssuedTicketStatus.ISSUING -> true
            currentStatus == IssuedTicketStatus.ISSUING && nextStatus == IssuedTicketStatus.VERIFYING && isOpen -> true
            else -> false
        }

        if (!allowed) {
            throw IllegalArgumentException("Invalid issued ticket status transition")
        }

        return nextStatus
    }

    private fun resolveEffectiveStatus(
        storedStatus: IssuedTicketStatus,
        openAt: OffsetDateTime?,
        validDate: LocalDate,
        now: OffsetDateTime = resolveCurrentTime(),
    ): IssuedTicketStatus {
        if (storedStatus == IssuedTicketStatus.EXPIRED || validDate.isBefore(now.toLocalDate())) {
            return IssuedTicketStatus.EXPIRED
        }

        if (storedStatus == IssuedTicketStatus.INACTIVE) {
            return IssuedTicketStatus.INACTIVE
        }

        if (openAt != null && now.isBefore(openAt)) {
            return IssuedTicketStatus.ISSUING
        }

        return IssuedTicketStatus.VERIFYING
    }

    private fun resolveCurrentTime(): OffsetDateTime {
        return TicketingTime.utcNow()
    }

    private fun validateUploadFile(file: MultipartFile) {
        require(!file.isEmpty) { "Ticket image file is required" }
        require(file.size in 1..MAX_TICKET_IMAGE_SIZE_BYTES) { "Ticket image must be 5MB or smaller" }

        val contentType = file.contentType?.lowercase()
        val fileName = file.originalFilename?.lowercase().orEmpty()
        require(contentType != "image/svg+xml" && !fileName.endsWith(".svg")) {
            "Unsupported ticket image format"
        }
    }

    private fun uploadImageForCreatedTicket(ticket: IssuedTicket, file: MultipartFile): String {
        validateUploadFile(file)
        val imageBytes = file.bytes
        val detectedImage = detectSupportedImage(imageBytes)
        val ticketId = requireNotNull(ticket.id) { "Ticket id is missing" }
        val objectKey = "${ticket.ownerUserId}/${ticketId}/${UUID.randomUUID()}.${detectedImage.extension}"

        return ticketImageStorageService.uploadTicketImage(
            objectKey = objectKey,
            bytes = imageBytes,
            contentType = detectedImage.contentType,
        )
    }


    private fun detectSupportedImage(bytes: ByteArray): DetectedTicketImage {
        require(bytes.isNotEmpty()) { "Ticket image file is required" }

        if (bytes.size >= 8 && bytes.sliceArray(0..7).contentEquals(byteArrayOf(
                0x89.toByte(), 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A
            ))
        ) {
            return DetectedTicketImage("image/png", "png")
        }

        if (bytes.size >= 3 && bytes[0] == 0xFF.toByte() && bytes[1] == 0xD8.toByte() && bytes[2] == 0xFF.toByte()) {
            return DetectedTicketImage("image/jpeg", "jpg")
        }

        if (bytes.size >= 12 &&
            bytes.sliceArray(0..3).contentEquals(byteArrayOf(0x52, 0x49, 0x46, 0x46)) &&
            bytes.sliceArray(8..11).contentEquals(byteArrayOf(0x57, 0x45, 0x42, 0x50))
        ) {
            return DetectedTicketImage("image/webp", "webp")
        }

        val prefix = bytes.copyOfRange(0, minOf(bytes.size, 256)).toString(Charsets.UTF_8).trimStart()
        require(!prefix.startsWith("<svg", ignoreCase = true)) { "Unsupported ticket image format" }
        throw IllegalArgumentException("Unsupported ticket image format")
    }

    private fun notifyIssuedStatusTransition(
        ticket: IssuedTicket,
        previousStatus: IssuedTicketStatus,
        nextStatus: IssuedTicketStatus,
    ) {
        if (previousStatus == nextStatus) {
            return
        }

        notificationBridgeService.notifyTicketTransition(
            TicketTransitionNotificationRequest(
                userId = ticket.ownerUserId,
                scope = "issued",
                ticketId = requireNotNull(ticket.id).toString(),
                ticketName = ticket.name,
                targetUrl = "/my-tickets/${ticket.id}/scan",
                statusKey = "issueStatus",
                previousStatus = previousStatus.name,
                nextStatus = nextStatus.name,
            ),
        )
    }

    private fun buildTicketImageUrl(ticketId: Long, imageKey: String?): String? {
        return imageKey?.let { ticketImageStorageService.buildTicketImageUrl(ticketId) }
    }

    private fun syncLinkedEvent(ticket: IssuedTicket): Event {
        val event = ticket.eventId?.let { existingEventId ->
            eventRepository.findById(existingEventId).orElse(null)
        } ?: Event()

        val ticketId = requireNotNull(ticket.id) { "Ticket id is missing" }
        val now = resolveCurrentTime()
        val persistedTotalQuantity = event.totalQuantity
        val soldCount = (persistedTotalQuantity - event.remainingQuantity).coerceAtLeast(0)
        val nextRemainingQuantity = (ticket.totalCount - soldCount).coerceAtLeast(0)

        event.name = ticket.name
        event.venue = ticket.venue
        event.validFrom = resolveValidFrom(ticket, now)
        event.validUntil = resolveValidUntil(ticket)
        event.totalQuantity = ticket.totalCount
        event.remainingQuantity = nextRemainingQuantity
        event.saleOpenAt = resolveSaleOpenAt(ticket, now)
        event.saleCloseAt = resolveSaleCloseAt(ticket)
        event.maxPerUser = ticket.maxPerUser
        event.allowDuplicate = ticket.allowDuplicate
        event.active = ticket.status == IssuedTicketStatus.ISSUING || ticket.status == IssuedTicketStatus.VERIFYING
        event.discoveryMode = ticket.discoveryMode
        event.issuedTicketId = ticketId
        event.nextTicketNumber = event.nextTicketNumber.coerceAtLeast(1)

        val savedEvent = eventRepository.save(event)
        ticket.eventId = savedEvent.id
        return savedEvent
    }

    private fun resolveValidFrom(ticket: IssuedTicket, now: OffsetDateTime): LocalDateTime {
        return ticket.openAt?.withOffsetSameInstant(ZoneOffset.UTC)?.toLocalDateTime()
            ?: now.toLocalDateTime()
    }

    private fun resolveValidUntil(ticket: IssuedTicket): LocalDateTime {
        return ticket.validDate.plusDays(1).atStartOfDay().minusSeconds(1)
    }

    private fun resolveSaleOpenAt(ticket: IssuedTicket, now: OffsetDateTime): Instant {
        return now.toInstant()
    }

    private fun resolveSaleCloseAt(ticket: IssuedTicket): Instant {
        return ticket.validDate.plusDays(1).atStartOfDay().toInstant(ZoneOffset.UTC)
    }

    private fun IssuedTicket.toResponse(
        now: OffsetDateTime = resolveCurrentTime(),
        linkedEvent: Event? = null,
    ): TicketDto.TicketResponse {
        val ticketId = requireNotNull(id) { "Ticket id is missing" }
        return TicketDto.TicketResponse(
            id = ticketId,
            name = name,
            venue = venue,
            googlePlaceId = googlePlaceId,
            detailAddress = detailAddress,
            validDate = validDate.toString(),
            openAt = openAt?.toString(),
            imageKey = imageKey,
            imageUrl = buildTicketImageUrl(ticketId, imageKey),
            totalCount = totalCount,
            allowDuplicate = allowDuplicate,
            maxPerUser = maxPerUser,
            discoveryMode = discoveryMode,
            status = resolveEffectiveStatus(status, openAt, validDate, now),
            issuedCount = resolveIssuedCount(this, linkedEvent),
            ownerUserId = ownerUserId,
            eventId = eventId,
            publicBookingPath = eventId?.let { "/events/$it" },
            publicBookingUrl = null,
        )
    }

    private fun resolveIssuedCount(ticket: IssuedTicket, linkedEvent: Event? = null): Int {
        val resolvedEvent = linkedEvent ?: ticket.eventId?.let { eventRepository.findById(it).orElse(null) }
        if (resolvedEvent != null) {
            return (resolvedEvent.totalQuantity - resolvedEvent.remainingQuantity).coerceIn(0, ticket.totalCount)
        }

        return ticket.issuedCount.coerceIn(0, ticket.totalCount)
    }

    private data class DetectedTicketImage(
        val contentType: String,
        val extension: String,
    )
}
