package com.perfo.backend.service.ticket

import com.perfo.backend.dto.TicketDto.IssuedTicketStatus
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import java.time.LocalDate
import java.time.OffsetDateTime

class IssuedTicketStatusPolicyTest {

    private val now = OffsetDateTime.parse("2026-08-15T08:00:00Z")

    @Test
    @DisplayName("유효일이 지나면 다음 상태는 항상 EXPIRED다")
    fun resolveNextStatusReturnsExpiredForPastDate() {
        val resolved = IssuedTicketStatusPolicy.resolveNextStatus(
            currentStatus = IssuedTicketStatus.ISSUING,
            requestedStatus = IssuedTicketStatus.VERIFYING,
            openAt = now.minusDays(1),
            validDate = LocalDate.parse("2026-08-14"),
            now = now,
        )

        assertThat(resolved).isEqualTo(IssuedTicketStatus.EXPIRED)
    }

    @Test
    @DisplayName("미래 openAt에서는 ISSUING에서 VERIFYING 전환을 거부한다")
    fun resolveNextStatusRejectsFutureVerifying() {
        assertThatThrownBy {
            IssuedTicketStatusPolicy.resolveNextStatus(
                currentStatus = IssuedTicketStatus.ISSUING,
                requestedStatus = IssuedTicketStatus.VERIFYING,
                openAt = now.plusDays(1),
                validDate = LocalDate.parse("2026-08-16"),
                now = now,
            )
        }
            .isInstanceOf(IllegalArgumentException::class.java)
            .hasMessage("Invalid issued ticket status transition")
    }

    @Test
    @DisplayName("저장 상태가 ISSUING이고 openAt 이전이면 유효 상태는 ISSUING이다")
    fun resolveEffectiveStatusReturnsIssuingBeforeOpenAt() {
        val resolved = IssuedTicketStatusPolicy.resolveEffectiveStatus(
            storedStatus = IssuedTicketStatus.ISSUING,
            openAt = now.plusHours(1),
            validDate = LocalDate.parse("2026-08-15"),
            now = now,
        )

        assertThat(resolved).isEqualTo(IssuedTicketStatus.ISSUING)
    }

    @Test
    @DisplayName("저장 상태가 ISSUING이고 openAt 이후면 유효 상태는 VERIFYING이다")
    fun resolveEffectiveStatusReturnsVerifyingAfterOpenAt() {
        val resolved = IssuedTicketStatusPolicy.resolveEffectiveStatus(
            storedStatus = IssuedTicketStatus.ISSUING,
            openAt = now.minusHours(1),
            validDate = LocalDate.parse("2026-08-15"),
            now = now,
        )

        assertThat(resolved).isEqualTo(IssuedTicketStatus.VERIFYING)
    }
}
