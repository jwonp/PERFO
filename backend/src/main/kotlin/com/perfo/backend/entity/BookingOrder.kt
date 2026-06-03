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
import java.time.LocalDateTime

enum class BookingOrderStatus {
    CONFIRMED,
}

@Entity
@Table(name = "booking_orders")
class BookingOrder(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null,

    @Column(name = "event_id", nullable = false)
    var eventId: Long = 0,

    @Column(name = "user_id", nullable = false)
    var userId: Long = 0,

    @Column(name = "request_id", nullable = false, unique = true, length = 120)
    var requestId: String = "",

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    var status: BookingOrderStatus = BookingOrderStatus.CONFIRMED,

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    var createdAt: LocalDateTime? = null,
)
