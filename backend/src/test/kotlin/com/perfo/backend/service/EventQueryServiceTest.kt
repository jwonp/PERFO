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
import java.time.LocalDate
import java.time.Instant
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
    @DisplayName("목록 조회는 LISTED + active=true 이벤트만 반환한다")
    fun listPublicEvents_returnsListedOnly() {
        given(eventRepository.findByActiveTrueAndDiscoveryModeOrderBySaleOpenAtAscIdAsc(TicketDiscoveryMode.LISTED))
            .willReturn(
                listOf(
                    event(id = 11L, discoveryMode = TicketDiscoveryMode.LISTED, active = true),
                ),
            )

        val result = eventQueryService.listPublicEvents()

        assertThat(result).hasSize(1)
        assertThat(result.single().id).isEqualTo(11L)
        assertThat(result.single().discoveryMode).isEqualTo(TicketDiscoveryMode.LISTED)
    }

    @Test
    @DisplayName("연결된 발급 티켓이 있으면 티켓 디자인용 메타데이터를 함께 반환한다")
    fun listPublicEvents_includesLinkedTicketMetadata() {
        given(eventRepository.findByActiveTrueAndDiscoveryModeOrderBySaleOpenAtAscIdAsc(TicketDiscoveryMode.LISTED))
            .willReturn(listOf(event(id = 11L, discoveryMode = TicketDiscoveryMode.LISTED, active = true).apply {
                issuedTicketId = 101L
            }))
        given(issuedTicketRepository.findAllById(listOf(101L)))
            .willReturn(listOf(issuedTicket(id = 101L).apply {
                status = TicketDto.IssuedTicketStatus.ISSUING
            }))
        given(ticketImageStorageService.buildTicketImageUrl(101L))
            .willReturn("/api/tickets/101/image")

        val result = eventQueryService.listPublicEvents()

        assertThat(result.single().issuedTicketId).isEqualTo(101L)
        assertThat(result.single().detailAddress).isEqualTo("잠실 올림픽로 424")
        assertThat(result.single().imageUrl).isEqualTo("/api/tickets/101/image")
        assertThat(result.single().validDate).isEqualTo("2026-08-15")
    }

    @Test
    @DisplayName("연결된 발급 티켓이 INACTIVE면 공개 목록에서 제외한다")
    fun listPublicEvents_filtersInactiveLinkedTickets() {
        given(eventRepository.findByActiveTrueAndDiscoveryModeOrderBySaleOpenAtAscIdAsc(TicketDiscoveryMode.LISTED))
            .willReturn(listOf(event(id = 11L, discoveryMode = TicketDiscoveryMode.LISTED, active = true).apply {
                issuedTicketId = 101L
            }))
        given(issuedTicketRepository.findAllById(listOf(101L)))
            .willReturn(listOf(issuedTicket(id = 101L).apply {
                status = TicketDto.IssuedTicketStatus.INACTIVE
            }))

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
    @DisplayName("판매 상태는 재고와 활성 상태를 기준으로 파생한다")
    fun getPublicEvent_resolvesSaleStatus() {
        given(eventRepository.findById(20L))
            .willReturn(Optional.of(event(id = 20L, remainingQuantity = 0, active = true)))

        val result = eventQueryService.getPublicEvent(20L)

        assertThat(result.saleStatus).isEqualTo(EventDto.SaleStatus.SOLD_OUT)
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
        saleOpenAt = Instant.now().minusSeconds(3600),
        saleCloseAt = Instant.now().plusSeconds(3600),
        maxPerUser = 2,
        allowDuplicate = false,
        nextTicketNumber = 1,
        active = active,
        discoveryMode = discoveryMode,
    )

    private fun issuedTicket(id: Long) = IssuedTicket(
        id = id,
        ownerUserId = "user-1",
        name = "PERFO Ticket",
        venue = "KSPO Dome",
        googlePlaceId = "place-1",
        detailAddress = "잠실 올림픽로 424",
        validDate = LocalDate.parse("2026-08-15"),
        openAt = OffsetDateTime.parse("2026-08-15T10:00:00+09:00"),
        imageKey = "user-1/101/poster.png",
        totalCount = 100,
        allowDuplicate = false,
        maxPerUser = 2,
        discoveryMode = TicketDiscoveryMode.LISTED,
    )
}
