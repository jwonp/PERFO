package com.perfo.backend.observability

import com.perfo.backend.entity.TicketPurchaseResult
import com.perfo.backend.entity.TicketingOutboxEventType
import com.perfo.backend.entity.TicketingOutboxStatus
import com.perfo.backend.repository.TicketingOutboxRepository
import io.micrometer.core.instrument.Gauge
import io.micrometer.core.instrument.MeterRegistry
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Component
import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.util.concurrent.atomic.AtomicLong

@Component
class TicketingPipelineObservability(
    private val meterRegistry: MeterRegistry,
    private val ticketingOutboxRepository: TicketingOutboxRepository,
    private val clock: Clock = Clock.systemUTC(),
) {
    private val logger = LoggerFactory.getLogger(javaClass)
    private val lastProjectionLagSeconds = AtomicLong(0)
    private val lastProjectionSuccessEpochSecond = AtomicLong(0)

    init {
        Gauge.builder("perfo.ticketing.outbox.pending.count") {
            ticketingOutboxRepository.countByStatus(TicketingOutboxStatus.PENDING).toDouble()
        }.register(meterRegistry)

        Gauge.builder("perfo.ticketing.outbox.failed.count") {
            ticketingOutboxRepository.countByStatus(TicketingOutboxStatus.FAILED).toDouble()
        }.register(meterRegistry)

        Gauge.builder("perfo.ticketing.projection.last_lag.seconds", lastProjectionLagSeconds) {
            it.get().toDouble()
        }.register(meterRegistry)

        Gauge.builder("perfo.ticketing.projection.seconds_since_last_success", lastProjectionSuccessEpochSecond) {
            val lastSuccess = it.get()
            if (lastSuccess <= 0) {
                0.0
            } else {
                (Instant.now(clock).epochSecond - lastSuccess).coerceAtLeast(0).toDouble()
            }
        }.register(meterRegistry)
    }

    fun recordRelayRetryAttempt(
        outboxId: Long,
        requestId: String,
        eventType: TicketingOutboxEventType,
        retryCount: Int,
    ) {
        meterRegistry.counter(
            "perfo.ticketing.outbox.publish.retry",
            "eventType",
            eventType.name,
        ).increment()
        logger.info(
            "ticketing_outbox_retry outboxId={} requestId={} eventType={} retryCount={}",
            outboxId,
            requestId,
            eventType,
            retryCount,
        )
    }

    fun recordRelayPublished(
        outboxId: Long,
        requestId: String,
        eventType: TicketingOutboxEventType,
        retryCount: Int,
    ) {
        meterRegistry.counter(
            "perfo.ticketing.outbox.publish.success",
            "eventType",
            eventType.name,
        ).increment()
        logger.info(
            "ticketing_outbox_publish_success outboxId={} requestId={} eventType={} retryCount={}",
            outboxId,
            requestId,
            eventType,
            retryCount,
        )
    }

    fun recordRelayFailure(
        outboxId: Long,
        requestId: String,
        eventType: TicketingOutboxEventType,
        retryCount: Int,
        reason: String,
    ) {
        meterRegistry.counter(
            "perfo.ticketing.outbox.publish.failure",
            "eventType",
            eventType.name,
            "reason",
            reason,
        ).increment()
        logger.warn(
            "ticketing_outbox_publish_failure outboxId={} requestId={} eventType={} retryCount={} reason={}",
            outboxId,
            requestId,
            eventType,
            retryCount,
            reason,
        )
    }

    fun recordProjectionConsumed(
        outboxId: Long,
        requestId: String,
        eventType: TicketingOutboxEventType,
        result: TicketPurchaseResult,
        occurredAt: Instant,
    ) {
        meterRegistry.counter(
            "perfo.ticketing.projection.consume.success",
            "eventType",
            eventType.name,
            "result",
            result.name,
        ).increment()
        lastProjectionLagSeconds.set(Duration.between(occurredAt, Instant.now(clock)).seconds.coerceAtLeast(0))
        lastProjectionSuccessEpochSecond.set(Instant.now(clock).epochSecond)
        logger.info(
            "ticketing_projection_consume_success outboxId={} requestId={} eventType={} result={} lagSeconds={}",
            outboxId,
            requestId,
            eventType,
            result,
            lastProjectionLagSeconds.get(),
        )
    }

    fun recordProjectionDuplicateSkip(
        outboxId: Long,
        requestId: String,
        eventType: TicketingOutboxEventType,
    ) {
        meterRegistry.counter(
            "perfo.ticketing.projection.consume.duplicate_skip",
            "eventType",
            eventType.name,
        ).increment()
        logger.info(
            "ticketing_projection_consume_duplicate outboxId={} requestId={} eventType={}",
            outboxId,
            requestId,
            eventType,
        )
    }

    fun recordProjectionFailure(
        reason: String,
        outboxId: Long? = null,
        requestId: String? = null,
        eventType: TicketingOutboxEventType? = null,
    ) {
        val counter = if (eventType != null) {
            meterRegistry.counter(
                "perfo.ticketing.projection.consume.failure",
                "reason",
                reason,
                "eventType",
                eventType.name,
            )
        } else {
            meterRegistry.counter(
                "perfo.ticketing.projection.consume.failure",
                "reason",
                reason,
                "eventType",
                "UNKNOWN",
            )
        }
        counter.increment()
        logger.warn(
            "ticketing_projection_consume_failure outboxId={} requestId={} eventType={} reason={}",
            outboxId,
            requestId,
            eventType,
            reason,
        )
    }
}
