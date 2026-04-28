package com.perfo.backend.service

import com.perfo.backend.dto.TicketDto
import org.springframework.stereotype.Service
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicLong

@Service
class TicketService {
    private val idGenerator = AtomicLong(0)
    private val tickets = ConcurrentHashMap<Long, TicketDto.TicketResponse>()
    private val placeIdPattern = Regex("^[A-Za-z0-9_-]{3,256}$")

    fun create(request: TicketDto.CreateTicketRequest): TicketDto.TicketResponse {
        if (!placeIdPattern.matches(request.googlePlaceId)) {
            throw IllegalArgumentException("Invalid googlePlaceId")
        }

        val id = idGenerator.incrementAndGet()
        val created = TicketDto.TicketResponse(
            id = id,
            name = request.name,
            venue = request.venue,
            googlePlaceId = request.googlePlaceId,
            detailAddress = request.detailAddress,
            validDate = request.validDate,
            totalCount = request.totalCount,
            allowDuplicate = request.allowDuplicate,
            maxPerUser = request.maxPerUser,
        )

        tickets[id] = created
        return created
    }
}
