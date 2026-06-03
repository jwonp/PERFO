package com.perfo.backend.service

import com.perfo.backend.dto.TicketDto
import com.perfo.backend.entity.BookingMode
import com.perfo.backend.entity.Event
import com.perfo.backend.entity.EventItem
import com.perfo.backend.repository.BookingDraftItemRepository
import com.perfo.backend.repository.BookingDraftRepository
import com.perfo.backend.repository.EventItemRepository
import com.perfo.backend.repository.EventRepository
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.ActiveProfiles
import java.time.Instant
import java.time.LocalDateTime

@SpringBootTest
@ActiveProfiles("test")
class BookingDraftServiceTest {

    @Autowired
    private lateinit var eventRepository: EventRepository

    @Autowired
    private lateinit var eventItemRepository: EventItemRepository

    @Autowired
    private lateinit var bookingDraftRepository: BookingDraftRepository

    @Autowired
    private lateinit var bookingDraftItemRepository: BookingDraftItemRepository

    @Autowired
    private lateinit var bookingDraftService: BookingDraftService

    @BeforeEach
    fun setUp() {
        bookingDraftItemRepository.deleteAll()
        bookingDraftRepository.deleteAll()
        eventItemRepository.deleteAll()
        eventRepository.deleteAll()
    }

    @Test
    @DisplayName("ITEMIZED 이벤트 draft를 사용자별 이벤트별로 저장하고 조회한다")
    fun saveDraft_upsertsUserEventDraft() {
        val event = eventRepository.save(itemizedEvent())
        val photoCard = eventItemRepository.save(item(event.id!!, "Photo card", sortOrder = 1))
        val keyring = eventItemRepository.save(item(event.id!!, "Keyring", sortOrder = 2))

        val first = bookingDraftService.saveDraft(
            eventId = event.id!!,
            userId = 30L,
            request = TicketDto.BookingDraftSaveRequest(
                items = listOf(TicketDto.TicketingItemRequest(photoCard.id!!, 2)),
            ),
        )
        val second = bookingDraftService.saveDraft(
            eventId = event.id!!,
            userId = 30L,
            request = TicketDto.BookingDraftSaveRequest(
                items = listOf(TicketDto.TicketingItemRequest(keyring.id!!, 1)),
            ),
        )
        val loaded = bookingDraftService.getDraft(event.id!!, 30L)

        assertThat(first.version).isEqualTo(1)
        assertThat(second.version).isEqualTo(2)
        assertThat(loaded).isEqualTo(second)
        assertThat(bookingDraftRepository.findAll()).hasSize(1)
        assertThat(bookingDraftItemRepository.findAll()).hasSize(1)
    }

    @Test
    @DisplayName("draft 저장은 빈 items를 거부한다")
    fun saveDraft_emptyItemsRejected() {
        val event = eventRepository.save(itemizedEvent())

        assertThatThrownBy {
            bookingDraftService.saveDraft(
                eventId = event.id!!,
                userId = 31L,
                request = TicketDto.BookingDraftSaveRequest(items = emptyList()),
            )
        }.isInstanceOf(IllegalArgumentException::class.java)
    }

    @Test
    @DisplayName("draft 저장은 SIMPLE 이벤트를 거부한다")
    fun saveDraft_simpleEventRejected() {
        val event = eventRepository.save(itemizedEvent().apply { bookingMode = BookingMode.SIMPLE })

        assertThatThrownBy {
            bookingDraftService.saveDraft(
                eventId = event.id!!,
                userId = 32L,
                request = TicketDto.BookingDraftSaveRequest(
                    items = listOf(TicketDto.TicketingItemRequest(eventItemId = 1L, quantity = 1)),
                ),
            )
        }.isInstanceOf(IllegalArgumentException::class.java)
            .hasMessage("Draft is available only for itemized events")
    }

    @Test
    @DisplayName("draft 저장은 다른 이벤트 item 또는 비활성 item을 거부한다")
    fun saveDraft_invalidOrInactiveItemsRejected() {
        val event = eventRepository.save(itemizedEvent())
        val otherEvent = eventRepository.save(itemizedEvent())
        val otherItem = eventItemRepository.save(item(otherEvent.id!!, "Other event item", sortOrder = 1))
        val inactiveItem = eventItemRepository.save(item(event.id!!, "Inactive item", sortOrder = 2, active = false))

        assertThatThrownBy {
            bookingDraftService.saveDraft(
                eventId = event.id!!,
                userId = 33L,
                request = TicketDto.BookingDraftSaveRequest(
                    items = listOf(TicketDto.TicketingItemRequest(eventItemId = otherItem.id!!, quantity = 1)),
                ),
            )
        }.isInstanceOf(IllegalArgumentException::class.java)
            .hasMessage("Draft contains invalid event items")

        assertThatThrownBy {
            bookingDraftService.saveDraft(
                eventId = event.id!!,
                userId = 33L,
                request = TicketDto.BookingDraftSaveRequest(
                    items = listOf(TicketDto.TicketingItemRequest(eventItemId = inactiveItem.id!!, quantity = 1)),
                ),
            )
        }.isInstanceOf(IllegalArgumentException::class.java)
            .hasMessage("Draft contains invalid event items")
    }

    @Test
    @DisplayName("cleanupExpiredDrafts는 종료 후 30일이 지난 draft를 삭제한다")
    fun cleanupExpiredDrafts_deletesDraftsAfterTtl() {
        val expiredEvent = eventRepository.save(itemizedEvent().apply {
            saleCloseAt = Instant.now().minusSeconds(31L * 24L * 60L * 60L)
        })
        val activeEvent = eventRepository.save(itemizedEvent().apply {
            saleCloseAt = Instant.now().plusSeconds(24L * 60L * 60L)
        })
        val expiredItem = eventItemRepository.save(item(expiredEvent.id!!, "Expired item", sortOrder = 1))
        val activeItem = eventItemRepository.save(item(activeEvent.id!!, "Active item", sortOrder = 1))
        bookingDraftService.saveDraft(
            eventId = expiredEvent.id!!,
            userId = 34L,
            request = TicketDto.BookingDraftSaveRequest(listOf(TicketDto.TicketingItemRequest(expiredItem.id!!, 1))),
        )
        bookingDraftService.saveDraft(
            eventId = activeEvent.id!!,
            userId = 34L,
            request = TicketDto.BookingDraftSaveRequest(listOf(TicketDto.TicketingItemRequest(activeItem.id!!, 1))),
        )

        val deleted = bookingDraftService.cleanupExpiredDrafts()

        assertThat(deleted).isEqualTo(1)
        assertThat(bookingDraftRepository.findAll()).hasSize(1)
        assertThat(bookingDraftItemRepository.findAll()).hasSize(1)
    }

    private fun itemizedEvent(): Event {
        val now = Instant.now()
        return Event(
            name = "Itemized Event",
            venue = "KSPO Dome",
            validFrom = LocalDateTime.now().plusDays(1),
            validUntil = LocalDateTime.now().plusDays(1).plusHours(3),
            totalQuantity = 0,
            remainingQuantity = 0,
            saleOpenAt = now.minusSeconds(60),
            saleCloseAt = now.plusSeconds(3600),
            maxPerUser = 1,
            allowDuplicate = true,
            active = true,
            bookingMode = BookingMode.ITEMIZED,
        )
    }

    private fun item(eventId: Long, name: String, sortOrder: Int, active: Boolean = true): EventItem {
        return EventItem(
            eventId = eventId,
            name = name,
            totalQuantity = 10,
            remainingQuantity = 10,
            maxPerUser = 3,
            active = active,
            sortOrder = sortOrder,
        )
    }
}
