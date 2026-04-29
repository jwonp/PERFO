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

enum class TicketingStatus {
    PENDING,
    PROCESSING,
    SUCCESS,
    FAILED,
    SOLD_OUT,
    DUPLICATE
}

enum class TicketUsageStatus {
    BEFORE_SERVING,
    WAITING,
    NOW_SERVING,
    USED,
    EXPIRED
}

@Entity
@Table(name = "tickets")
class Ticket(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null,

    @Column(name = "event_id", nullable = false)
    var eventId: Long = 0,

    @Column(name = "user_id", nullable = false)
    var userId: Long = 0,

    @Column(name = "ticket_number", nullable = false)
    var ticketNumber: Int = 0,

    @Enumerated(EnumType.STRING)
    @Column(name = "ticketing_status", nullable = false)
    var ticketingStatus: TicketingStatus = TicketingStatus.PENDING,

    @Enumerated(EnumType.STRING)
    @Column(name = "usage_status", nullable = false)
    var usageStatus: TicketUsageStatus = TicketUsageStatus.BEFORE_SERVING,

    @Column(name = "idempotency_key", unique = true, nullable = false)
    var idempotencyKey: String = "",

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    var createdAt: LocalDateTime? = null,

    @UpdateTimestamp
    @Column(name = "updated_at")
    var updatedAt: LocalDateTime? = null
) {
    fun copyWithUsageStatus(nextUsageStatus: TicketUsageStatus): Ticket {
        return Ticket(
            id = id,
            eventId = eventId,
            userId = userId,
            ticketNumber = ticketNumber,
            ticketingStatus = ticketingStatus,
            usageStatus = nextUsageStatus,
            idempotencyKey = idempotencyKey,
            createdAt = createdAt,
            updatedAt = updatedAt
        )
    }
}
