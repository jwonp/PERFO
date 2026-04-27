package com.perfo.backend.service

import com.perfo.backend.dto.TicketDto
import com.perfo.backend.entity.Ticket
import com.perfo.backend.entity.TicketUsageStatus
import com.perfo.backend.entity.TicketingStatus
import com.perfo.backend.entity.VerificationRecord
import com.perfo.backend.repository.TicketRepository
import com.perfo.backend.repository.VerificationRecordRepository
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

@ExtendWith(MockitoExtension::class)
class TicketVerificationServiceTest {

    @Mock
    private lateinit var ticketRepository: TicketRepository

    @Mock
    private lateinit var verificationRecordRepository: VerificationRecordRepository

    @Mock
    private lateinit var qrSignatureService: QrSignatureService

    @InjectMocks
    private lateinit var ticketVerificationService: TicketVerificationService

    private lateinit var ticket: Ticket

    @BeforeEach
    fun setUp() {
        ticket = Ticket(
            id = 100L,
            eventId = 10L,
            userId = 1L,
            ticketNumber = 98,
            ticketingStatus = TicketingStatus.SUCCESS,
            usageStatus = TicketUsageStatus.NOW_SERVING,
            idempotencyKey = "idem-1"
        )
    }

    @Test
    @DisplayName("QR 검증 성공 - 서명이 유효하고 사용 가능한 티켓이면 USED 처리와 검증 이력을 저장한다")
    fun verifyQr_success() {
        // given
        val request = TicketDto.VerifyTicketRequest(100L, 10L, 1L, "valid-signature")

        given(qrSignatureService.isValid(request)).willReturn(true)
        given(ticketRepository.findById(100L)).willReturn(java.util.Optional.of(ticket))
        given(verificationRecordRepository.save(any(VerificationRecord::class.java)))
            .willReturn(VerificationRecord(id = 1L, ticketId = 100L, eventId = 10L, userId = 1L))

        // when
        val response = ticketVerificationService.verify(request)

        // then
        assertThat(response.verified).isTrue()
        assertThat(response.ticketId).isEqualTo(100L)
        assertThat(response.usageStatus).isEqualTo(TicketUsageStatus.USED)

        val ticketCaptor = ArgumentCaptor.forClass(Ticket::class.java)
        then(ticketRepository).should().save(ticketCaptor.capture())
        assertThat(ticketCaptor.value.usageStatus).isEqualTo(TicketUsageStatus.USED)

        val recordCaptor = ArgumentCaptor.forClass(VerificationRecord::class.java)
        then(verificationRecordRepository).should().save(recordCaptor.capture())
        assertThat(recordCaptor.value.ticketId).isEqualTo(100L)
        assertThat(recordCaptor.value.eventId).isEqualTo(10L)
        assertThat(recordCaptor.value.userId).isEqualTo(1L)
    }

    @Test
    @DisplayName("QR 검증 실패 - 서명이 유효하지 않으면 티켓 상태를 변경하지 않는다")
    fun verifyQr_invalidSignature_throwsException() {
        // given
        val request = TicketDto.VerifyTicketRequest(100L, 10L, 1L, "invalid-signature")

        given(qrSignatureService.isValid(request)).willReturn(false)

        // when & then
        assertThatThrownBy { ticketVerificationService.verify(request) }
            .isInstanceOf(IllegalArgumentException::class.java)
            .hasMessage("Invalid QR signature")

        then(ticketRepository).shouldHaveNoInteractions()
        then(verificationRecordRepository).shouldHaveNoInteractions()
    }

    @Test
    @DisplayName("QR 검증 실패 - 이미 사용한 티켓은 중복 사용을 차단한다")
    fun verifyQr_usedTicket_throwsException() {
        // given
        val usedTicket = ticket.copyWithUsageStatus(TicketUsageStatus.USED)
        val request = TicketDto.VerifyTicketRequest(100L, 10L, 1L, "valid-signature")

        given(qrSignatureService.isValid(request)).willReturn(true)
        given(ticketRepository.findById(100L)).willReturn(java.util.Optional.of(usedTicket))

        // when & then
        assertThatThrownBy { ticketVerificationService.verify(request) }
            .isInstanceOf(IllegalStateException::class.java)
            .hasMessage("Ticket already used")

        then(ticketRepository).should(never()).save(any(Ticket::class.java))
        then(verificationRecordRepository).shouldHaveNoInteractions()
    }

    @Test
    @DisplayName("QR 검증 실패 - QR의 이벤트나 사용자 정보가 티켓과 다르면 차단한다")
    fun verifyQr_mismatchedPayload_throwsException() {
        // given
        val request = TicketDto.VerifyTicketRequest(100L, 999L, 1L, "valid-signature")

        given(qrSignatureService.isValid(request)).willReturn(true)
        given(ticketRepository.findById(100L)).willReturn(java.util.Optional.of(ticket))

        // when & then
        assertThatThrownBy { ticketVerificationService.verify(request) }
            .isInstanceOf(IllegalArgumentException::class.java)
            .hasMessage("QR payload does not match ticket")

        then(ticketRepository).should(never()).save(any(Ticket::class.java))
        then(verificationRecordRepository).shouldHaveNoInteractions()
    }
}
