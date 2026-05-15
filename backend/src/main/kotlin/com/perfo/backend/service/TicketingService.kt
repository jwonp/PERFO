package com.perfo.backend.service

import com.perfo.backend.dto.TicketDto
import com.perfo.backend.entity.Event
import com.perfo.backend.entity.Ticket
import com.perfo.backend.entity.TicketPurchaseResult
import com.perfo.backend.entity.TicketUsageStatus
import com.perfo.backend.entity.TicketingStatus
import com.perfo.backend.observability.TicketingObservability
import com.perfo.backend.repository.EventRepository
import com.perfo.backend.repository.TicketRepository
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.stereotype.Service
import org.springframework.transaction.support.TransactionTemplate
import java.time.Instant

@Service
class TicketingService(
    private val eventRepository: EventRepository,
    private val ticketRepository: TicketRepository,
    private val ticketingRequestLedgerService: TicketingRequestLedgerService,
    private val ticketingOutboxService: TicketingOutboxService,
    private val databaseTimeService: DatabaseTimeService,
    private val ticketingObservability: TicketingObservability,
    private val transactionTemplate: TransactionTemplate,
) {
    // Phase 1 keeps schema changes small enough for local ddl-auto flows, but production should move
    // the new event columns and ticketing ledger table into explicit database migrations.
    fun submitRequest(
        authenticatedUserId: Long,
        request: TicketDto.TicketingRequestSubmitRequest,
    ): TicketDto.TicketingRequestSubmitResponse {
        ticketingRequestLedgerService.findByRequestId(request.requestId)?.let {
            validateIdempotentRequestMatch(it, authenticatedUserId, request)
            ticketingObservability.recordReplay(
                requestId = request.requestId,
                eventId = request.eventId,
                userId = authenticatedUserId,
            )
            return ticketingRequestLedgerService.toResponse(it).also { response ->
                ticketingObservability.recordOutcome(
                    requestId = response.requestId,
                    eventId = response.eventId,
                    userId = authenticatedUserId,
                    result = response.result,
                    quantity = response.quantity,
                    remainingQuantity = response.remainingQuantity,
                )
            }
        }

        return try {
            transactionTemplate.execute<TicketDto.TicketingRequestSubmitResponse> {
                submitRequestTransactional(authenticatedUserId, request)
            } ?: throw IllegalStateException("Ticketing transaction did not produce a response")
        } catch (_: DataIntegrityViolationException) {
            val existing = ticketingRequestLedgerService.findByRequestId(request.requestId)
                ?: throw IllegalStateException("Ticketing request ledger was not persisted")
            validateIdempotentRequestMatch(existing, authenticatedUserId, request)
            ticketingObservability.recordReplay(
                requestId = request.requestId,
                eventId = request.eventId,
                userId = authenticatedUserId,
            )
            ticketingRequestLedgerService.toResponse(existing).also { response ->
                ticketingObservability.recordOutcome(
                    requestId = response.requestId,
                    eventId = response.eventId,
                    userId = authenticatedUserId,
                    result = response.result,
                    quantity = response.quantity,
                    remainingQuantity = response.remainingQuantity,
                )
            }
        }
    }

    private fun submitRequestTransactional(
        authenticatedUserId: Long,
        request: TicketDto.TicketingRequestSubmitRequest,
    ): TicketDto.TicketingRequestSubmitResponse {
        val ledger = ticketingRequestLedgerService.createProcessing(
            requestId = request.requestId,
            eventId = request.eventId,
            userId = authenticatedUserId,
            quantity = request.quantity,
        )

        val lockedEventId = eventRepository.lockById(request.eventId)
            ?: return completeAndMap(
                ledger = ledger,
                result = TicketPurchaseResult.EVENT_NOT_FOUND,
                message = "Event not found",
            )
        val event = eventRepository.findById(lockedEventId).orElseThrow()
        val databaseNow = databaseTimeService.currentInstant()

        if (!event.active) {
            return completeAndMap(
                ledger = ledger,
                result = TicketPurchaseResult.EVENT_INACTIVE,
                remainingQuantity = event.remainingQuantity,
                message = "Event is inactive",
            )
        }

        if (databaseNow.isBefore(event.saleOpenAt)) {
            return completeAndMap(
                ledger = ledger,
                result = TicketPurchaseResult.NOT_OPEN,
                remainingQuantity = event.remainingQuantity,
                message = "Ticket sales are not open yet",
            )
        }

        if (!databaseNow.isBefore(event.saleCloseAt)) {
            return completeAndMap(
                ledger = ledger,
                result = TicketPurchaseResult.SALE_CLOSED,
                remainingQuantity = event.remainingQuantity,
                message = "Ticket sales are closed",
            )
        }

        val existingPurchasedCount = ticketRepository.countByEventIdAndUserId(event.id!!, authenticatedUserId)

        if (!event.allowDuplicate && existingPurchasedCount > 0) {
            return completeAndMap(
                ledger = ledger,
                result = TicketPurchaseResult.DUPLICATE_PURCHASE,
                remainingQuantity = event.remainingQuantity,
                message = "Duplicate purchases are not allowed",
            )
        }

        if (existingPurchasedCount + request.quantity > event.maxPerUser) {
            return completeAndMap(
                ledger = ledger,
                result = TicketPurchaseResult.MAX_PER_USER_EXCEEDED,
                remainingQuantity = event.remainingQuantity,
                message = "Purchase limit exceeded",
            )
        }

        if (event.remainingQuantity < request.quantity) {
            return completeAndMap(
                ledger = ledger,
                result = TicketPurchaseResult.SOLD_OUT,
                remainingQuantity = event.remainingQuantity,
                message = "Insufficient inventory",
            )
        }

        val initialTicketNumber = event.nextTicketNumber
        val savedTickets = ticketRepository.saveAll(
            (0 until request.quantity).map { offset ->
                Ticket(
                    eventId = event.id!!,
                    userId = authenticatedUserId,
                    ticketNumber = initialTicketNumber + offset,
                    ticketingStatus = TicketingStatus.SUCCESS,
                    usageStatus = resolveInitialUsageStatus(event),
                    idempotencyKey = "${request.requestId}:${offset + 1}",
                )
            },
        )

        event.remainingQuantity -= request.quantity
        event.nextTicketNumber += request.quantity
        eventRepository.save(event)

        val completed = ticketingRequestLedgerService.complete(
            request = ledger,
            result = TicketPurchaseResult.SUCCESS,
            ticketIds = savedTickets.mapNotNull { it.id },
            ticketNumbers = savedTickets.map { it.ticketNumber },
            remainingQuantity = event.remainingQuantity,
            message = "Purchase confirmed",
        )
        ticketingOutboxService.savePurchaseSucceeded(
            requestId = completed.requestId,
            eventId = completed.eventId,
            userId = completed.userId,
            quantity = completed.quantity,
            ticketIds = savedTickets.mapNotNull { it.id },
            ticketNumbers = savedTickets.map { it.ticketNumber },
            remainingQuantity = event.remainingQuantity,
            message = completed.message,
            occurredAt = databaseNow,
        )
        return ticketingRequestLedgerService.toResponse(completed).also { response ->
            ticketingObservability.recordOutcome(
                requestId = response.requestId,
                eventId = response.eventId,
                userId = authenticatedUserId,
                result = response.result,
                quantity = response.quantity,
                remainingQuantity = response.remainingQuantity,
            )
        }
    }

    private fun resolveInitialUsageStatus(event: Event): TicketUsageStatus {
        val now = TicketingTime.eventNow()
        if (now.isAfter(event.validUntil)) {
            return TicketUsageStatus.EXPIRED
        }
        if (now.isBefore(event.validFrom)) {
            return TicketUsageStatus.BEFORE_SERVING
        }
        return TicketUsageStatus.NOW_SERVING
    }

    private fun validateIdempotentRequestMatch(
        existing: com.perfo.backend.entity.TicketingRequest,
        authenticatedUserId: Long,
        request: TicketDto.TicketingRequestSubmitRequest,
    ) {
        if (existing.userId != authenticatedUserId) {
            throw IllegalArgumentException("requestId already belongs to another user")
        }
        if (existing.eventId != request.eventId || existing.quantity != request.quantity) {
            throw IllegalArgumentException("requestId must be retried with the same eventId and quantity")
        }
    }

    private fun completeAndMap(
        ledger: com.perfo.backend.entity.TicketingRequest,
        result: TicketPurchaseResult,
        remainingQuantity: Int? = null,
        message: String? = null,
        occurredAt: Instant = databaseTimeService.currentInstant(),
    ): TicketDto.TicketingRequestSubmitResponse {
        val completed = ticketingRequestLedgerService.complete(
            request = ledger,
            result = result,
            remainingQuantity = remainingQuantity,
            message = message,
        )
        ticketingOutboxService.savePurchaseRejected(
            requestId = completed.requestId,
            eventId = completed.eventId,
            userId = completed.userId,
            quantity = completed.quantity,
            result = completed.result,
            remainingQuantity = completed.remainingQuantity,
            message = completed.message,
            occurredAt = occurredAt,
        )
        return ticketingRequestLedgerService.toResponse(completed).also { response ->
            ticketingObservability.recordOutcome(
                requestId = response.requestId,
                eventId = response.eventId,
                userId = completed.userId,
                result = response.result,
                quantity = response.quantity,
                remainingQuantity = response.remainingQuantity,
            )
        }
    }
}
