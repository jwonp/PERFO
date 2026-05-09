package com.perfo.backend.repository

import com.perfo.backend.entity.TicketingOutbox
import com.perfo.backend.entity.TicketingOutboxStatus
import jakarta.persistence.LockModeType
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Lock
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.util.Optional

interface TicketingOutboxRepository : JpaRepository<TicketingOutbox, Long> {
    fun findByRequestId(requestId: String): TicketingOutbox?

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query(
        """
        select o
        from TicketingOutbox o
        where o.id = :id
        """,
    )
    fun findByIdForUpdate(@Param("id") id: Long): Optional<TicketingOutbox>

    fun findByStatusOrderByIdAsc(status: TicketingOutboxStatus, pageable: Pageable): List<TicketingOutbox>

    fun countByStatus(status: TicketingOutboxStatus): Long
}
