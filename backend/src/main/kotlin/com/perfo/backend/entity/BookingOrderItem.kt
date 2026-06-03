package com.perfo.backend.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table

@Entity
@Table(name = "booking_order_items")
class BookingOrderItem(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null,

    @Column(name = "order_id", nullable = false)
    var orderId: Long = 0,

    @Column(name = "event_item_id", nullable = false)
    var eventItemId: Long = 0,

    @Column(name = "item_name_snapshot", nullable = false, length = 120)
    var itemNameSnapshot: String = "",

    @Column(nullable = false)
    var quantity: Int = 1,
)
