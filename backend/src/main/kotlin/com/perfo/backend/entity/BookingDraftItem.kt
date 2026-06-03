package com.perfo.backend.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import jakarta.persistence.UniqueConstraint

@Entity
@Table(
    name = "booking_draft_items",
    uniqueConstraints = [UniqueConstraint(name = "uk_booking_draft_items_draft_item", columnNames = ["draft_id", "event_item_id"])],
)
class BookingDraftItem(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null,

    @Column(name = "draft_id", nullable = false)
    var draftId: Long = 0,

    @Column(name = "event_item_id", nullable = false)
    var eventItemId: Long = 0,

    @Column(nullable = false)
    var quantity: Int = 1,
)
