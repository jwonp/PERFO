package com.perfo.backend.dto

import com.perfo.backend.entity.TicketUsageStatus
import com.perfo.backend.entity.TicketingStatus
import com.perfo.backend.entity.TicketPurchaseResult
import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Pattern

object TicketDto {
    enum class ReservedUsageStatus {
        BEFORE_USE,
        WAITING,
        MY_TURN,
        USED,
    }

    enum class IssuedTicketStatus {
        INACTIVE,
        ISSUING,
        VERIFYING,
        EXPIRED,
    }

    data class CreateTicketRequest(
        @field:NotBlank
        val name: String,
        @field:NotBlank
        val venue: String,
        @field:Pattern(regexp = "^[A-Za-z0-9_-]{3,256}$")
        val googlePlaceId: String,
        val detailAddress: String?,
        @field:Pattern(regexp = "^\\d{4}-\\d{2}-\\d{2}$")
        val validDate: String,
        val openAt: String? = null,
        @field:Min(1)
        val totalCount: Int,
        val allowDuplicate: Boolean,
        @field:Min(1)
        @field:Max(100)
        val maxPerUser: Int,
        val imageKey: String? = null,
        val ownerUserId: String? = null,
    )

    data class UpdateTicketRequest(
        @field:NotBlank
        val name: String,
        @field:NotBlank
        val venue: String,
        @field:Pattern(regexp = "^[A-Za-z0-9_-]{3,256}$")
        val googlePlaceId: String,
        val detailAddress: String?,
        @field:Pattern(regexp = "^\\d{4}-\\d{2}-\\d{2}$")
        val validDate: String,
        val openAt: String? = null,
        @field:Min(1)
        val totalCount: Int,
        val allowDuplicate: Boolean,
        @field:Min(1)
        @field:Max(100)
        val maxPerUser: Int,
        val status: IssuedTicketStatus? = null,
        val imageKey: String? = null,
    )

    data class TicketResponse(
        val id: Long,
        val name: String,
        val venue: String,
        val googlePlaceId: String,
        val detailAddress: String?,
        val validDate: String,
        val openAt: String?,
        val imageKey: String?,
        val imageUrl: String?,
        val totalCount: Int,
        val allowDuplicate: Boolean,
        val maxPerUser: Int,
        val status: IssuedTicketStatus,
        val issuedCount: Int,
        val ownerUserId: String,
    )

    data class TicketImageUploadResponse(
        val imageKey: String,
        val imageUrl: String,
    )

    data class ReservationResponse(
        val id: Long,
        val name: String,
        val venue: String,
        val validDate: String,
        val ticketNumber: Int,
        val totalCount: Int,
        val ticketingStatus: TicketingStatus,
        val usageStatus: ReservedUsageStatus,
    )

    data class TicketQrTokenResponse(
        val token: String,
        val expiresAt: String,
    )

    data class TicketValidationRequest(
        @field:NotBlank
        val qrToken: String,
    )

    enum class TicketValidationResult {
        SUCCESS,
        ALREADY_USED,
        INVALID,
        EXPIRED,
        WRONG_TICKET,
        NOT_OPEN,
        FORBIDDEN,
    }

    data class TicketValidationResponse(
        val result: TicketValidationResult,
        val ticketNumber: Int? = null,
        val usedAt: String? = null,
        val usageStatus: TicketUsageStatus? = null,
        val message: String? = null,
    )

    data class TicketStatusTransitionRequest(
        val nextStatus: TicketingStatus,
    )

    data class TicketUsageTransitionRequest(
        val nextStatus: TicketUsageStatus,
    )

    data class IssuedTicketStatusTransitionRequest(
        val nextStatus: IssuedTicketStatus,
    )

    data class TicketStateResponse(
        val ticketId: Long,
        val ticketingStatus: TicketingStatus,
        val usageStatus: TicketUsageStatus,
    )

    data class TicketingRequestSubmitRequest(
        @field:NotBlank
        @field:Pattern(regexp = "^[A-Za-z0-9:_-]{8,120}$")
        val requestId: String,
        @field:Min(1)
        val eventId: Long,
        @field:Min(1)
        @field:Max(10)
        val quantity: Int,
    )

    data class TicketingRequestSubmitResponse(
        val requestId: String,
        val eventId: Long,
        val quantity: Int,
        val result: TicketPurchaseResult,
        val ticketIds: List<Long>,
        val ticketNumbers: List<Int>,
        val remainingQuantity: Int?,
        val message: String? = null,
    )

    data class TicketingProjectionSummaryResponse(
        val eventId: Long,
        val projectedCount: Long,
        val successCount: Long,
        val rejectedCount: Long,
        val lastOccurredAt: String?,
        val lastProjectedAt: String?,
        val recentAttempts: List<TicketingProjectionAttemptResponse>,
    )

    data class TicketingProjectionAttemptResponse(
        val outboxId: Long,
        val requestId: String,
        val eventType: String,
        val result: TicketPurchaseResult,
        val quantity: Int,
        val ticketIds: List<Long>,
        val ticketNumbers: List<Int>,
        val remainingQuantity: Int?,
        val message: String?,
        val occurredAt: String,
        val projectedAt: String?,
    )
}
