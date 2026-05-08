package com.perfo.backend.repository

import com.perfo.backend.entity.Ticket
import com.perfo.backend.entity.TicketUsageStatus
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param

interface TicketRepository : JpaRepository<Ticket, Long> {
    fun findByIdempotencyKey(idempotencyKey: String): Ticket?
    fun findByUserIdOrderByIdDesc(userId: Long): List<Ticket>
    fun countByEventIdAndUserId(eventId: Long, userId: Long): Int
    fun findByEventIdAndUserIdOrderByIdAsc(eventId: Long, userId: Long): List<Ticket>

    @Modifying
    @Query(
        """
        update Ticket t
        set t.usageStatus = :nextStatus
        where t.id = :ticketId
          and t.usageStatus <> com.perfo.backend.entity.TicketUsageStatus.USED
        """
    )
    fun markUsedIfNotUsed(
        @Param("ticketId") ticketId: Long,
        @Param("nextStatus") nextStatus: TicketUsageStatus = TicketUsageStatus.USED,
    ): Int
}
