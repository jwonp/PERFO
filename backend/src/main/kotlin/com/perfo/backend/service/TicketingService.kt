package com.perfo.backend.service

import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.databind.ObjectMapper
import com.perfo.backend.dto.TicketDto
import com.perfo.backend.entity.BookingMode
import com.perfo.backend.entity.BookingOrder
import com.perfo.backend.entity.BookingOrderItem
import com.perfo.backend.entity.Event
import com.perfo.backend.entity.Ticket
import com.perfo.backend.entity.TicketPurchaseResult
import com.perfo.backend.entity.TicketUsageStatus
import com.perfo.backend.entity.TicketingStatus
import com.perfo.backend.observability.TicketingObservability
import com.perfo.backend.repository.EventRepository
import com.perfo.backend.repository.EventItemRepository
import com.perfo.backend.repository.BookingOrderItemRepository
import com.perfo.backend.repository.BookingOrderRepository
import com.perfo.backend.repository.TicketRepository
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.stereotype.Service
import org.springframework.transaction.support.TransactionTemplate
import java.time.Instant

@Service
class TicketingService(
    private val eventRepository: EventRepository,
    private val eventItemRepository: EventItemRepository,
    private val ticketRepository: TicketRepository,
    private val bookingOrderRepository: BookingOrderRepository,
    private val bookingOrderItemRepository: BookingOrderItemRepository,
    private val ticketingRequestLedgerService: TicketingRequestLedgerService,
    private val ticketingOutboxService: TicketingOutboxService,
    private val databaseTimeService: DatabaseTimeService,
    private val ticketingObservability: TicketingObservability,
    private val transactionTemplate: TransactionTemplate,
    private val objectMapper: ObjectMapper,
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
        val itemizedItems = request.items.takeIf { it.isNotEmpty() }?.let(::normalizeRequestedItems)
        val ledger = ticketingRequestLedgerService.createProcessing(
            requestId = request.requestId,
            eventId = request.eventId,
            userId = authenticatedUserId,
            quantity = itemizedItems?.sumOf { it.quantity } ?: request.quantity,
            bookingMode = if (itemizedItems == null) BookingMode.SIMPLE else BookingMode.ITEMIZED,
            itemsSnapshot = itemizedItems?.map {
                TicketDto.TicketingOrderItemResponse(
                    eventItemId = it.eventItemId,
                    itemName = "",
                    quantity = it.quantity,
                )
            }?.let(ticketingRequestLedgerService::writeItemsSnapshot),
        )

        val lockedEventId = if (itemizedItems == null) {
            eventRepository.lockById(request.eventId)
        } else {
            eventRepository.lockForShareById(request.eventId)?.id
        }
            ?: return completeAndMap(
                ledger = ledger,
                result = TicketPurchaseResult.EVENT_NOT_FOUND,
                message = "Event not found",
            )
        val event = eventRepository.findById(lockedEventId).orElseThrow()
        val databaseNow = databaseTimeService.currentInstant()
        if (itemizedItems != null) {
            return submitItemizedRequestTransactional(
                authenticatedUserId = authenticatedUserId,
                ledger = ledger,
                event = event,
                requestedItems = itemizedItems,
                databaseNow = databaseNow,
            )
        }
        if (event.bookingMode == BookingMode.ITEMIZED) {
            return completeAndMap(
                ledger = ledger,
                result = TicketPurchaseResult.INVALID_BOOKING_MODE,
                remainingQuantity = null,
                message = "Itemized event requires items",
                bookingMode = BookingMode.ITEMIZED,
                occurredAt = databaseNow,
            )
        }

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

    private fun submitItemizedRequestTransactional(
        authenticatedUserId: Long,
        ledger: com.perfo.backend.entity.TicketingRequest,
        event: Event,
        requestedItems: List<TicketDto.TicketingItemRequest>,
        databaseNow: Instant,
    ): TicketDto.TicketingRequestSubmitResponse {
        val eventId = requireNotNull(event.id)
        val orderItemsFromRequest = requestedItems.map {
            TicketDto.TicketingOrderItemResponse(
                eventItemId = it.eventItemId,
                itemName = "",
                quantity = it.quantity,
            )
        }
        if (event.bookingMode != BookingMode.ITEMIZED) {
            return completeAndMap(
                ledger = ledger,
                result = TicketPurchaseResult.INVALID_BOOKING_MODE,
                remainingQuantity = event.remainingQuantity,
                message = "Event is not itemized",
                bookingMode = BookingMode.ITEMIZED,
                items = orderItemsFromRequest,
                occurredAt = databaseNow,
            )
        }
        if (!event.active) {
            return completeAndMap(
                ledger = ledger,
                result = TicketPurchaseResult.EVENT_INACTIVE,
                remainingQuantity = event.remainingQuantity,
                message = "Event is inactive",
                bookingMode = BookingMode.ITEMIZED,
                items = orderItemsFromRequest,
                occurredAt = databaseNow,
            )
        }
        if (databaseNow.isBefore(event.saleOpenAt)) {
            return completeAndMap(
                ledger = ledger,
                result = TicketPurchaseResult.NOT_OPEN,
                remainingQuantity = event.remainingQuantity,
                message = "Ticket sales are not open yet",
                bookingMode = BookingMode.ITEMIZED,
                items = orderItemsFromRequest,
                occurredAt = databaseNow,
            )
        }
        if (!databaseNow.isBefore(event.saleCloseAt)) {
            return completeAndMap(
                ledger = ledger,
                result = TicketPurchaseResult.SALE_CLOSED,
                remainingQuantity = event.remainingQuantity,
                message = "Ticket sales are closed",
                bookingMode = BookingMode.ITEMIZED,
                items = orderItemsFromRequest,
                occurredAt = databaseNow,
            )
        }

        val lockedItems = eventItemRepository.lockByEventIdAndIdIn(eventId, requestedItems.map { it.eventItemId })
            .associateBy { requireNotNull(it.id) }
        if (lockedItems.size != requestedItems.size) {
            return completeAndMap(
                ledger = ledger,
                result = TicketPurchaseResult.ITEM_INACTIVE,
                remainingQuantity = event.remainingQuantity,
                message = "Event item is unavailable",
                bookingMode = BookingMode.ITEMIZED,
                items = orderItemsFromRequest,
                occurredAt = databaseNow,
            )
        }
        val orderItems = requestedItems.map { requestItem ->
            val item = requireNotNull(lockedItems[requestItem.eventItemId])
            TicketDto.TicketingOrderItemResponse(
                eventItemId = requestItem.eventItemId,
                itemName = item.name,
                quantity = requestItem.quantity,
            )
        }
        if (lockedItems.values.any { !it.active }) {
            return completeAndMap(
                ledger = ledger,
                result = TicketPurchaseResult.ITEM_INACTIVE,
                remainingQuantity = event.remainingQuantity,
                message = "Event item is inactive",
                bookingMode = BookingMode.ITEMIZED,
                items = orderItems,
                occurredAt = databaseNow,
            )
        }

        val shortages = requestedItems.mapNotNull { requestItem ->
            val item = requireNotNull(lockedItems[requestItem.eventItemId])
            if (item.remainingQuantity < requestItem.quantity) {
                TicketDto.TicketingItemShortageResponse(
                    eventItemId = requestItem.eventItemId,
                    requestedQuantity = requestItem.quantity,
                    availableQuantity = item.remainingQuantity,
                )
            } else {
                null
            }
        }
        if (shortages.isNotEmpty()) {
            return completeAndMap(
                ledger = ledger,
                result = TicketPurchaseResult.INSUFFICIENT_ITEM_INVENTORY,
                remainingQuantity = null,
                message = "Insufficient inventory",
                bookingMode = BookingMode.ITEMIZED,
                items = orderItems,
                shortages = shortages,
                occurredAt = databaseNow,
            )
        }

        val exceededLimit = requestedItems.firstOrNull { requestItem ->
            val item = requireNotNull(lockedItems[requestItem.eventItemId])
            val existingQuantity = bookingOrderItemRepository.sumQuantityByEventIdAndUserIdAndEventItemId(
                eventId = eventId,
                userId = authenticatedUserId,
                eventItemId = requestItem.eventItemId,
            ).toInt()
            existingQuantity + requestItem.quantity > item.maxPerUser
        }
        if (exceededLimit != null) {
            return completeAndMap(
                ledger = ledger,
                result = TicketPurchaseResult.ITEM_MAX_PER_USER_EXCEEDED,
                remainingQuantity = null,
                message = "Item purchase limit exceeded",
                bookingMode = BookingMode.ITEMIZED,
                items = orderItems,
                occurredAt = databaseNow,
            )
        }

        val savedOrder = bookingOrderRepository.save(
            BookingOrder(
                eventId = eventId,
                userId = authenticatedUserId,
                requestId = ledger.requestId,
            ),
        )
        val orderId = requireNotNull(savedOrder.id)
        bookingOrderItemRepository.saveAll(
            requestedItems.map { requestItem ->
                val item = requireNotNull(lockedItems[requestItem.eventItemId])
                item.remainingQuantity -= requestItem.quantity
                BookingOrderItem(
                    orderId = orderId,
                    eventItemId = requestItem.eventItemId,
                    itemNameSnapshot = item.name,
                    quantity = requestItem.quantity,
                )
            },
        )
        eventItemRepository.saveAll(lockedItems.values)

        val completed = ticketingRequestLedgerService.complete(
            request = ledger,
            result = TicketPurchaseResult.SUCCESS,
            remainingQuantity = null,
            message = "Purchase confirmed",
            items = orderItems,
        )
        ticketingOutboxService.savePurchaseSucceeded(
            requestId = completed.requestId,
            eventId = completed.eventId,
            userId = completed.userId,
            quantity = completed.quantity,
            ticketIds = emptyList(),
            ticketNumbers = emptyList(),
            remainingQuantity = null,
            message = completed.message,
            occurredAt = databaseNow,
            bookingMode = BookingMode.ITEMIZED,
            items = orderItems,
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

    private fun validateIdempotentRequestMatch(
        existing: com.perfo.backend.entity.TicketingRequest,
        authenticatedUserId: Long,
        request: TicketDto.TicketingRequestSubmitRequest,
    ) {
        if (existing.userId != authenticatedUserId) {
            throw IllegalArgumentException("requestId already belongs to another user")
        }
        if (existing.eventId != request.eventId) {
            throw IllegalArgumentException("requestId must be retried with the same eventId")
        }
        if (existing.bookingMode == BookingMode.ITEMIZED || request.items.isNotEmpty()) {
            if (existing.bookingMode != BookingMode.ITEMIZED || !itemsMatch(existing.itemsSnapshot, request.items)) {
                throw IllegalArgumentException("requestId must be retried with the same eventId and items")
            }
            return
        }
        if (existing.quantity != request.quantity) {
            throw IllegalArgumentException("requestId must be retried with the same eventId and quantity")
        }
    }

    private fun itemsMatch(snapshot: String?, requestItems: List<TicketDto.TicketingItemRequest>): Boolean {
        val stored = parseStoredItems(snapshot).map { it.eventItemId to it.quantity }.sortedBy { it.first }
        val requested = normalizeRequestedItems(requestItems).map { it.eventItemId to it.quantity }
        return stored == requested
    }

    private fun parseStoredItems(snapshot: String?): List<TicketDto.TicketingOrderItemResponse> {
        if (snapshot.isNullOrBlank()) {
            return emptyList()
        }
        return objectMapper.readValue(
            snapshot,
            object : TypeReference<List<TicketDto.TicketingOrderItemResponse>>() {},
        )
    }

    private fun normalizeRequestedItems(items: List<TicketDto.TicketingItemRequest>): List<TicketDto.TicketingItemRequest> {
        require(items.isNotEmpty()) { "items must not be empty" }
        val normalized = items.groupBy { it.eventItemId }.map { (eventItemId, groupedItems) ->
            TicketDto.TicketingItemRequest(
                eventItemId = eventItemId,
                quantity = groupedItems.sumOf { it.quantity },
            )
        }.sortedBy { it.eventItemId }
        require(normalized.all { it.eventItemId > 0 && it.quantity > 0 }) { "items must contain positive ids and quantities" }
        return normalized
    }

    private fun completeAndMap(
        ledger: com.perfo.backend.entity.TicketingRequest,
        result: TicketPurchaseResult,
        remainingQuantity: Int? = null,
        message: String? = null,
        bookingMode: BookingMode = ledger.bookingMode,
        items: List<TicketDto.TicketingOrderItemResponse> = emptyList(),
        shortages: List<TicketDto.TicketingItemShortageResponse> = emptyList(),
        occurredAt: Instant = databaseTimeService.currentInstant(),
    ): TicketDto.TicketingRequestSubmitResponse {
        val completed = ticketingRequestLedgerService.complete(
            request = ledger,
            result = result,
            remainingQuantity = remainingQuantity,
            shortages = shortages,
            items = items,
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
            bookingMode = bookingMode,
            items = items,
            shortages = shortages,
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
