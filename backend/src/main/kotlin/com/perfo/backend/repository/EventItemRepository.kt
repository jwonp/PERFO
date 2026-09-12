package com.perfo.backend.repository

import com.perfo.backend.entity.EventItem
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param

interface EventItemRepository : JpaRepository<EventItem, Long> {
    fun findByEventIdAndActiveTrueOrderBySortOrderAscIdAsc(eventId: Long): List<EventItem>
    fun findByEventIdOrderBySortOrderAscIdAsc(eventId: Long): List<EventItem>

    @Query(
        value = """
        select *
        from event_items
        where event_id = :eventId
          and id in (:itemIds)
        order by id
        for update
        """,
        nativeQuery = true,
    )
    fun lockByEventIdAndIdIn(
        @Param("eventId") eventId: Long,
        @Param("itemIds") itemIds: Collection<Long>,
    ): List<EventItem>
}
