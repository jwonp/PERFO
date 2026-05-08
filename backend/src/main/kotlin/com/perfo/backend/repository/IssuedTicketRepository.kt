package com.perfo.backend.repository

import com.perfo.backend.dto.TicketDto.IssuedTicketStatus
import com.perfo.backend.entity.IssuedTicket
import org.springframework.data.jpa.repository.JpaRepository
import java.time.LocalDate
import java.time.OffsetDateTime

interface IssuedTicketRepository : JpaRepository<IssuedTicket, Long> {
    fun findByOwnerUserIdOrderByIdDesc(ownerUserId: String): List<IssuedTicket>
    fun findByStatusAndOpenAtLessThanEqual(status: IssuedTicketStatus, openAt: OffsetDateTime): List<IssuedTicket>
    fun findByStatusInAndValidDateBefore(statuses: Collection<IssuedTicketStatus>, validDate: LocalDate): List<IssuedTicket>
}
