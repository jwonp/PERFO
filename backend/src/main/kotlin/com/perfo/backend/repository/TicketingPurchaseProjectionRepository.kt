package com.perfo.backend.repository

import com.perfo.backend.entity.TicketingPurchaseProjection
import com.perfo.backend.entity.TicketingOutboxEventType
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.domain.Pageable

interface TicketingPurchaseProjectionRepository : JpaRepository<TicketingPurchaseProjection, Long> {
    fun existsByOutboxId(outboxId: Long): Boolean
    fun findByOutboxId(outboxId: Long): TicketingPurchaseProjection?
    fun countByEventId(eventId: Long): Long
    fun countByEventIdAndEventType(eventId: Long, eventType: TicketingOutboxEventType): Long
    fun findByEventIdOrderByOccurredAtDescOutboxIdDesc(eventId: Long, pageable: Pageable): List<TicketingPurchaseProjection>
}
