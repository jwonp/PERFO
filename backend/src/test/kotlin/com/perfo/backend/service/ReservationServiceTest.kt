package com.perfo.backend.service

import com.perfo.backend.dto.TicketDto
import com.perfo.backend.entity.Event
import com.perfo.backend.entity.Ticket
import com.perfo.backend.entity.TicketUsageStatus
import com.perfo.backend.entity.TicketingStatus
import com.perfo.backend.repository.EventRepository
import com.perfo.backend.repository.IssuedTicketRepository
import com.perfo.backend.repository.TicketRepository
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.mockito.BDDMockito.given
import org.mockito.Mockito.mock
import java.time.LocalDateTime

class ReservationServiceTest {
    private val ticketRepository = mock(TicketRepository::class.java)
    private val eventRepository = mock(EventRepository::class.java)
    private val issuedTicketRepository = mock(IssuedTicketRepository::class.java)
    private val ticketImageStorageService = mock(TicketImageStorageService::class.java)
    private val reservationService = ReservationService(
        ticketRepository,
        eventRepository,
        issuedTicketRepository,
        ticketImageStorageService,
    )

    @Test
    @DisplayName("사용자 예약 조회 - 이벤트 정보를 합쳐 예약 목록을 반환한다")
    fun findAllByUserId_returnsReservations() {
        val reservation = Ticket(
            id = 11L,
            eventId = 101L,
            userId = 5L,
            ticketNumber = 3,
            ticketingStatus = TicketingStatus.SUCCESS,
            usageStatus = TicketUsageStatus.NOW_SERVING,
            idempotencyKey = "ticket-11",
        )
        val event = Event(
            id = 101L,
            name = "PERFO Reservation",
            venue = "올림픽공원 체조경기장",
            validFrom = LocalDateTime.now().minusHours(1),
            validUntil = LocalDateTime.now().plusHours(2),
            totalQuantity = 100,
            remainingQuantity = 50,
            maxPerUser = 1,
            active = true,
        )

        given(ticketRepository.findByUserIdOrderByIdDesc(5L)).willReturn(listOf(reservation))
        given(eventRepository.findAllById(listOf(101L))).willReturn(listOf(event))

        val result = reservationService.findAllByUserId(5L)

        assertThat(result).containsExactly(
            TicketDto.ReservationResponse(
                id = 11L,
                name = "PERFO Reservation",
                venue = "올림픽공원 체조경기장",
                validDate = event.validUntil.toLocalDate().toString(),
                ticketNumber = 3,
                totalCount = 100,
                ticketingStatus = TicketingStatus.SUCCESS,
                usageStatus = TicketDto.ReservedUsageStatus.MY_TURN,
            ),
        )
    }

    @Test
    @DisplayName("사용자 예약 조회 - 이벤트 시작 전이면 저장 상태와 무관하게 사용 전으로 반환한다")
    fun findAllByUserId_resolvesBeforeUseFromEventWindow() {
        val reservation = Ticket(
            id = 12L,
            eventId = 102L,
            userId = 5L,
            ticketNumber = 4,
            ticketingStatus = TicketingStatus.SUCCESS,
            usageStatus = TicketUsageStatus.NOW_SERVING,
            idempotencyKey = "ticket-12",
        )
        val event = Event(
            id = 102L,
            name = "Future Event",
            venue = "KSPO DOME",
            validFrom = LocalDateTime.now().plusHours(1),
            validUntil = LocalDateTime.now().plusHours(5),
            totalQuantity = 100,
            remainingQuantity = 50,
            maxPerUser = 1,
            active = true,
        )

        given(ticketRepository.findByUserIdOrderByIdDesc(5L)).willReturn(listOf(reservation))
        given(eventRepository.findAllById(listOf(102L))).willReturn(listOf(event))

        val result = reservationService.findAllByUserId(5L)

        assertThat(result.single().usageStatus).isEqualTo(TicketDto.ReservedUsageStatus.BEFORE_USE)
    }
}
