package com.perfo.backend.service

import com.perfo.backend.dto.TicketDto
import com.perfo.backend.entity.BookingDraft
import com.perfo.backend.entity.BookingDraftItem
import com.perfo.backend.entity.BookingMode
import com.perfo.backend.repository.BookingDraftItemRepository
import com.perfo.backend.repository.BookingDraftRepository
import com.perfo.backend.repository.EventItemRepository
import com.perfo.backend.repository.EventRepository
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Duration

@Service
class BookingDraftService(
    private val eventRepository: EventRepository,
    private val eventItemRepository: EventItemRepository,
    private val bookingDraftRepository: BookingDraftRepository,
    private val bookingDraftItemRepository: BookingDraftItemRepository,
    private val databaseTimeService: DatabaseTimeService,
) {
    @Transactional(readOnly = true)
    fun getDraft(eventId: Long, userId: Long): TicketDto.BookingDraftResponse {
        val event = eventRepository.findById(eventId).orElseThrow { IllegalArgumentException("Event not found") }
        require(event.bookingMode == BookingMode.ITEMIZED) { "Draft is available only for itemized events" }
        val draft = bookingDraftRepository.findByEventIdAndUserId(eventId, userId)
            ?: return TicketDto.BookingDraftResponse(eventId = eventId, version = 0, items = emptyList())
        return TicketDto.BookingDraftResponse(
            eventId = eventId,
            version = draft.version,
            items = bookingDraftItemRepository.findByDraftIdOrderByIdAsc(requireNotNull(draft.id)).map {
                TicketDto.TicketingItemRequest(eventItemId = it.eventItemId, quantity = it.quantity)
            },
        )
    }

    @Transactional
    fun saveDraft(
        eventId: Long,
        userId: Long,
        request: TicketDto.BookingDraftSaveRequest,
    ): TicketDto.BookingDraftResponse {
        val normalizedItems = normalizeItems(request.items)
        val event = eventRepository.findById(eventId).orElseThrow { IllegalArgumentException("Event not found") }
        require(event.bookingMode == BookingMode.ITEMIZED) { "Draft is available only for itemized events" }
        val eventItems = eventItemRepository.findAllById(normalizedItems.map { it.eventItemId }).associateBy { it.id }
        require(eventItems.size == normalizedItems.size && eventItems.values.all { it.eventId == eventId && it.active }) {
            "Draft contains invalid event items"
        }

        val draft = bookingDraftRepository.findByEventIdAndUserId(eventId, userId)
            ?.also { it.version += 1 }
            ?: BookingDraft(eventId = eventId, userId = userId, version = 1)
        val savedDraft = bookingDraftRepository.save(draft)
        val draftId = requireNotNull(savedDraft.id)
        bookingDraftItemRepository.deleteByDraftId(draftId)
        bookingDraftItemRepository.flush()
        bookingDraftItemRepository.saveAll(
            normalizedItems.map {
                BookingDraftItem(
                    draftId = draftId,
                    eventItemId = it.eventItemId,
                    quantity = it.quantity,
                )
            },
        )
        return TicketDto.BookingDraftResponse(eventId = eventId, version = savedDraft.version, items = normalizedItems)
    }

    @Scheduled(cron = "\${app.booking-drafts.cleanup-cron:0 20 4 * * *}")
    @Transactional
    fun cleanupExpiredDrafts(): Int {
        val cutoff = databaseTimeService.currentInstant().minus(Duration.ofDays(30))
        bookingDraftItemRepository.deleteExpiredDraftItems(cutoff)
        return bookingDraftRepository.deleteExpiredDrafts(cutoff)
    }

    private fun normalizeItems(items: List<TicketDto.TicketingItemRequest>): List<TicketDto.TicketingItemRequest> {
        require(items.isNotEmpty()) { "items must not be empty" }
        val merged = items.groupBy { it.eventItemId }.map { (eventItemId, groupedItems) ->
            TicketDto.TicketingItemRequest(
                eventItemId = eventItemId,
                quantity = groupedItems.sumOf { it.quantity },
            )
        }.sortedBy { it.eventItemId }
        require(merged.all { it.eventItemId > 0 && it.quantity > 0 }) { "items must contain positive ids and quantities" }
        return merged
    }
}
