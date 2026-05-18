package com.perfo.backend.service

import com.perfo.backend.dto.TicketDto
import com.perfo.backend.entity.Event
import com.perfo.backend.dto.TicketDto.TicketValidationResult
import com.perfo.backend.entity.Ticket
import com.perfo.backend.entity.TicketUsageStatus
import com.perfo.backend.entity.TicketingStatus
import com.perfo.backend.repository.EventRepository
import com.perfo.backend.repository.TicketRepository
import com.perfo.backend.repository.VerificationRecordRepository
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.ActiveProfiles
import java.time.Instant
import java.time.LocalDateTime
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

@SpringBootTest
@ActiveProfiles("test")
class TicketVerificationConcurrencyTest {

    @Autowired
    private lateinit var ticketRepository: TicketRepository

    @Autowired
    private lateinit var eventRepository: EventRepository

    @Autowired
    private lateinit var verificationRecordRepository: VerificationRecordRepository

    @Autowired
    private lateinit var ticketVerificationService: TicketVerificationService

    @Test
    @DisplayName("동일 QR 동시 검표 시 한 요청만 성공하고 나머지는 이미 사용 결과를 반환한다")
    fun validateTicket_concurrentRequests_onlyOneSuccess() {
        val event = eventRepository.save(
            Event(
                name = "Verification Event",
                venue = "Olympic Park",
                validFrom = LocalDateTime.now().minusHours(1),
                validUntil = LocalDateTime.now().plusHours(2),
                totalQuantity = 1,
                remainingQuantity = 1,
                saleOpenAt = Instant.now().minusSeconds(3600),
                saleCloseAt = Instant.now().plusSeconds(3600),
                maxPerUser = 1,
                allowDuplicate = false,
                nextTicketNumber = 1,
                active = true,
            ),
        )

        val ticket = ticketRepository.save(
            Ticket(
                eventId = event.id!!,
                userId = 1L,
                ticketNumber = 121,
                ticketingStatus = TicketingStatus.SUCCESS,
                usageStatus = TicketUsageStatus.NOW_SERVING,
                idempotencyKey = "concurrency-${System.currentTimeMillis()}",
            ),
        )

        val token = ticketVerificationService.issueReservationQrToken(ticket.id!!, 1L).token
        val request = TicketDto.TicketValidationRequest(qrToken = token)

        val threadCount = 8
        val executor = Executors.newFixedThreadPool(threadCount)
        val start = CountDownLatch(1)
        val done = CountDownLatch(threadCount)
        val results = mutableListOf<TicketValidationResult>()

        repeat(threadCount) {
            executor.submit {
                try {
                    start.await(3, TimeUnit.SECONDS)
                    val response = ticketVerificationService.validateTicketByQr(ticket.eventId, request)
                    synchronized(results) {
                        results.add(response.result)
                    }
                } finally {
                    done.countDown()
                }
            }
        }

        start.countDown()
        done.await(5, TimeUnit.SECONDS)
        executor.shutdownNow()

        val successCount = results.count { it == TicketValidationResult.SUCCESS }
        val alreadyUsedCount = results.count { it == TicketValidationResult.ALREADY_USED }

        assertThat(successCount).isEqualTo(1)
        assertThat(alreadyUsedCount).isEqualTo(threadCount - 1)

        val persisted = ticketRepository.findById(ticket.id!!).orElseThrow()
        assertThat(persisted.usageStatus).isEqualTo(TicketUsageStatus.USED)
        assertThat(verificationRecordRepository.findAll().count { it.ticketId == ticket.id }).isEqualTo(1)
    }
}
