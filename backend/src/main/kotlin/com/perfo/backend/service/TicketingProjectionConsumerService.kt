package com.perfo.backend.service

import com.fasterxml.jackson.databind.ObjectMapper
import com.perfo.backend.entity.TicketPurchaseResult
import com.perfo.backend.entity.TicketingOutboxEventType
import com.perfo.backend.entity.TicketingPurchaseProjection
import com.perfo.backend.observability.TicketingPipelineObservability
import com.perfo.backend.repository.TicketingPurchaseProjectionRepository
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.kafka.annotation.KafkaListener
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class TicketingProjectionConsumerService(
    private val ticketingPurchaseProjectionRepository: TicketingPurchaseProjectionRepository,
    private val objectMapper: ObjectMapper,
    private val ticketingPipelineObservability: TicketingPipelineObservability,
) {
    @KafkaListener(
        topics = ["\${app.ticketing.outbox.topic:ticketing.purchase-results}"],
        groupId = "\${app.ticketing.projection.group-id:ticketing-projection-v1}",
        autoStartup = "\${app.ticketing.projection.consumer-enabled:false}",
    )
    fun consume(message: String) {
        consumeMessage(message)
    }

    @Transactional
    fun consumeMessage(message: String): Boolean {
        val envelope = try {
            objectMapper.readValue(message, TicketingOutboxMessage::class.java)
        } catch (exception: Exception) {
            ticketingPipelineObservability.recordProjectionFailure(reason = "invalid_message")
            throw exception
        }

        validateEnvelope(envelope)

        if (ticketingPurchaseProjectionRepository.existsByOutboxId(envelope.outboxId)) {
            ticketingPipelineObservability.recordProjectionDuplicateSkip(
                outboxId = envelope.outboxId,
                requestId = envelope.requestId,
                eventType = envelope.eventType,
            )
            return false
        }

        val payload = envelope.payload
        return try {
            ticketingPurchaseProjectionRepository.save(
                TicketingPurchaseProjection(
                    outboxId = envelope.outboxId,
                    requestId = envelope.requestId,
                    eventId = payload.eventId,
                    userId = payload.userId,
                    eventType = envelope.eventType,
                    result = payload.result,
                    quantity = payload.quantity,
                    ticketIds = payload.ticketIds.joinToString(",").ifBlank { null },
                    ticketNumbers = payload.ticketNumbers.joinToString(",").ifBlank { null },
                    remainingQuantity = payload.remainingQuantity,
                    message = payload.message,
                    occurredAt = payload.occurredAt,
                ),
            )
            ticketingPipelineObservability.recordProjectionConsumed(
                outboxId = envelope.outboxId,
                requestId = envelope.requestId,
                eventType = envelope.eventType,
                result = payload.result,
                occurredAt = payload.occurredAt,
            )
            true
        } catch (exception: DataIntegrityViolationException) {
            if (ticketingPurchaseProjectionRepository.existsByOutboxId(envelope.outboxId)) {
                ticketingPipelineObservability.recordProjectionDuplicateSkip(
                    outboxId = envelope.outboxId,
                    requestId = envelope.requestId,
                    eventType = envelope.eventType,
                )
                false
            } else {
                recordPersistenceFailure(envelope)
                throw exception
            }
        } catch (exception: Exception) {
            recordPersistenceFailure(envelope)
            throw exception
        }
    }

    private fun validateEnvelope(envelope: TicketingOutboxMessage) {
        val payload = envelope.payload
        if (envelope.requestId != payload.requestId) {
            recordContractFailure(envelope)
            throw IllegalArgumentException("Outbox message requestId does not match payload requestId")
        }
        if (envelope.outboxId <= 0 || payload.eventId <= 0 || payload.userId <= 0 || payload.quantity <= 0) {
            recordContractFailure(envelope)
            throw IllegalArgumentException("Outbox message contains invalid identifiers or quantity")
        }
        val hasValidResultForType = when (envelope.eventType) {
            TicketingOutboxEventType.PURCHASE_SUCCEEDED -> payload.result == TicketPurchaseResult.SUCCESS
            TicketingOutboxEventType.PURCHASE_REJECTED -> payload.result != TicketPurchaseResult.SUCCESS
        }
        if (!hasValidResultForType) {
            recordContractFailure(envelope)
            throw IllegalArgumentException("Outbox message eventType and result are inconsistent")
        }
    }

    private fun recordContractFailure(envelope: TicketingOutboxMessage) {
        ticketingPipelineObservability.recordProjectionFailure(
            reason = "invalid_contract",
            outboxId = envelope.outboxId,
            requestId = envelope.requestId,
            eventType = envelope.eventType,
        )
    }

    private fun recordPersistenceFailure(envelope: TicketingOutboxMessage) {
        ticketingPipelineObservability.recordProjectionFailure(
            reason = "persistence_error",
            outboxId = envelope.outboxId,
            requestId = envelope.requestId,
            eventType = envelope.eventType,
        )
    }
}

data class TicketingOutboxMessage(
    val outboxId: Long,
    val requestId: String,
    val eventType: TicketingOutboxEventType,
    val payload: TicketingOutboxPayload,
)
