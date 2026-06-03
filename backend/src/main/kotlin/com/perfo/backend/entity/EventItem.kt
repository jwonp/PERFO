package com.perfo.backend.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.UpdateTimestamp
import java.time.LocalDateTime

@Entity
@Table(name = "event_items")
class EventItem(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null,

    @Column(name = "event_id", nullable = false)
    var eventId: Long = 0,

    @Column(nullable = false, length = 120)
    var name: String = "",

    @Column(length = 1000)
    var description: String? = null,

    @Column(name = "image_url", length = 1000)
    var imageUrl: String? = null,

    @Column
    var price: Int? = null,

    @Column(name = "total_quantity", nullable = false)
    var totalQuantity: Int = 0,

    @Column(name = "remaining_quantity", nullable = false)
    var remainingQuantity: Int = 0,

    @Column(name = "max_per_user", nullable = false)
    var maxPerUser: Int = 1,

    @Column(nullable = false)
    var active: Boolean = true,

    @Column(name = "sort_order", nullable = false)
    var sortOrder: Int = 0,

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    var createdAt: LocalDateTime? = null,

    @UpdateTimestamp
    @Column(name = "updated_at")
    var updatedAt: LocalDateTime? = null,
)
