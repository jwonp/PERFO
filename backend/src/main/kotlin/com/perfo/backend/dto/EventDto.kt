package com.perfo.backend.dto

import com.perfo.backend.entity.TicketDiscoveryMode
import com.perfo.backend.entity.BookingMode

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
        val bookingMode: BookingMode = BookingMode.SIMPLE,
        val items: List<EventItemResponse> = emptyList(),
        val discoveryMode: TicketDiscoveryMode,
        val publicBookingPath: String,
        val publicBookingUrl: String? = null,
    )

    data class EventItemResponse(
        val id: Long,
        val name: String,
        val description: String?,
        val imageUrl: String?,
        val price: Int?,
        val totalQuantity: Int,
        val remainingQuantity: Int,
        val maxPerUser: Int,
        val active: Boolean,
        val sortOrder: Int,
    )
}
