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
import java.time.Instant
import java.time.LocalDateTime

@Entity
@Table(name = "ticketing_purchase_projection")
class TicketingPurchaseProjection(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null,

    @Column(name = "outbox_id", nullable = false, unique = true)
    var outboxId: Long = 0,

    @Column(name = "request_id", nullable = false, length = 120)
    var requestId: String = "",

    @Column(name = "event_id", nullable = false)
    var eventId: Long = 0,

    @Column(name = "user_id", nullable = false)
    var userId: Long = 0,

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 64)
    var eventType: TicketingOutboxEventType = TicketingOutboxEventType.PURCHASE_REJECTED,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 64)
    var result: TicketPurchaseResult = TicketPurchaseResult.EVENT_NOT_FOUND,

    @Column(nullable = false)
    var quantity: Int = 0,

    @Column(name = "ticket_ids", length = 1000)
    var ticketIds: String? = null,

    @Column(name = "ticket_numbers", length = 1000)
    var ticketNumbers: String? = null,

    @Column(name = "remaining_quantity")
    var remainingQuantity: Int? = null,

    @Enumerated(EnumType.STRING)
    @Column(name = "booking_mode", nullable = false, length = 32)
    var bookingMode: BookingMode = BookingMode.SIMPLE,

    @Column(name = "order_items", columnDefinition = "text")
    var orderItems: String? = null,

    @Column(length = 255)
    var message: String? = null,

    @Column(name = "occurred_at", nullable = false)
    var occurredAt: Instant = Instant.EPOCH,

    @CreationTimestamp
    @Column(name = "projected_at", updatable = false)
    var projectedAt: LocalDateTime? = null,
)
