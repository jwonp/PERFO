package com.perfo.backend.entity

import com.perfo.backend.dto.TicketDto.IssuedTicketStatus
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
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.OffsetDateTime

@Entity
@Table(name = "issued_tickets")
class IssuedTicket(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null,

    @Column(name = "owner_user_id", nullable = false)
    var ownerUserId: String = "",

    @Column(nullable = false)
    var name: String = "",

    @Column(nullable = false)
    var venue: String = "",

    @Column(name = "google_place_id", nullable = false)
    var googlePlaceId: String = "",

    @Column(name = "detail_address")
    var detailAddress: String? = null,

    @Column(name = "valid_date", nullable = false)
    var validDate: LocalDate = LocalDate.now(),

    @Column(name = "open_at")
    var openAt: OffsetDateTime? = null,

    @Column(name = "image_key")
    var imageKey: String? = null,

    @Column(name = "total_count", nullable = false)
    var totalCount: Int = 0,

    @Column(name = "allow_duplicate", nullable = false)
    var allowDuplicate: Boolean = false,

    @Column(name = "max_per_user", nullable = false)
    var maxPerUser: Int = 1,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var status: IssuedTicketStatus = IssuedTicketStatus.INACTIVE,

    @Column(name = "issued_count", nullable = false)
    var issuedCount: Int = 0,

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    var createdAt: LocalDateTime? = null,

    @UpdateTimestamp
    @Column(name = "updated_at")
    var updatedAt: LocalDateTime? = null,
)
