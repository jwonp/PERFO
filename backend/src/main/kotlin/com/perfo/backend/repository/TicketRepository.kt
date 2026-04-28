package com.perfo.backend.repository

import com.perfo.backend.entity.Ticket
import org.springframework.data.jpa.repository.JpaRepository

interface TicketRepository : JpaRepository<Ticket, Long> {
    fun findByIdempotencyKey(idempotencyKey: String): Ticket?
    fun countByEventIdAndUserId(eventId: Long, userId: Long): Int
}
