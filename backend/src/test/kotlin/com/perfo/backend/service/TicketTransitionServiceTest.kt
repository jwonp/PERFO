package com.perfo.backend.service

import com.perfo.backend.entity.Event
import com.perfo.backend.entity.Ticket
import com.perfo.backend.entity.TicketUsageStatus
import com.perfo.backend.entity.TicketingStatus
import com.perfo.backend.repository.EventRepository
import com.perfo.backend.repository.TicketRepository
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.BDDMockito.given
import org.mockito.BDDMockito.then
import org.mockito.InjectMocks
import org.mockito.Mock
import org.mockito.junit.jupiter.MockitoExtension
import java.time.LocalDateTime
import java.util.Optional

@ExtendWith(MockitoExtension::class)
class TicketTransitionServiceTest {

    @Mock
    private lateinit var ticketRepository: TicketRepository

    @Mock
    private lateinit var eventRepository: EventRepository

    @Mock
    private lateinit var notificationBridgeService: NotificationBridgeService

    @InjectMocks
    private lateinit var ticketTransitionService: TicketTransitionService

    private lateinit var ticket: Ticket

    @BeforeEach
    fun setUp() {
        ticket = Ticket(
            id = 10L,
            eventId = 20L,
            userId = 3L,
            ticketNumber = 77,
            ticketingStatus = TicketingStatus.PENDING,
            usageStatus = TicketUsageStatus.WAITING,
            idempotencyKey = "idem-transition-1",
        )
    }

    @Test
    @DisplayName("티켓팅 상태 전환 시 상태를 저장하고 알림 브리지를 호출한다")
    fun transitionTicketingStatus_sendsBridge() {
        val event = Event(
            id = 20L,
            name = "PERFO Summer Festival",
            venue = "올림픽공원",
            validFrom = LocalDateTime.parse("2026-08-15T10:00:00"),
            validUntil = LocalDateTime.parse("2026-08-15T18:00:00"),
            totalQuantity = 500,
            remainingQuantity = 400,
            maxPerUser = 1,
            active = true,
        )

        given(ticketRepository.findById(10L)).willReturn(Optional.of(ticket))
        given(eventRepository.findById(20L)).willReturn(Optional.of(event))
        given(ticketRepository.save(ticket)).willReturn(ticket)

        val response = ticketTransitionService.transitionTicketingStatus(10L, TicketingStatus.PROCESSING)

        assertThat(response.ticketingStatus).isEqualTo(TicketingStatus.PROCESSING)
        assertThat(ticket.ticketingStatus).isEqualTo(TicketingStatus.PROCESSING)
        then(notificationBridgeService).should().notifyTicketTransition(
            TicketTransitionNotificationRequest(
                userId = "3",
                scope = "reserved",
                ticketId = "10",
                ticketName = "PERFO Summer Festival",
                targetUrl = "/reserved/10",
                statusKey = "ticketingStatus",
                previousStatus = TicketingStatus.PENDING.name,
                nextStatus = TicketingStatus.PROCESSING.name,
            ),
        )
    }

    @Test
    @DisplayName("사용 상태 전환 시 상태를 저장하고 알림 브리지를 호출한다")
    fun transitionUsageStatus_sendsBridge() {
        given(ticketRepository.findById(10L)).willReturn(Optional.of(ticket))
        given(eventRepository.findById(20L)).willReturn(Optional.empty())
        given(ticketRepository.save(ticket)).willReturn(ticket)

        val response = ticketTransitionService.transitionUsageStatus(10L, TicketUsageStatus.NOW_SERVING)

        assertThat(response.usageStatus).isEqualTo(TicketUsageStatus.NOW_SERVING)
        assertThat(ticket.usageStatus).isEqualTo(TicketUsageStatus.NOW_SERVING)
        then(notificationBridgeService).should().notifyTicketTransition(
            TicketTransitionNotificationRequest(
                userId = "3",
                scope = "reserved",
                ticketId = "10",
                ticketName = "Ticket #77",
                targetUrl = "/reserved/10",
                statusKey = "usageStatus",
                previousStatus = TicketUsageStatus.WAITING.name,
                nextStatus = TicketUsageStatus.NOW_SERVING.name,
            ),
        )
    }
}
