package com.perfo.backend.service

import com.perfo.backend.dto.TicketDto
import com.perfo.backend.entity.Event
import com.perfo.backend.entity.TicketPurchaseResult
import com.perfo.backend.repository.EventRepository
import com.perfo.backend.repository.TicketRepository
import com.perfo.backend.repository.TicketingRequestRepository
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
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
class TicketingConcurrencyTest {

    @Autowired
    private lateinit var eventRepository: EventRepository

    @Autowired
    private lateinit var ticketRepository: TicketRepository

    @Autowired
    private lateinit var ticketingRequestRepository: TicketingRequestRepository

    @Autowired
    private lateinit var ticketingService: TicketingService

    @Autowired
    private lateinit var databaseTimeService: DatabaseTimeService

    @BeforeEach
    fun setUp() {
        ticketRepository.deleteAll()
        ticketingRequestRepository.deleteAll()
        eventRepository.deleteAll()
    }

    @Test
    @DisplayName("동시 요청에서도 초과 판매 없이 한 장만 성공한다")
    fun submitRequest_concurrentRequests_doNotOversell() {
        val dbNow = databaseTimeService.currentInstant()
        val event = eventRepository.save(
            Event(
                name = "Concurrent Event",
                venue = "Jamsil Arena",
                validFrom = LocalDateTime.now().plusDays(1),
                validUntil = LocalDateTime.now().plusDays(1).plusHours(2),
                totalQuantity = 1,
                remainingQuantity = 1,
                saleOpenAt = dbNow.minusSeconds(60),
                saleCloseAt = dbNow.plusSeconds(3600),
                maxPerUser = 1,
                allowDuplicate = false,
                nextTicketNumber = 1,
                active = true,
            ),
        )

        val threadCount = 8
        val executor = Executors.newFixedThreadPool(threadCount)
        val start = CountDownLatch(1)
        val done = CountDownLatch(threadCount)
        val results = mutableListOf<TicketPurchaseResult>()

        repeat(threadCount) { index ->
            executor.submit {
                try {
                    start.await(3, TimeUnit.SECONDS)
                    val response = ticketingService.submitRequest(
                        authenticatedUserId = (index + 1).toLong(),
                        request = TicketDto.TicketingRequestSubmitRequest(
                            requestId = "req_concurrent_${index + 1}",
                            eventId = event.id!!,
                            quantity = 1,
                        ),
                    )
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

        val successCount = results.count { it == TicketPurchaseResult.SUCCESS }
        val soldOutCount = results.count { it == TicketPurchaseResult.SOLD_OUT }
        val persistedEvent = eventRepository.findById(event.id!!).orElseThrow()

        assertThat(successCount).isEqualTo(1)
        assertThat(soldOutCount).isEqualTo(threadCount - 1)
        assertThat(ticketRepository.findAll()).hasSize(1)
        assertThat(persistedEvent.remainingQuantity).isZero()
    }
}
