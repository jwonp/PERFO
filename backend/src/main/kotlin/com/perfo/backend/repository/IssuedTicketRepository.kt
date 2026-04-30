package com.perfo.backend.repository

import com.perfo.backend.entity.IssuedTicket
import org.springframework.data.jpa.repository.JpaRepository

interface IssuedTicketRepository : JpaRepository<IssuedTicket, Long> {
    fun findByOwnerUserIdOrderByIdDesc(ownerUserId: String): List<IssuedTicket>
}
