package com.perfo.backend.repository

import com.perfo.backend.entity.BookingOrderItem
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param

interface BookingOrderItemRepository : JpaRepository<BookingOrderItem, Long> {
    fun findByOrderIdOrderByIdAsc(orderId: Long): List<BookingOrderItem>

    @Query(
        value = """
        select coalesce(sum(i.quantity), 0)
        from booking_order_items i
        join booking_orders o on o.id = i.order_id
        where o.event_id = :eventId
          and o.user_id = :userId
          and i.event_item_id = :eventItemId
        """,
        nativeQuery = true,
    )
    fun sumQuantityByEventIdAndUserIdAndEventItemId(
        @Param("eventId") eventId: Long,
        @Param("userId") userId: Long,
        @Param("eventItemId") eventItemId: Long,
    ): Long
}
