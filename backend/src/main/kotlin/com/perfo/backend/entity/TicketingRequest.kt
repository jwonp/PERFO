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

enum class TicketPurchaseResult {
    PROCESSING,
    SUCCESS,
    NOT_OPEN,
    SALE_CLOSED,
    SOLD_OUT,
    DUPLICATE_PURCHASE,
    MAX_PER_USER_EXCEEDED,
    EVENT_INACTIVE,
    EVENT_NOT_FOUND,
}

@Entity
@Table(name = "ticketing_requests")
class TicketingRequest(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null,

    @Column(name = "request_id", nullable = false, unique = true, length = 120)
    var requestId: String = "",

    @Column(name = "event_id", nullable = false)
    var eventId: Long = 0,

    @Column(name = "user_id", nullable = false)
    var userId: Long = 0,

    @Column(nullable = false)
    var quantity: Int = 1,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var result: TicketPurchaseResult = TicketPurchaseResult.PROCESSING,

    @Column(name = "ticket_ids", length = 1000)
    var ticketIds: String? = null,

    @Column(name = "ticket_numbers", length = 1000)
    var ticketNumbers: String? = null,

    @Column(name = "remaining_quantity")
    var remainingQuantity: Int? = null,

    @Column(length = 255)
    var message: String? = null,

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    var createdAt: LocalDateTime? = null,

    @UpdateTimestamp
    @Column(name = "updated_at")
    var updatedAt: LocalDateTime? = null,
)
