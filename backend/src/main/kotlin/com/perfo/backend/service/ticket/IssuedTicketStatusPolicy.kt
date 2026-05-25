package com.perfo.backend.service.ticket

import com.perfo.backend.dto.TicketDto.IssuedTicketStatus
import java.time.LocalDate
import java.time.OffsetDateTime

object IssuedTicketStatusPolicy {
    fun resolveNextStatus(
        currentStatus: IssuedTicketStatus,
        requestedStatus: IssuedTicketStatus?,
        openAt: OffsetDateTime?,
        validDate: LocalDate,
        now: OffsetDateTime,
    ): IssuedTicketStatus {
        val nextStatus = requestedStatus ?: return currentStatus
        if (currentStatus == nextStatus) {
            return currentStatus
        }

        if (validDate.isBefore(now.toLocalDate())) {
            return IssuedTicketStatus.EXPIRED
        }

        val isOpen = openAt == null || !now.isBefore(openAt)

        val allowed = when {
            nextStatus == IssuedTicketStatus.EXPIRED -> true
            nextStatus == IssuedTicketStatus.INACTIVE &&
                currentStatus != IssuedTicketStatus.EXPIRED -> true
            currentStatus == IssuedTicketStatus.INACTIVE && nextStatus == IssuedTicketStatus.ISSUING -> true
            currentStatus == IssuedTicketStatus.ISSUING && nextStatus == IssuedTicketStatus.VERIFYING && isOpen -> true
            else -> false
        }

        if (!allowed) {
            throw IllegalArgumentException("Invalid issued ticket status transition")
        }

        return nextStatus
    }

    fun resolveEffectiveStatus(
        storedStatus: IssuedTicketStatus,
        openAt: OffsetDateTime?,
        validDate: LocalDate,
        now: OffsetDateTime,
    ): IssuedTicketStatus {
        if (storedStatus == IssuedTicketStatus.EXPIRED || validDate.isBefore(now.toLocalDate())) {
            return IssuedTicketStatus.EXPIRED
        }

        if (storedStatus == IssuedTicketStatus.INACTIVE) {
            return IssuedTicketStatus.INACTIVE
        }

        if (openAt != null && now.isBefore(openAt)) {
            return IssuedTicketStatus.ISSUING
        }

        return IssuedTicketStatus.VERIFYING
    }
}
