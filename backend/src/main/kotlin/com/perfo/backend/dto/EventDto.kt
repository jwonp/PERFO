package com.perfo.backend.dto

import com.perfo.backend.entity.TicketDiscoveryMode

object EventDto {
    enum class SaleStatus {
        UPCOMING,
        OPEN,
        SOLD_OUT,
        CLOSED,
        INACTIVE,
    }

    data class EventResponse(
        val id: Long,
        val name: String,
        val venue: String,
        val validFrom: String,
        val validUntil: String,
        val saleOpenAt: String,
        val saleCloseAt: String,
        val remainingQuantity: Int,
        val totalQuantity: Int,
        val maxPerUser: Int,
        val allowDuplicate: Boolean,
        val active: Boolean,
        val saleStatus: SaleStatus,
        val discoveryMode: TicketDiscoveryMode,
        val publicBookingPath: String,
        val publicBookingUrl: String? = null,
    )
}
