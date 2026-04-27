package com.perfo.backend.service

import com.perfo.backend.dto.TicketDto
import com.perfo.backend.entity.Event
import com.perfo.backend.entity.Ticket
import com.perfo.backend.entity.TicketingStatus
import com.perfo.backend.entity.TicketUsageStatus
import com.perfo.backend.repository.EventRepository
import com.perfo.backend.repository.TicketRepository
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.ArgumentCaptor
import org.mockito.ArgumentMatchers.any
import org.mockito.BDDMockito.given
import org.mockito.BDDMockito.then
import org.mockito.InjectMocks
import org.mockito.Mock
import org.mockito.Mockito.never
import org.mockito.junit.jupiter.MockitoExtension
import java.time.LocalDateTime

@ExtendWith(MockitoExtension::class)
class TicketServiceTest {

    @Mock
    private lateinit var eventRepository: EventRepository

    @Mock
    private lateinit var ticketRepository: TicketRepository

    @InjectMocks
    private lateinit var ticketService: TicketService

    private lateinit var event: Event

    @BeforeEach
    fun setUp() {
        event = Event(
            id = 10L,
            name = "PERFO Summer Festival",
            venue = "KSPO DOME",
            validFrom = LocalDateTime.of(2026, 8, 15, 18, 0),
            validUntil = LocalDateTime.of(2026, 8, 15, 23, 0),
            totalQuantity = 100,
            remainingQuantity = 3,
            maxPerUser = 1,
            active = true
        )
    }

    @Test
    @DisplayName("티켓 발급 성공 - 재고가 있으면 재고를 차감하고 SUCCESS 티켓을 저장한다")
    fun requestTicket_success() {
        // given
        val request = TicketDto.TicketRequest(10L, 1L, "idem-1")
        val savedTicket = Ticket(
            id = 100L,
            eventId = 10L,
            userId = 1L,
            ticketNumber = 98,
            ticketingStatus = TicketingStatus.SUCCESS,
            usageStatus = TicketUsageStatus.BEFORE_SERVING,
            idempotencyKey = "idem-1"
        )

        given(ticketRepository.findByIdempotencyKey("idem-1")).willReturn(null)
        given(eventRepository.findById(10L)).willReturn(java.util.Optional.of(event))
        given(ticketRepository.countByEventIdAndUserId(10L, 1L)).willReturn(0)
        given(ticketRepository.save(any(Ticket::class.java))).willReturn(savedTicket)

        // when
        val response = ticketService.requestTicket(request)

        // then
        assertThat(response.ticketingStatus).isEqualTo(TicketingStatus.SUCCESS)
        assertThat(response.usageStatus).isEqualTo(TicketUsageStatus.BEFORE_SERVING)
        assertThat(response.ticketNumber).isEqualTo(98)
        assertThat(response.remainingQuantity).isEqualTo(2)

        val eventCaptor = ArgumentCaptor.forClass(Event::class.java)
        then(eventRepository).should().save(eventCaptor.capture())
        assertThat(eventCaptor.value.remainingQuantity).isEqualTo(2)

        val ticketCaptor = ArgumentCaptor.forClass(Ticket::class.java)
        then(ticketRepository).should().save(ticketCaptor.capture())
        assertThat(ticketCaptor.value.eventId).isEqualTo(10L)
        assertThat(ticketCaptor.value.userId).isEqualTo(1L)
        assertThat(ticketCaptor.value.ticketingStatus).isEqualTo(TicketingStatus.SUCCESS)
        assertThat(ticketCaptor.value.usageStatus).isEqualTo(TicketUsageStatus.BEFORE_SERVING)
    }

    @Test
    @DisplayName("티켓 발급 - 같은 idempotency key 재요청은 기존 발급 결과를 반환한다")
    fun requestTicket_duplicateIdempotencyKey_returnsExistingTicket() {
        // given
        val request = TicketDto.TicketRequest(10L, 1L, "idem-1")
        val existingTicket = Ticket(
            id = 100L,
            eventId = 10L,
            userId = 1L,
            ticketNumber = 98,
            ticketingStatus = TicketingStatus.SUCCESS,
            usageStatus = TicketUsageStatus.WAITING,
            idempotencyKey = "idem-1"
        )

        given(ticketRepository.findByIdempotencyKey("idem-1")).willReturn(existingTicket)

        // when
        val response = ticketService.requestTicket(request)

        // then
        assertThat(response.id).isEqualTo(100L)
        assertThat(response.ticketingStatus).isEqualTo(TicketingStatus.SUCCESS)
        assertThat(response.usageStatus).isEqualTo(TicketUsageStatus.WAITING)
        then(eventRepository).shouldHaveNoInteractions()
        then(ticketRepository).should(never()).save(any(Ticket::class.java))
    }

    @Test
    @DisplayName("티켓 발급 실패 - 재고가 없으면 SOLD_OUT을 반환하고 티켓을 저장하지 않는다")
    fun requestTicket_soldOut_returnsSoldOut() {
        // given
        val soldOutEvent = event.copyWithRemainingQuantity(0)
        val request = TicketDto.TicketRequest(10L, 1L, "idem-2")

        given(ticketRepository.findByIdempotencyKey("idem-2")).willReturn(null)
        given(eventRepository.findById(10L)).willReturn(java.util.Optional.of(soldOutEvent))

        // when
        val response = ticketService.requestTicket(request)

        // then
        assertThat(response.ticketingStatus).isEqualTo(TicketingStatus.SOLD_OUT)
        assertThat(response.remainingQuantity).isEqualTo(0)
        then(eventRepository).should(never()).save(any(Event::class.java))
        then(ticketRepository).should(never()).save(any(Ticket::class.java))
    }

    @Test
    @DisplayName("티켓 발급 실패 - 사용자별 최대 구매 수량을 넘으면 DUPLICATE를 반환한다")
    fun requestTicket_exceedsMaxPerUser_returnsDuplicate() {
        // given
        val request = TicketDto.TicketRequest(10L, 1L, "idem-3")

        given(ticketRepository.findByIdempotencyKey("idem-3")).willReturn(null)
        given(eventRepository.findById(10L)).willReturn(java.util.Optional.of(event))
        given(ticketRepository.countByEventIdAndUserId(10L, 1L)).willReturn(1)

        // when
        val response = ticketService.requestTicket(request)

        // then
        assertThat(response.ticketingStatus).isEqualTo(TicketingStatus.DUPLICATE)
        assertThat(response.remainingQuantity).isEqualTo(3)
        then(eventRepository).should(never()).save(any(Event::class.java))
        then(ticketRepository).should(never()).save(any(Ticket::class.java))
    }

    @Test
    @DisplayName("티켓 발급 실패 - 존재하지 않는 이벤트면 예외를 던진다")
    fun requestTicket_missingEvent_throwsException() {
        // given
        val request = TicketDto.TicketRequest(999L, 1L, "idem-4")

        given(ticketRepository.findByIdempotencyKey("idem-4")).willReturn(null)
        given(eventRepository.findById(999L)).willReturn(java.util.Optional.empty())

        // when & then
        assertThatThrownBy { ticketService.requestTicket(request) }
            .isInstanceOf(IllegalArgumentException::class.java)
            .hasMessage("Event not found")
    }
}
