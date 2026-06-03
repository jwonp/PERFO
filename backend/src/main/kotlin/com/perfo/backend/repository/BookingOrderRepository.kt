package com.perfo.backend.repository

import com.perfo.backend.entity.BookingOrder
import org.springframework.data.jpa.repository.JpaRepository

interface BookingOrderRepository : JpaRepository<BookingOrder, Long> {
    fun findByRequestId(requestId: String): BookingOrder?
}
