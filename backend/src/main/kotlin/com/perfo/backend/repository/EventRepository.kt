package com.perfo.backend.repository

import com.perfo.backend.entity.Event
import com.perfo.backend.entity.TicketDiscoveryMode
import jakarta.persistence.LockModeType
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Lock
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param

interface EventRepository : JpaRepository<Event, Long> {
    fun findByActiveTrueAndDiscoveryModeOrderBySaleOpenAtAscIdAsc(discoveryMode: TicketDiscoveryMode): List<Event>
    fun findByIssuedTicketIdIn(issuedTicketIds: Collection<Long>): List<Event>

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

    @Lock(LockModeType.PESSIMISTIC_READ)
    @Query("select e from Event e where e.id = :eventId")
    fun lockForShareById(@Param("eventId") eventId: Long): Event?
}
