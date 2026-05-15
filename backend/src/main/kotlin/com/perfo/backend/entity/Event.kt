package com.perfo.backend.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import java.time.LocalDateTime

enum class TicketDiscoveryMode {
    LISTED,
    LINK_ONLY,
}

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

    @Column(name = "sale_open_at", nullable = false)
    var saleOpenAt: Instant = Instant.now(),

    @Column(name = "sale_close_at", nullable = false)
    var saleCloseAt: Instant = Instant.now(),

    @Column(name = "max_per_user", nullable = false)
    var maxPerUser: Int = 1,

    @Column(name = "allow_duplicate", nullable = false)
    var allowDuplicate: Boolean = false,

    @Column(name = "next_ticket_number", nullable = false)
    var nextTicketNumber: Int = 1,

    @Column(nullable = false)
    var active: Boolean = true,

    @Enumerated(EnumType.STRING)
    @Column(name = "discovery_mode", nullable = false)
    var discoveryMode: TicketDiscoveryMode = TicketDiscoveryMode.LISTED,

    @Column(name = "issued_ticket_id")
    var issuedTicketId: Long? = null,
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
            saleOpenAt = saleOpenAt,
            saleCloseAt = saleCloseAt,
            maxPerUser = maxPerUser,
            allowDuplicate = allowDuplicate,
            nextTicketNumber = nextTicketNumber,
            active = active,
            discoveryMode = discoveryMode,
            issuedTicketId = issuedTicketId,
        )
    }
}
