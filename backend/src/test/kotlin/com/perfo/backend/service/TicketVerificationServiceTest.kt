package com.perfo.backend.service

import com.perfo.backend.dto.TicketDto
import com.perfo.backend.dto.TicketDto.TicketValidationResult
import com.perfo.backend.entity.Ticket
import com.perfo.backend.entity.TicketUsageStatus
import com.perfo.backend.entity.TicketingStatus
import com.perfo.backend.entity.VerificationRecord
import com.perfo.backend.entity.Event
import com.perfo.backend.repository.EventRepository
import com.perfo.backend.repository.TicketRepository
import com.perfo.backend.repository.VerificationRecordRepository
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.ArgumentCaptor
import org.mockito.BDDMockito.given
import org.mockito.BDDMockito.then
import org.mockito.InjectMocks
import org.mockito.Mock
import org.mockito.Mockito.never
import org.mockito.junit.jupiter.MockitoExtension
import java.time.LocalDateTime
import java.time.Instant
import java.util.Optional

@ExtendWith(MockitoExtension::class)
class TicketVerificationServiceTest {

    @Mock
    private lateinit var ticketRepository: TicketRepository

    @Mock
    private lateinit var verificationRecordRepository: VerificationRecordRepository

    @Mock
    private lateinit var eventRepository: EventRepository

    @Mock
    private lateinit var qrSignatureService: QrSignatureService

    @Mock
    private lateinit var notificationBridgeService: NotificationBridgeService

    @InjectMocks
    private lateinit var ticketVerificationService: TicketVerificationService

    private lateinit var ticket: Ticket
    private lateinit var event: Event

    @BeforeEach
    fun setUp() {
        ticket = Ticket(
            id = 100L,
            eventId = 10L,
            userId = 1L,
            ticketNumber = 98,
            ticketingStatus = TicketingStatus.SUCCESS,
            usageStatus = TicketUsageStatus.NOW_SERVING,
            idempotencyKey = "idem-1",
        )
        event = Event(
            id = 10L,
            name = "PERFO Event",
            venue = "올림픽공원 체조경기장",
            validFrom = LocalDateTime.now().minusHours(1),
            validUntil = LocalDateTime.now().plusHours(2),
            totalQuantity = 100,
            remainingQuantity = 10,
            maxPerUser = 1,
            active = true,
        )
    }

    @Test
    @DisplayName("QR 토큰을 발급할 수 있다")
    fun issueQrToken_success() {
        given(ticketRepository.findById(100L)).willReturn(Optional.of(ticket))
        given(qrSignatureService.issueToken(100L, 10L, 1L, 60))
            .willReturn(Pair("opaque-token", Instant.parse("2026-04-28T03:00:30Z")))

        val response = ticketVerificationService.issueReservationQrToken(100L)

        assertThat(response.token).isEqualTo("opaque-token")
        assertThat(response.expiresAt).isEqualTo("2026-04-28T03:00:30Z")
    }

    @Test
    @DisplayName("QR 검표 성공 시 미사용 티켓은 사용 처리되고 검증 이력이 저장된다")
    fun validateQr_success() {
        val request = TicketDto.TicketValidationRequest(qrToken = "opaque-token")
        val payload = QrTokenPayload(ticketId = 100L, eventId = 10L, userId = 1L, expiresAtEpochSecond = Instant.now().plusSeconds(30).epochSecond)

        given(qrSignatureService.verifyToken("opaque-token")).willReturn(payload)
        given(ticketRepository.findById(100L)).willReturn(Optional.of(ticket))
        given(eventRepository.findById(10L)).willReturn(Optional.of(event))
        given(ticketRepository.markUsedIfNotUsed(100L, TicketUsageStatus.USED)).willReturn(1)
        given(verificationRecordRepository.save(org.mockito.ArgumentMatchers.any(VerificationRecord::class.java)))
            .willReturn(VerificationRecord(id = 1L, ticketId = 100L, eventId = 10L, userId = 1L))

        val response = ticketVerificationService.validateTicketByQr(10L, request)

        assertThat(response.result).isEqualTo(TicketValidationResult.SUCCESS)
        assertThat(response.ticketNumber).isEqualTo(98)

        then(ticketRepository).should().markUsedIfNotUsed(100L, TicketUsageStatus.USED)
        val recordCaptor = ArgumentCaptor.forClass(VerificationRecord::class.java)
        then(verificationRecordRepository).should().save(recordCaptor.capture())
        assertThat(recordCaptor.value.ticketId).isEqualTo(100L)
    }

    @Test
    @DisplayName("QR 검표 실패 시 다른 티켓의 QR이면 다른 티켓 결과를 반환한다")
    fun validateQr_wrongTicket() {
        val request = TicketDto.TicketValidationRequest(qrToken = "opaque-token")
        val payload = QrTokenPayload(ticketId = 100L, eventId = 11L, userId = 1L, expiresAtEpochSecond = Instant.now().plusSeconds(30).epochSecond)

        given(qrSignatureService.verifyToken("opaque-token")).willReturn(payload)

        val response = ticketVerificationService.validateTicketByQr(10L, request)

        assertThat(response.result).isEqualTo(TicketValidationResult.WRONG_TICKET)
        then(ticketRepository).should(never()).findById(100L)
    }

