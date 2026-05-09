package com.perfo.backend.service

import com.fasterxml.jackson.databind.ObjectMapper
import com.perfo.backend.entity.TicketingOutboxStatus
import com.perfo.backend.observability.TicketingPipelineObservability
import com.perfo.backend.repository.TicketingOutboxRepository
import org.springframework.beans.factory.annotation.Value
import org.springframework.kafka.core.KafkaTemplate
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Propagation
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.LocalDateTime
import java.util.concurrent.TimeUnit

@Service
class TicketingOutboxPublisherService(
    private val ticketingOutboxRepository: TicketingOutboxRepository,
    private val kafkaTemplate: KafkaTemplate<String, String>,
    private val objectMapper: ObjectMapper,
    private val ticketingPipelineObservability: TicketingPipelineObservability,
    private val clock: Clock = Clock.systemUTC(),
    @Value("\${app.ticketing.outbox.topic:ticketing.purchase-results}")
    private val topic: String,
) {
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    fun publishSingle(outboxId: Long) {
        val outbox = ticketingOutboxRepository.findByIdForUpdate(outboxId).orElseThrow()
        if (outbox.status != TicketingOutboxStatus.PENDING && outbox.status != TicketingOutboxStatus.FAILED) {
            return
        }
        val wasRetry = outbox.status == TicketingOutboxStatus.FAILED
        if (wasRetry) {
            ticketingPipelineObservability.recordRelayRetryAttempt(
                outboxId = outbox.id ?: outboxId,
                requestId = outbox.requestId,
                eventType = outbox.eventType,
                retryCount = outbox.retryCount,
            )
        }

        try {
            val message = objectMapper.writeValueAsString(
                TicketingOutboxMessage(
                    outboxId = outbox.id ?: throw IllegalStateException("Outbox id is required for publish"),
                    requestId = outbox.requestId,
                    eventType = outbox.eventType,
                    payload = objectMapper.readValue(outbox.payload, TicketingOutboxPayload::class.java),
                ),
            )

            kafkaTemplate.send(topic, outbox.requestId, message)
                .get(5, TimeUnit.SECONDS)

            outbox.markPublished(LocalDateTime.now(clock))
            ticketingOutboxRepository.save(outbox)
            ticketingPipelineObservability.recordRelayPublished(
                outboxId = outbox.id ?: outboxId,
                requestId = outbox.requestId,
                eventType = outbox.eventType,
                retryCount = outbox.retryCount,
            )
        } catch (exception: Exception) {
            outbox.markFailed(exception.message)
            ticketingOutboxRepository.save(outbox)
            ticketingPipelineObservability.recordRelayFailure(
                outboxId = outbox.id ?: outboxId,
                requestId = outbox.requestId,
                eventType = outbox.eventType,
                retryCount = outbox.retryCount,
                reason = exception.javaClass.simpleName,
            )
        }
    }
}
