package com.perfo.backend.repository

import com.perfo.backend.entity.TicketingRequest
import org.springframework.data.jpa.repository.JpaRepository

interface TicketingRequestRepository : JpaRepository<TicketingRequest, Long> {
    fun findByRequestId(requestId: String): TicketingRequest?
}
