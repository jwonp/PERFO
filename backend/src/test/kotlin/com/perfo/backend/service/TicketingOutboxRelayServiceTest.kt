package com.perfo.backend.service

import com.fasterxml.jackson.databind.ObjectMapper
import com.perfo.backend.entity.TicketPurchaseResult
import com.perfo.backend.entity.TicketingOutbox
import com.perfo.backend.entity.TicketingOutboxEventType
import com.perfo.backend.entity.TicketingOutboxStatus
import com.perfo.backend.repository.TicketingOutboxRepository
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.mockito.kotlin.any
import org.mockito.kotlin.eq
import org.mockito.kotlin.argumentCaptor
import org.mockito.kotlin.whenever
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import io.micrometer.core.instrument.MeterRegistry
import org.springframework.kafka.core.KafkaTemplate
import org.springframework.kafka.support.SendResult
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.context.TestPropertySource
import org.springframework.test.context.bean.override.mockito.MockitoBean
import java.time.Instant
import java.util.concurrent.CompletableFuture

@SpringBootTest
@ActiveProfiles("test")
@TestPropertySource(
    properties = [
        "app.ticketing.outbox.relay-enabled=true",
        "app.ticketing.outbox.batch-size=10",
        "app.ticketing.outbox.retry-backoff-seconds=0",
        "app.ticketing.outbox.max-retry-count=3",
        "app.ticketing.outbox.topic=test.ticketing.purchase-results",
    ],
)
class TicketingOutboxRelayServiceTest {

    @Autowired
    private lateinit var ticketingOutboxRepository: TicketingOutboxRepository

    @Autowired
    private lateinit var ticketingOutboxRelayService: TicketingOutboxRelayService

    @Autowired
    private lateinit var objectMapper: ObjectMapper

    @Autowired
    private lateinit var meterRegistry: MeterRegistry

    @field:MockitoBean
    private lateinit var kafkaTemplate: KafkaTemplate<String, String>

    @BeforeEach
    fun setUp() {
        ticketingOutboxRepository.deleteAll()
    }

    @Test
    @DisplayName("pending outbox 발행 성공 시 PUBLISHED로 전이된다")
    fun relayPendingBatchOnce_marksPublished() {
        val outbox = ticketingOutboxRepository.save(pendingOutbox("relay_success_0001"))
        val messageCaptor = argumentCaptor<String>()
        val successBefore = relayCounter("perfo.ticketing.outbox.publish.success", "eventType", "PURCHASE_SUCCEEDED")
        whenever(kafkaTemplate.send(eq("test.ticketing.purchase-results"), eq(outbox.requestId), any()))
            .thenReturn(CompletableFuture.completedFuture(org.mockito.kotlin.mock<SendResult<String, String>>()))

        val processedCount = ticketingOutboxRelayService.relayPendingBatchOnce()

        val persisted = ticketingOutboxRepository.findById(outbox.id!!).orElseThrow()
        assertThat(processedCount).isEqualTo(1)
        assertThat(persisted.status).isEqualTo(TicketingOutboxStatus.PUBLISHED)
        assertThat(persisted.publishedAt).isNotNull()
        assertThat(persisted.retryCount).isZero()
        assertThat(persisted.lastError).isNull()
        assertThat(relayCounter("perfo.ticketing.outbox.publish.success", "eventType", "PURCHASE_SUCCEEDED"))
            .isEqualTo(successBefore + 1.0)
        org.mockito.kotlin.verify(kafkaTemplate).send(eq("test.ticketing.purchase-results"), eq(outbox.requestId), messageCaptor.capture())
        val envelope = objectMapper.readValue(messageCaptor.firstValue, TicketingOutboxMessage::class.java)
        assertThat(envelope.outboxId).isEqualTo(outbox.id)
        assertThat(envelope.eventType).isEqualTo(TicketingOutboxEventType.PURCHASE_SUCCEEDED)
        assertThat(gaugeValue("perfo.ticketing.outbox.pending.count")).isZero()
    }

