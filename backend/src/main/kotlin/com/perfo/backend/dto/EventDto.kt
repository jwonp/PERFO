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
        val issuedTicketId: Long?,
        val name: String,
        val venue: String,
        val googlePlaceId: String? = null,
        val detailAddress: String? = null,
        val validFrom: String,
        val validUntil: String,
        val validDate: String,
        val saleOpenAt: String,
        val saleCloseAt: String,
        val imageUrl: String? = null,
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
