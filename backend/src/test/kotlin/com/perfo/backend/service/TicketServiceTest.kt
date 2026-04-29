package com.perfo.backend.service

import com.perfo.backend.dto.TicketDto
import com.perfo.backend.dto.TicketDto.IssuedTicketStatus
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.mockito.BDDMockito.then
import org.mockito.Mockito.mock
import org.mockito.Mockito.verifyNoInteractions

class TicketServiceTest {

    private lateinit var notificationBridgeService: NotificationBridgeService
    private lateinit var ticketService: TicketService

    @BeforeEach
    fun setUp() {
        notificationBridgeService = mock(NotificationBridgeService::class.java)
        ticketService = TicketService(notificationBridgeService)
    }

    @Test
    @DisplayName("티켓 생성 성공 - 유효한 요청이면 id를 부여해 반환한다")
    fun create_success() {
        val request = createRequest(ownerUserId = "owner-1")

        val created = ticketService.create(request)

        assertThat(created.id).isEqualTo(1L)
        assertThat(created.name).isEqualTo("PERFO Test Ticket")
        assertThat(created.googlePlaceId).isEqualTo("ChIJPLACE")
        assertThat(created.status).isEqualTo(IssuedTicketStatus.INACTIVE)
        assertThat(created.issuedCount).isZero()
        assertThat(created.ownerUserId).isEqualTo("owner-1")
    }

    @Test
    @DisplayName("티켓 생성 실패 - place id 형식이 잘못되면 예외를 던진다")
    fun create_invalidPlaceId_throwsException() {
        val request = createRequest(googlePlaceId = "bad id")

        assertThatThrownBy { ticketService.create(request) }
            .isInstanceOf(IllegalArgumentException::class.java)
            .hasMessage("Invalid googlePlaceId")
    }

    @Test
    @DisplayName("소유자별 티켓 조회 - 요청한 소유자의 티켓만 최신순으로 반환한다")
    fun findAllByOwnerUserId_returnsOwnerTicketsOnly() {
        val first = ticketService.create(createRequest(ownerUserId = "owner-1", name = "First Ticket"))
        ticketService.create(createRequest(ownerUserId = "owner-2", name = "Other Owner Ticket"))
        val latest = ticketService.create(createRequest(ownerUserId = "owner-1", name = "Latest Ticket"))

        val tickets = ticketService.findAllByOwnerUserId("owner-1")

        assertThat(tickets).extracting<Long> { it.id }.containsExactly(latest.id, first.id)
        assertThat(tickets).allMatch { it.ownerUserId == "owner-1" }
    }

    @Test
    @DisplayName("발행 티켓 상태 전환 - 상태를 갱신하고 알림 브리지를 호출한다")
    fun updateIssuedStatus_updatesStatusAndSendsBridge() {
        val ticket = ticketService.create(createRequest(ownerUserId = "owner-1"))

        val updated = ticketService.updateIssuedStatus(ticket.id, IssuedTicketStatus.VERIFYING)

        assertThat(updated.status).isEqualTo(IssuedTicketStatus.VERIFYING)
        then(notificationBridgeService).should().notifyTicketTransition(
            TicketTransitionNotificationRequest(
                userId = "owner-1",
                scope = "issued",
                ticketId = ticket.id.toString(),
                ticketName = "PERFO Test Ticket",
                targetUrl = "/my-tickets/${ticket.id}/scan",
                statusKey = "issueStatus",
                previousStatus = IssuedTicketStatus.INACTIVE.name,
                nextStatus = IssuedTicketStatus.VERIFYING.name,
            ),
        )
    }

    @Test
    @DisplayName("발행 티켓 상태 전환 - 같은 상태면 알림을 보내지 않는다")
    fun updateIssuedStatus_sameStatus_doesNotSendBridge() {
        val ticket = ticketService.create(createRequest(ownerUserId = "owner-1"))

        val updated = ticketService.updateIssuedStatus(ticket.id, IssuedTicketStatus.INACTIVE)

        assertThat(updated).isEqualTo(ticket)
        verifyNoInteractions(notificationBridgeService)
    }

    @Test
    @DisplayName("발행 티켓 상태 전환 실패 - 없는 티켓이면 예외를 던진다")
    fun updateIssuedStatus_missingTicket_throwsException() {
        assertThatThrownBy { ticketService.updateIssuedStatus(404L, IssuedTicketStatus.EXPIRED) }
            .isInstanceOf(IllegalArgumentException::class.java)
            .hasMessage("Ticket not found")
    }

    private fun createRequest(
        name: String = "PERFO Test Ticket",
        googlePlaceId: String = "ChIJPLACE",
        ownerUserId: String? = null,
    ) = TicketDto.CreateTicketRequest(
        name = name,
        venue = "올림픽공원 체조경기장",
        googlePlaceId = googlePlaceId,
        detailAddress = "2층 A게이트 앞",
        validDate = "2026-08-15",
        totalCount = 100,
        allowDuplicate = false,
        maxPerUser = 1,
        ownerUserId = ownerUserId,
    )
}
