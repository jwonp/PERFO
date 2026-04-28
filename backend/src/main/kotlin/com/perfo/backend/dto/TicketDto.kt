package com.perfo.backend.dto

import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Pattern

object TicketDto {
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
        @field:Min(1)
        val totalCount: Int,
        val allowDuplicate: Boolean,
        @field:Min(1)
        @field:Max(100)
        val maxPerUser: Int,
    )

    data class TicketResponse(
        val id: Long,
        val name: String,
        val venue: String,
        val googlePlaceId: String,
        val detailAddress: String?,
        val validDate: String,
        val totalCount: Int,
        val allowDuplicate: Boolean,
        val maxPerUser: Int,
    )
}
