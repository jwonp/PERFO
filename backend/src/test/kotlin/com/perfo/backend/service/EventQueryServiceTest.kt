package com.perfo.backend.service

import com.perfo.backend.dto.EventDto
import com.perfo.backend.dto.TicketDto
import com.perfo.backend.entity.Event
import com.perfo.backend.entity.IssuedTicket
import com.perfo.backend.entity.TicketDiscoveryMode
import com.perfo.backend.repository.EventRepository
import com.perfo.backend.repository.IssuedTicketRepository
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.BDDMockito.given
import org.mockito.junit.jupiter.MockitoExtension
import java.time.Instant
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.OffsetDateTime
import java.util.Optional

@ExtendWith(MockitoExtension::class)
class EventQueryServiceTest {

    @org.mockito.Mock
    private lateinit var eventRepository: EventRepository

    @org.mockito.Mock
    private lateinit var issuedTicketRepository: IssuedTicketRepository

    @org.mockito.Mock
    private lateinit var ticketImageStorageService: TicketImageStorageService

    @org.mockito.InjectMocks
    private lateinit var eventQueryService: EventQueryService

    @Test
    @DisplayName("LISTED + ISSUING 티켓은 연결 이벤트가 inactive여도 공개 목록에 노출한다")
    fun listPublicEvents_returnsListedIssuingTicketEvenWhenEventInactive() {
        val ticket = issuedTicket(id = 101L, status = TicketDto.IssuedTicketStatus.ISSUING, eventId = 11L)
        given(issuedTicketRepository.findByDiscoveryMode(TicketDiscoveryMode.LISTED))
            .willReturn(listOf(ticket))
        given(eventRepository.findAllById(listOf(11L)))
            .willReturn(listOf(event(id = 11L, discoveryMode = TicketDiscoveryMode.LISTED, active = false).apply {
                issuedTicketId = 101L
            }))
        given(eventRepository.findByIssuedTicketIdIn(listOf(101L)))
            .willReturn(listOf(event(id = 11L, discoveryMode = TicketDiscoveryMode.LISTED, active = false).apply {
                issuedTicketId = 101L
            }))
        given(ticketImageStorageService.buildPublicTicketImageUrl(101L))
            .willReturn("/api/public/tickets/101/image")

        val result = eventQueryService.listPublicEvents()

        assertThat(result).hasSize(1)
        assertThat(result.single().id).isEqualTo(11L)
        assertThat(result.single().issuedTicketId).isEqualTo(101L)
        assertThat(result.single().saleStatus).isNotEqualTo(EventDto.SaleStatus.INACTIVE)
        assertThat(result.single().imageUrl).isEqualTo("/api/public/tickets/101/image")
    }

    @Test
    @DisplayName("LISTED + VERIFYING 티켓은 연결 이벤트가 없어도 기본 카드 응답을 만든다")
    fun listPublicEvents_returnsListedVerifyingTicketWithoutLinkedEvent() {
        val ticket = issuedTicket(
            id = 102L,
            status = TicketDto.IssuedTicketStatus.VERIFYING,
            eventId = null,
            openAt = OffsetDateTime.parse("2026-08-15T10:00:00Z"),
        )
        given(issuedTicketRepository.findByDiscoveryMode(TicketDiscoveryMode.LISTED))
            .willReturn(listOf(ticket))
        given(eventRepository.findAllById(emptyList<Long>()))
            .willReturn(emptyList())
        given(eventRepository.findByIssuedTicketIdIn(listOf(102L)))
            .willReturn(emptyList())

        val result = eventQueryService.listPublicEvents()

        assertThat(result).hasSize(1)
        assertThat(result.single().id).isEqualTo(102L)
        assertThat(result.single().issuedTicketId).isEqualTo(102L)
        assertThat(result.single().publicBookingPath).isEqualTo("/events/102")
        assertThat(result.single().saleStatus).isNotEqualTo(EventDto.SaleStatus.INACTIVE)
    }

    @Test
    @DisplayName("LINK_ONLY 티켓은 여전히 공개 목록에서 제외한다")
    fun listPublicEvents_excludesLinkOnlyTickets() {
        given(issuedTicketRepository.findByDiscoveryMode(TicketDiscoveryMode.LISTED))
            .willReturn(emptyList())

        val result = eventQueryService.listPublicEvents()

        assertThat(result).isEmpty()
    }