    @Test
    @DisplayName("QR 검표 실패 시 이미 사용된 티켓이면 이미 사용 결과를 반환한다")
    fun validateQr_alreadyUsed() {
        val request = TicketDto.TicketValidationRequest(qrToken = "opaque-token")
        val payload = QrTokenPayload(ticketId = 100L, eventId = 10L, userId = 1L, expiresAtEpochSecond = Instant.now().plusSeconds(30).epochSecond)
        val usedTicket = ticket.copyWithUsageStatus(TicketUsageStatus.USED)

        given(qrSignatureService.verifyToken("opaque-token")).willReturn(payload)
        given(ticketRepository.findById(100L)).willReturn(Optional.of(usedTicket))
        given(eventRepository.findById(10L)).willReturn(Optional.of(event))

        val response = ticketVerificationService.validateTicketByQr(10L, request)

        assertThat(response.result).isEqualTo(TicketValidationResult.ALREADY_USED)
        then(ticketRepository).should(never()).markUsedIfNotUsed(100L, TicketUsageStatus.USED)
    }

    @Test
    @DisplayName("QR 검표 실패 시 검표 시작 전 상태는 미오픈 결과를 반환한다")
    fun validateQr_notOpen_beforeServing() {
        val request = TicketDto.TicketValidationRequest(qrToken = "opaque-token")
        val payload = QrTokenPayload(ticketId = 100L, eventId = 10L, userId = 1L, expiresAtEpochSecond = Instant.now().plusSeconds(30).epochSecond)
        val beforeServingTicket = ticket.copyWithUsageStatus(TicketUsageStatus.BEFORE_SERVING)

        given(qrSignatureService.verifyToken("opaque-token")).willReturn(payload)
        given(ticketRepository.findById(100L)).willReturn(Optional.of(beforeServingTicket))
        given(eventRepository.findById(10L)).willReturn(Optional.of(event.copyWithWindow(LocalDateTime.now().plusHours(1), LocalDateTime.now().plusHours(2))))

        val response = ticketVerificationService.validateTicketByQr(10L, request)

        assertThat(response.result).isEqualTo(TicketValidationResult.NOT_OPEN)
        then(ticketRepository).should(never()).markUsedIfNotUsed(100L, TicketUsageStatus.USED)
    }

    @Test
    @DisplayName("QR 검표 실패 시 대기 상태는 미오픈 결과를 반환한다")
    fun validateQr_notOpen_waiting() {
        val request = TicketDto.TicketValidationRequest(qrToken = "opaque-token")
        val payload = QrTokenPayload(ticketId = 100L, eventId = 10L, userId = 1L, expiresAtEpochSecond = Instant.now().plusSeconds(30).epochSecond)
        val waitingTicket = ticket.copyWithUsageStatus(TicketUsageStatus.WAITING)

        given(qrSignatureService.verifyToken("opaque-token")).willReturn(payload)
        given(ticketRepository.findById(100L)).willReturn(Optional.of(waitingTicket))
        given(eventRepository.findById(10L)).willReturn(Optional.of(event.copyWithWindow(LocalDateTime.now().plusHours(1), LocalDateTime.now().plusHours(2))))

        val response = ticketVerificationService.validateTicketByQr(10L, request)

        assertThat(response.result).isEqualTo(TicketValidationResult.NOT_OPEN)
        then(ticketRepository).should(never()).markUsedIfNotUsed(100L, TicketUsageStatus.USED)
    }

    @Test
    @DisplayName("QR 검표 실패 시 이벤트 종료 후면 저장 상태와 무관하게 만료 결과를 반환한다")
    fun validateQr_expiredByEventWindow() {
        val request = TicketDto.TicketValidationRequest(qrToken = "opaque-token")
        val payload = QrTokenPayload(ticketId = 100L, eventId = 10L, userId = 1L, expiresAtEpochSecond = Instant.now().plusSeconds(30).epochSecond)

        given(qrSignatureService.verifyToken("opaque-token")).willReturn(payload)
        given(ticketRepository.findById(100L)).willReturn(Optional.of(ticket))
        given(eventRepository.findById(10L)).willReturn(Optional.of(event.copyWithWindow(LocalDateTime.now().minusHours(2), LocalDateTime.now().minusMinutes(1))))

        val response = ticketVerificationService.validateTicketByQr(10L, request)

        assertThat(response.result).isEqualTo(TicketValidationResult.EXPIRED)
        then(ticketRepository).should(never()).markUsedIfNotUsed(100L, TicketUsageStatus.USED)
    }

    @Test
    @DisplayName("QR 검표 실패 시 서명 검증에 실패하면 무효 결과를 반환한다")
    fun validateQr_invalidToken() {
        val request = TicketDto.TicketValidationRequest(qrToken = "bad-token")
        given(qrSignatureService.verifyToken("bad-token")).willReturn(null)

        val response = ticketVerificationService.validateTicketByQr(10L, request)

        assertThat(response.result).isEqualTo(TicketValidationResult.INVALID)
    }

    private fun Event.copyWithWindow(validFrom: LocalDateTime, validUntil: LocalDateTime): Event {
        return Event(
            id = id,
            name = name,
            venue = venue,
            validFrom = validFrom,
            validUntil = validUntil,
            totalQuantity = totalQuantity,
            remainingQuantity = remainingQuantity,
            maxPerUser = maxPerUser,
            active = active,
        )
    }
}
