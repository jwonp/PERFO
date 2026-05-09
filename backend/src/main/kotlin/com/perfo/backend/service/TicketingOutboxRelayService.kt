package com.perfo.backend.service

import com.perfo.backend.entity.TicketingOutboxStatus
import com.perfo.backend.repository.TicketingOutboxRepository
import org.springframework.beans.factory.annotation.Value
import org.springframework.data.domain.PageRequest
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Service
import java.time.Clock
import java.time.LocalDateTime

@Service
class TicketingOutboxRelayService(
    private val ticketingOutboxRepository: TicketingOutboxRepository,
    private val ticketingOutboxPublisherService: TicketingOutboxPublisherService,
    private val clock: Clock = Clock.systemUTC(),
    @Value("\${app.ticketing.outbox.relay-enabled:false}")
    private val relayEnabled: Boolean,
    @Value("\${app.ticketing.outbox.batch-size:50}")
    private val batchSize: Int,
    @Value("\${app.ticketing.outbox.retry-backoff-seconds:30}")
    private val retryBackoffSeconds: Long,
    @Value("\${app.ticketing.outbox.max-retry-count:10}")
    private val maxRetryCount: Int,
) {
    @Scheduled(fixedDelayString = "\${app.ticketing.outbox.relay-fixed-delay-ms:1000}")
    fun relayPendingBatch() {
        if (!relayEnabled) {
            return
        }

        relayPendingBatchOnce()
    }

    fun relayPendingBatchOnce(): Int {
        val safeBatchSize = batchSize.coerceAtLeast(1)
        val retryEligibleBefore = LocalDateTime.now(clock).minusSeconds(retryBackoffSeconds.coerceAtLeast(0))
        val pendingBatch = ticketingOutboxRepository.findByStatusOrderByIdAsc(
            status = TicketingOutboxStatus.PENDING,
            pageable = PageRequest.of(0, safeBatchSize),
        )
        val remainingCapacity = safeBatchSize - pendingBatch.size
        val failedBatch = if (remainingCapacity > 0) {
            ticketingOutboxRepository.findByStatusOrderByIdAsc(
                status = TicketingOutboxStatus.FAILED,
                pageable = PageRequest.of(0, remainingCapacity * 3),
            ).filter { outbox ->
                outbox.retryCount < maxRetryCount.coerceAtLeast(1) &&
                    (outbox.updatedAt == null || !outbox.updatedAt!!.isAfter(retryEligibleBefore))
            }.take(remainingCapacity)
        } else {
            emptyList()
        }
        val relayBatch = pendingBatch + failedBatch

        relayBatch.forEach { outbox ->
            publishSingle(outbox.id ?: return@forEach)
        }

        return relayBatch.size
    }

    fun publishSingle(outboxId: Long) {
        ticketingOutboxPublisherService.publishSingle(outboxId)
    }
}
