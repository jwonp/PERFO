package com.perfo.backend.observability

import com.perfo.backend.entity.TicketPurchaseResult
import io.micrometer.core.instrument.MeterRegistry
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Component

@Component
class TicketingObservability(
    private val meterRegistry: MeterRegistry,
) {
    private val logger = LoggerFactory.getLogger(javaClass)

    fun recordReplay(requestId: String, eventId: Long, userId: Long) {
        meterRegistry.counter("perfo.ticketing.request.replay").increment()
        logger.info(
            "ticketing_request_replay requestId={} eventId={} userId={}",
            requestId,
            eventId,
            userId,
        )
    }

    fun recordOutcome(
        requestId: String,
        eventId: Long,
        userId: Long,
        result: TicketPurchaseResult,
        quantity: Int,
        remainingQuantity: Int? = null,
    ) {
        meterRegistry.counter(
            "perfo.ticketing.purchase.result",
            "result",
            result.name,
        ).increment()
        logger.info(
            "ticketing_purchase_result requestId={} eventId={} userId={} quantity={} result={} remainingQuantity={}",
            requestId,
            eventId,
            userId,
            quantity,
            result.name,
            remainingQuantity,
        )
    }
}
