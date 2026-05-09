package com.perfo.backend.repository

import com.perfo.backend.entity.Event
import com.perfo.backend.entity.TicketDiscoveryMode
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param

interface EventRepository : JpaRepository<Event, Long> {
    fun findByActiveTrueAndDiscoveryModeOrderBySaleOpenAtAscIdAsc(discoveryMode: TicketDiscoveryMode): List<Event>

    @Query(
        value = """
        select id
        from events
        where id = :eventId
        for update
        """,
        nativeQuery = true,
    )
    fun lockById(@Param("eventId") eventId: Long): Long?
}
