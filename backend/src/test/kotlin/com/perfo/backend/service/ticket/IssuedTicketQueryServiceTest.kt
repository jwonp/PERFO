package com.perfo.backend.service.ticket

import com.perfo.backend.dto.TicketDto.IssuedTicketStatus
import com.perfo.backend.entity.Event
import com.perfo.backend.entity.IssuedTicket
import com.perfo.backend.entity.TicketDiscoveryMode
import com.perfo.backend.repository.EventRepository
import com.perfo.backend.repository.IssuedTicketRepository
import com.perfo.backend.service.TicketImageStorageService
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.BDDMockito.given
import org.mockito.BDDMockito.then
import org.mockito.Mockito.never
import org.mockito.junit.jupiter.MockitoExtension
import org.mockito.kotlin.any
import org.springframework.security.access.AccessDeniedException
import java.time.LocalDate
import java.time.OffsetDateTime
import java.time.ZoneOffset
import java.util.Optional

@ExtendWith(MockitoExtension::class)
class IssuedTicketQueryServiceTest {

    @org.mockito.Mock
    private lateinit var issuedTicketRepository: IssuedTicketRepository

    @org.mockito.Mock
    private lateinit var eventRepository: EventRepository

    @org.mockito.Mock
    private lateinit var ticketImageStorageService: TicketImageStorageService

    @org.mockito.InjectMocks
    private lateinit var queryService: IssuedTicketQueryService

    @Test
    @DisplayName("소유자별 티켓 조회 - 요청한 소유자의 티켓만 최신순으로 반환한다")
    fun findAllByOwnerUserIdReturnsOwnerTicketsOnly() {
        val latest = issuedTicket(id = 2L, ownerUserId = "owner-1", name = "Latest Ticket")
        val first = issuedTicket(id = 1L, ownerUserId = "owner-1", name = "First Ticket")
        given(issuedTicketRepository.findByOwnerUserIdOrderByIdDesc("owner-1")).willReturn(listOf(latest, first))
        given(eventRepository.findAllById(emptyList<Long>())).willReturn(emptyList())

        val tickets = queryService.findAllByOwnerUserId("owner-1", "owner-1")

        assertThat(tickets).extracting<Long> { it.id }.containsExactly(2L, 1L)
        assertThat(tickets).allMatch { it.ownerUserId == "owner-1" }
    }

    @Test
    @DisplayName("소유자별 티켓 조회 - openAt이 지나면 저장 상태와 무관하게 즉시 VERIFYING으로 계산한다")
    fun findAllByOwnerUserIdResolvesVerifyingImmediatelyAfterOpenAt() {
        val ticket = issuedTicket(
            id = 3L,
            ownerUserId = "owner-1",
            status = IssuedTicketStatus.ISSUING,
            validDate = LocalDate.now(ZoneOffset.UTC),
            openAt = OffsetDateTime.now(ZoneOffset.UTC).minusSeconds(1),
        )
        given(issuedTicketRepository.findByOwnerUserIdOrderByIdDesc("owner-1")).willReturn(listOf(ticket))
        given(eventRepository.findAllById(emptyList<Long>())).willReturn(emptyList())

        val tickets = queryService.findAllByOwnerUserId("owner-1", "owner-1")

        assertThat(tickets.single().status).isEqualTo(IssuedTicketStatus.VERIFYING)
    }

    @Test
    @DisplayName("소유자별 티켓 조회 - 유효 날짜가 지나면 즉시 EXPIRED로 계산한다")
    fun findAllByOwnerUserIdResolvesExpiredImmediatelyAfterValidDate() {
        val ticket = issuedTicket(
            id = 4L,
            ownerUserId = "owner-1",
            status = IssuedTicketStatus.VERIFYING,
            validDate = LocalDate.now(ZoneOffset.UTC).minusDays(1),
            openAt = OffsetDateTime.now(ZoneOffset.UTC).minusHours(1),
        )
        given(issuedTicketRepository.findByOwnerUserIdOrderByIdDesc("owner-1")).willReturn(listOf(ticket))
        given(eventRepository.findAllById(emptyList<Long>())).willReturn(emptyList())

        val tickets = queryService.findAllByOwnerUserId("owner-1", "owner-1")

        assertThat(tickets.single().status).isEqualTo(IssuedTicketStatus.EXPIRED)
    }

    @Test
    @DisplayName("소유자별 티켓 조회 - 연결 이벤트는 batch 조회로 issuedCount를 계산한다")
    fun findAllByOwnerUserIdResolvesIssuedCountWithoutNPlusOne() {
        val latest = issuedTicket(id = 2L, ownerUserId = "owner-1", eventId = 12L, totalCount = 100)
        val first = issuedTicket(id = 1L, ownerUserId = "owner-1", eventId = 11L, totalCount = 50)
        given(issuedTicketRepository.findByOwnerUserIdOrderByIdDesc("owner-1")).willReturn(listOf(latest, first))
        given(eventRepository.findAllById(listOf(12L, 11L))).willReturn(
            listOf(
                event(id = 12L, totalQuantity = 100, remainingQuantity = 60),
                event(id = 11L, totalQuantity = 50, remainingQuantity = 10),
            ),
        )

        val tickets = queryService.findAllByOwnerUserId("owner-1", "owner-1")

        assertThat(tickets).extracting<Int> { it.issuedCount }.containsExactly(40, 40)
        then(eventRepository).should().findAllById(listOf(12L, 11L))
        then(eventRepository).should(never()).findById(any())
    }

    @Test
    @DisplayName("발행 티켓 조회/수정은 소유자가 아니면 거부한다")
    fun findOwnedTicketRejectsOtherOwner() {
        given(issuedTicketRepository.findById(7L)).willReturn(Optional.of(issuedTicket(id = 7L, ownerUserId = "owner-2")))

        assertThatThrownBy { queryService.findOwnedTicket(7L, "owner-1") }
            .isInstanceOf(AccessDeniedException::class.java)
            .hasMessage("Ticket owner mismatch")
    }

    private fun issuedTicket(
        id: Long,
        ownerUserId: String,
        name: String = "PERFO Test Ticket",
        status: IssuedTicketStatus = IssuedTicketStatus.INACTIVE,
        discoveryMode: TicketDiscoveryMode = TicketDiscoveryMode.LISTED,
        eventId: Long? = null,
        totalCount: Int = 100,
        validDate: LocalDate = LocalDate.parse("2026-08-15"),
        openAt: OffsetDateTime = OffsetDateTime.parse("2026-08-15T08:00:00Z"),
    ) = IssuedTicket(
        id = id,
        ownerUserId = ownerUserId,
        name = name,
        venue = "올림픽공원 체조경기장",
        googlePlaceId = "ChIJPLACE",
        detailAddress = "2층 A게이트 앞",
        validDate = validDate,
        openAt = openAt,
        totalCount = totalCount,
        allowDuplicate = false,
        maxPerUser = 1,
        discoveryMode = discoveryMode,
        eventId = eventId,
        status = status,
        issuedCount = 0,
    )

    private fun event(
        id: Long,
        totalQuantity: Int,
        remainingQuantity: Int,
    ) = Event(
        id = id,
        name = "PERFO Test Ticket",
        venue = "올림픽공원 체조경기장",
        validFrom = LocalDate.parse("2026-08-15").atStartOfDay(),
        validUntil = LocalDate.parse("2026-08-15").plusDays(1).atStartOfDay().minusSeconds(1),
        totalQuantity = totalQuantity,
        remainingQuantity = remainingQuantity,
        maxPerUser = 1,
        active = true,
    )
}
