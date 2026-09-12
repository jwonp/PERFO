package com.perfo.backend.repository

import com.perfo.backend.entity.BookingDraft
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.time.Instant

interface BookingDraftRepository : JpaRepository<BookingDraft, Long> {
    fun findByEventIdAndUserId(eventId: Long, userId: Long): BookingDraft?

    @Modifying
    @Query(
        value = """
        delete from booking_drafts
        where event_id in (
            select id
            from events
            where sale_close_at < :cutoff
        )
        """,
        nativeQuery = true,
    )
    fun deleteExpiredDrafts(@Param("cutoff") cutoff: Instant): Int
}
