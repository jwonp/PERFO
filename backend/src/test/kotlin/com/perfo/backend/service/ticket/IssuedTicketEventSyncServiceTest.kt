package com.perfo.backend.service.ticket

import com.perfo.backend.dto.TicketDto.IssuedTicketStatus
import com.perfo.backend.entity.Event
import com.perfo.backend.entity.IssuedTicket
import com.perfo.backend.entity.TicketDiscoveryMode
import com.perfo.backend.repository.EventRepository
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.BDDMockito.given
import org.mockito.junit.jupiter.MockitoExtension
import org.mockito.kotlin.any
import java.time.Instant
import java.time.LocalDate
import java.time.OffsetDateTime

@ExtendWith(MockitoExtension::class)
class IssuedTicketEventSyncServiceTest {

    @org.mockito.Mock
    private lateinit var eventRepository: EventRepository

    @org.mockito.InjectMocks
    private lateinit var eventSyncService: IssuedTicketEventSyncService

    @Test
    @DisplayName("이벤트 동기화 - saleOpenAt은 ticket.openAt 기준으로 반영한다")
    fun syncLinkedEventUsesTicketOpenAtForSaleOpenAt() {
        val ticket = issuedTicket(
            id = 1L,
            ownerUserId = "owner-1",
            openAt = OffsetDateTime.parse("2026-08-15T08:00:00Z"),
            status = IssuedTicketStatus.ISSUING,
        )
        var syncedEvent: Event? = null
        given(eventRepository.save(any())).willAnswer {
            val event = it.arguments[0] as Event
            syncedEvent = event
            event.id = event.id ?: 11L
            event
        }

        val savedEvent = eventSyncService.syncLinkedEvent(ticket, OffsetDateTime.parse("2026-08-10T00:00:00Z"))

        assertThat(savedEvent.id).isEqualTo(11L)
        assertThat(syncedEvent?.saleOpenAt).isEqualTo(Instant.parse("2026-08-15T08:00:00Z"))
        assertThat(ticket.eventId).isEqualTo(11L)
    }

    @Test
    @DisplayName("이벤트 동기화 - effective status가 비공개면 active를 false로 둔다")
    fun syncLinkedEventResolvesActiveFromEffectiveStatus() {
        val ticket = issuedTicket(
            id = 1L,
            ownerUserId = "owner-1",
            status = IssuedTicketStatus.INACTIVE,
            openAt = OffsetDateTime.parse("2026-08-15T08:00:00Z"),
        )
        var syncedEvent: Event? = null
        given(eventRepository.save(any())).willAnswer {
            val event = it.arguments[0] as Event
            syncedEvent = event
            event.id = event.id ?: 11L
            event
        }

        eventSyncService.syncLinkedEvent(ticket, OffsetDateTime.parse("2026-08-10T00:00:00Z"))

        assertThat(syncedEvent?.active).isFalse()
        assertThat(syncedEvent?.issuedTicketId).isEqualTo(1L)
    }

    private fun issuedTicket(
        id: Long,
        ownerUserId: String,
        status: IssuedTicketStatus,
        openAt: OffsetDateTime,
    ) = IssuedTicket(
        id = id,
        ownerUserId = ownerUserId,
        name = "PERFO Test Ticket",
        venue = "올림픽공원 체조경기장",
        googlePlaceId = "ChIJPLACE",
        detailAddress = "2층 A게이트 앞",
        validDate = LocalDate.parse("2026-08-15"),
        openAt = openAt,
        totalCount = 100,
        allowDuplicate = false,
        maxPerUser = 1,
        discoveryMode = TicketDiscoveryMode.LISTED,
        status = status,
        issuedCount = 0,
    )
}
