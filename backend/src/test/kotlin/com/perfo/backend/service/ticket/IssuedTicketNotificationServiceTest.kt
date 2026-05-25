package com.perfo.backend.service.ticket

import com.perfo.backend.dto.TicketDto.IssuedTicketStatus
import com.perfo.backend.entity.IssuedTicket
import com.perfo.backend.entity.TicketDiscoveryMode
import com.perfo.backend.service.NotificationBridgeService
import com.perfo.backend.service.TicketTransitionNotificationRequest
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.BDDMockito.then
import org.mockito.Mockito.never
import org.mockito.junit.jupiter.MockitoExtension
import org.mockito.kotlin.any

@ExtendWith(MockitoExtension::class)
class IssuedTicketNotificationServiceTest {

    @org.mockito.Mock
    private lateinit var notificationBridgeService: NotificationBridgeService

    @org.mockito.InjectMocks
    private lateinit var notificationService: IssuedTicketNotificationService

    @Test
    @DisplayName("같은 상태 전이는 알림을 보내지 않는다")
    fun notifyIssuedStatusTransitionSkipsSameStatus() {
        notificationService.notifyIssuedStatusTransition(
            ticket = issuedTicket(),
            previousStatus = IssuedTicketStatus.ISSUING,
            nextStatus = IssuedTicketStatus.ISSUING,
        )

        then(notificationBridgeService).should(never()).notifyTicketTransition(any())
    }

    @Test
    @DisplayName("상태가 바뀌면 issued 상태 전이 알림을 보낸다")
    fun notifyIssuedStatusTransitionSendsBridge() {
        notificationService.notifyIssuedStatusTransition(
            ticket = issuedTicket(),
            previousStatus = IssuedTicketStatus.INACTIVE,
            nextStatus = IssuedTicketStatus.ISSUING,
        )

        then(notificationBridgeService).should().notifyTicketTransition(
            TicketTransitionNotificationRequest(
                userId = "owner-1",
                scope = "issued",
                ticketId = "1",
                ticketName = "PERFO Test Ticket",
                targetUrl = "/my-tickets/1/scan",
                statusKey = "issueStatus",
                previousStatus = IssuedTicketStatus.INACTIVE.name,
                nextStatus = IssuedTicketStatus.ISSUING.name,
            ),
        )
    }

    private fun issuedTicket() = IssuedTicket(
        id = 1L,
        ownerUserId = "owner-1",
        name = "PERFO Test Ticket",
        venue = "올림픽공원 체조경기장",
        googlePlaceId = "ChIJPLACE",
        detailAddress = "2층 A게이트 앞",
        validDate = java.time.LocalDate.parse("2026-08-15"),
        openAt = java.time.OffsetDateTime.parse("2026-08-15T08:00:00Z"),
        totalCount = 100,
        allowDuplicate = false,
        maxPerUser = 1,
        discoveryMode = TicketDiscoveryMode.LISTED,
        status = IssuedTicketStatus.INACTIVE,
        issuedCount = 0,
    )
}
