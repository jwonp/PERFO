package com.perfo.backend.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.UpdateTimestamp
import java.time.LocalDateTime

enum class TicketingOutboxEventType {
    PURCHASE_SUCCEEDED,
    PURCHASE_REJECTED,
}

enum class TicketingOutboxStatus {
    PENDING,
    PUBLISHED,
    FAILED,
}

@Entity
@Table(name = "ticketing_outbox")
class TicketingOutbox(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null,

    @Column(name = "request_id", nullable = false, unique = true, length = 120)
    var requestId: String = "",

    @Column(name = "event_id", nullable = false)
    var eventId: Long = 0,

    @Column(name = "user_id", nullable = false)
    var userId: Long = 0,

    @Column(name = "aggregate_type", nullable = false, length = 64)
    var aggregateType: String = "TICKETING_REQUEST",

    @Column(name = "aggregate_id", nullable = false, length = 120)
    var aggregateId: String = "",

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 64)
    var eventType: TicketingOutboxEventType = TicketingOutboxEventType.PURCHASE_REJECTED,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    var status: TicketingOutboxStatus = TicketingOutboxStatus.PENDING,

    @Column(nullable = false, columnDefinition = "text")
    var payload: String = "",

    @Column(name = "retry_count", nullable = false)
    var retryCount: Int = 0,

    @Column(name = "published_at")
    var publishedAt: LocalDateTime? = null,

    @Column(name = "last_error", length = 1000)
    var lastError: String? = null,

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    var createdAt: LocalDateTime? = null,

    @UpdateTimestamp
    @Column(name = "updated_at")
    var updatedAt: LocalDateTime? = null,
) {
    fun markPublished(publishedAt: LocalDateTime): TicketingOutbox {
        status = TicketingOutboxStatus.PUBLISHED
        this.publishedAt = publishedAt
        lastError = null
        return this
    }

    fun markFailed(lastError: String?): TicketingOutbox {
        status = TicketingOutboxStatus.FAILED
        retryCount += 1
        this.lastError = lastError?.take(1000)
        return this
    }
}