    @Test
    @DisplayName("연결된 발급 티켓이 INACTIVE면 공개 목록에서 제외한다")
    fun listPublicEvents_filtersInactiveLinkedTickets() {
        given(issuedTicketRepository.findByDiscoveryMode(TicketDiscoveryMode.LISTED))
            .willReturn(
                listOf(
                    issuedTicket(id = 101L, status = TicketDto.IssuedTicketStatus.INACTIVE),
                ),
            )
        given(eventRepository.findAllById(emptyList<Long>()))
            .willReturn(emptyList())
        given(eventRepository.findByIssuedTicketIdIn(listOf(101L)))
            .willReturn(emptyList())

        val result = eventQueryService.listPublicEvents()

        assertThat(result).isEmpty()
    }

    @Test
    @DisplayName("상세 조회는 LINK_ONLY 이벤트도 반환한다")
    fun getPublicEvent_returnsLinkOnlyDetail() {
        given(eventRepository.findById(15L))
            .willReturn(Optional.of(event(id = 15L, discoveryMode = TicketDiscoveryMode.LINK_ONLY, active = true)))

        val result = eventQueryService.getPublicEvent(15L)

        assertThat(result.id).isEqualTo(15L)
        assertThat(result.discoveryMode).isEqualTo(TicketDiscoveryMode.LINK_ONLY)
        assertThat(result.publicBookingPath).isEqualTo("/events/15")
    }

    @Test
    @DisplayName("상세 조회는 연결 티켓 기준으로 inactive projection도 판매 가능 상태를 계산한다")
    fun getPublicEvent_prefersLinkedTicketStatusOverInactiveProjection() {
        given(eventRepository.findById(20L))
            .willReturn(
                Optional.of(
                    event(id = 20L, remainingQuantity = 3, active = false).apply {
                        issuedTicketId = 101L
                    },
                ),
            )
        given(issuedTicketRepository.findById(101L))
            .willReturn(
                Optional.of(
                    issuedTicket(
                        id = 101L,
                        status = TicketDto.IssuedTicketStatus.VERIFYING,
                        eventId = 20L,
                    ),
                ),
            )

        val result = eventQueryService.getPublicEvent(20L)

        assertThat(result.saleStatus).isNotEqualTo(EventDto.SaleStatus.INACTIVE)
    }

    @Test
    @DisplayName("상세 조회 대상이 없으면 예외를 던진다")
    fun getPublicEvent_notFound_throws() {
        given(eventRepository.findById(99L)).willReturn(Optional.empty())

        assertThatThrownBy { eventQueryService.getPublicEvent(99L) }
            .isInstanceOf(IllegalArgumentException::class.java)
            .hasMessage("Event not found")
    }

    private fun event(
        id: Long,
        discoveryMode: TicketDiscoveryMode = TicketDiscoveryMode.LISTED,
        active: Boolean,
        remainingQuantity: Int = 10,
    ) = Event(
        id = id,
        name = "PERFO Event",
        venue = "KSPO Dome",
        validFrom = LocalDateTime.parse("2026-08-15T10:00:00"),
        validUntil = LocalDateTime.parse("2026-08-15T18:00:00"),
        totalQuantity = 100,
        remainingQuantity = remainingQuantity,
        saleOpenAt = Instant.parse("2026-08-01T10:00:00Z"),
        saleCloseAt = Instant.parse("2026-08-15T09:00:00Z"),
        maxPerUser = 2,
        allowDuplicate = false,
        nextTicketNumber = 1,
        active = active,
        discoveryMode = discoveryMode,
    )

    private fun issuedTicket(
        id: Long,
        status: TicketDto.IssuedTicketStatus,
        eventId: Long? = null,
        openAt: OffsetDateTime = OffsetDateTime.parse("2026-08-01T10:00:00Z"),
    ) = IssuedTicket(
        id = id,
        ownerUserId = "user-1",
        name = "PERFO Ticket",
        venue = "KSPO Dome",
        googlePlaceId = "place-1",
        detailAddress = "잠실 올림픽로 424",
        validDate = LocalDate.now().plusDays(30),
        openAt = openAt,
        imageKey = "user-1/$id/poster.png",
        totalCount = 100,
        allowDuplicate = false,
        maxPerUser = 2,
        discoveryMode = TicketDiscoveryMode.LISTED,
        eventId = eventId,
        status = status,
        issuedCount = 4,
    )
}