    @Test
    @DisplayName("pending outbox 발행 실패 시 FAILED로 전이되고 retryCount가 증가한다")
    fun relayPendingBatchOnce_marksFailed() {
        val outbox = ticketingOutboxRepository.save(pendingOutbox("relay_failure_0001"))
        val failureBefore = relayCounter(
            "perfo.ticketing.outbox.publish.failure",
            "eventType",
            "PURCHASE_SUCCEEDED",
            "reason",
            "ExecutionException",
        )
        whenever(kafkaTemplate.send(eq("test.ticketing.purchase-results"), eq(outbox.requestId), any()))
            .thenReturn(CompletableFuture.failedFuture(RuntimeException("kafka unavailable")))

        val processedCount = ticketingOutboxRelayService.relayPendingBatchOnce()

        val persisted = ticketingOutboxRepository.findById(outbox.id!!).orElseThrow()
        assertThat(processedCount).isEqualTo(1)
        assertThat(persisted.status).isEqualTo(TicketingOutboxStatus.FAILED)
        assertThat(persisted.retryCount).isEqualTo(1)
        assertThat(persisted.lastError).contains("kafka unavailable")
        assertThat(persisted.publishedAt).isNull()
        assertThat(relayCounter(
            "perfo.ticketing.outbox.publish.failure",
            "eventType",
            "PURCHASE_SUCCEEDED",
            "reason",
            "ExecutionException",
        )).isEqualTo(failureBefore + 1.0)
        assertThat(gaugeValue("perfo.ticketing.outbox.failed.count")).isEqualTo(1.0)
    }

    @Test
    @DisplayName("FAILED outbox는 재시도 발행 성공 시 PUBLISHED로 전이된다")
    fun publishSingle_retriesFailedOutbox() {
        val outbox = ticketingOutboxRepository.save(
            pendingOutbox("relay_retry_success_0001").apply {
                status = TicketingOutboxStatus.FAILED
                retryCount = 1
                lastError = "previous failure"
            },
        )
        val retryBefore = relayCounter("perfo.ticketing.outbox.publish.retry", "eventType", "PURCHASE_SUCCEEDED")
        whenever(kafkaTemplate.send(eq("test.ticketing.purchase-results"), eq(outbox.requestId), any()))
            .thenReturn(CompletableFuture.completedFuture(org.mockito.kotlin.mock<SendResult<String, String>>()))

        ticketingOutboxRelayService.publishSingle(outbox.id!!)

        val persisted = ticketingOutboxRepository.findById(outbox.id!!).orElseThrow()
        assertThat(persisted.status).isEqualTo(TicketingOutboxStatus.PUBLISHED)
        assertThat(persisted.retryCount).isEqualTo(1)
        assertThat(persisted.lastError).isNull()
        assertThat(persisted.publishedAt).isNotNull()
        assertThat(relayCounter("perfo.ticketing.outbox.publish.retry", "eventType", "PURCHASE_SUCCEEDED"))
            .isEqualTo(retryBefore + 1.0)
    }

    @Test
    @DisplayName("max retry count를 넘긴 FAILED outbox는 다시 집지 않는다")
    fun relayPendingBatchOnce_skipsFailedOutboxOverRetryLimit() {
        ticketingOutboxRepository.save(
            pendingOutbox("relay_retry_skipped_0001").apply {
                status = TicketingOutboxStatus.FAILED
                retryCount = 3
                lastError = "too many failures"
            },
        )

        val processedCount = ticketingOutboxRelayService.relayPendingBatchOnce()

        assertThat(processedCount).isZero()
        val persisted = ticketingOutboxRepository.findByRequestId("relay_retry_skipped_0001")
        assertThat(persisted?.status).isEqualTo(TicketingOutboxStatus.FAILED)
        assertThat(persisted?.retryCount).isEqualTo(3)
    }

    private fun pendingOutbox(requestId: String): TicketingOutbox {
        return TicketingOutbox(
            requestId = requestId,
            eventId = 11L,
            userId = 42L,
            aggregateId = requestId,
            eventType = TicketingOutboxEventType.PURCHASE_SUCCEEDED,
            status = TicketingOutboxStatus.PENDING,
            payload = """
                {"requestId":"$requestId","eventId":11,"userId":42,"quantity":1,"result":"${TicketPurchaseResult.SUCCESS}","ticketIds":[101],"ticketNumbers":[1],"remainingQuantity":9,"message":"Purchase confirmed","occurredAt":"${Instant.parse("2026-05-08T13:00:00Z")}"}
            """.trimIndent(),
        )
    }

    private fun relayCounter(name: String, vararg tags: String): Double {
        return meterRegistry.find(name).tags(*tags).counter()?.count() ?: 0.0
    }

    private fun gaugeValue(name: String): Double {
        return meterRegistry.find(name).gauge()?.value() ?: 0.0
    }
}
