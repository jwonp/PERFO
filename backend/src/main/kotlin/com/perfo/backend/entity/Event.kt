package com.perfo.backend.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.LocalDateTime

@Entity
@Table(name = "events")
class Event(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null,

    @Column(nullable = false)
    var name: String = "",

    @Column(nullable = false)
    var venue: String = "",

    @Column(name = "valid_from", nullable = false)
    var validFrom: LocalDateTime = LocalDateTime.now(),

    @Column(name = "valid_until", nullable = false)
    var validUntil: LocalDateTime = LocalDateTime.now(),

    @Column(name = "total_quantity", nullable = false)
    var totalQuantity: Int = 0,

    @Column(name = "remaining_quantity", nullable = false)
    var remainingQuantity: Int = 0,

    @Column(name = "max_per_user", nullable = false)
    var maxPerUser: Int = 1,

    @Column(nullable = false)
    var active: Boolean = true
) {
    fun copyWithRemainingQuantity(nextRemainingQuantity: Int): Event {
        return Event(
            id = id,
            name = name,
            venue = venue,
            validFrom = validFrom,
            validUntil = validUntil,
            totalQuantity = totalQuantity,
            remainingQuantity = nextRemainingQuantity,
            maxPerUser = maxPerUser,
            active = active
        )
    }
}
