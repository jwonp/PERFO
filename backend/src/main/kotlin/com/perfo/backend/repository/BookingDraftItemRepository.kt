package com.perfo.backend.repository

import com.perfo.backend.entity.BookingDraftItem
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.time.Instant

interface BookingDraftItemRepository : JpaRepository<BookingDraftItem, Long> {
    fun findByDraftIdOrderByIdAsc(draftId: Long): List<BookingDraftItem>
    fun deleteByDraftId(draftId: Long)

    @Modifying
    @Query(
        value = """
        delete from booking_draft_items
        where draft_id in (
            select d.id
            from booking_drafts d
            join events e on e.id = d.event_id
            where e.sale_close_at < :cutoff
        )
        """,
        nativeQuery = true,
    )
    fun deleteExpiredDraftItems(@Param("cutoff") cutoff: Instant): Int
}
