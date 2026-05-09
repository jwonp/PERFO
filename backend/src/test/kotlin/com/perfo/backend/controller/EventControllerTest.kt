package com.perfo.backend.controller

import com.perfo.backend.config.HeaderAuthenticationFilter
import com.perfo.backend.config.InternalApiJwtService
import com.perfo.backend.config.SecurityConfig
import com.perfo.backend.dto.EventDto
import com.perfo.backend.entity.TicketDiscoveryMode
import com.perfo.backend.observability.InternalProxyAuthObservability
import com.perfo.backend.service.EventQueryService
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest
import org.springframework.context.annotation.Import
import org.springframework.security.test.context.support.WithMockUser
import org.springframework.test.context.bean.override.mockito.MockitoBean
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import java.time.OffsetDateTime

@WebMvcTest(
    value = [EventController::class],
    properties = [
        "app.security.internal-jwt.issuer=perfo-frontend",
        "app.security.internal-jwt.audience=perfo-backend-ticketing",
        "app.security.internal-jwt.active-kid=test-v1",
        "app.security.internal-jwt.active-secret=test-internal-jwt-secret-key-should-be-long-enough-123456",
        "app.cors.allowed-origins=http://localhost:14138",
    ],
)
@Import(SecurityConfig::class, HeaderAuthenticationFilter::class, InternalApiJwtService::class)
class EventControllerTest {

    @Autowired
    private lateinit var mockMvc: MockMvc

    @field:MockitoBean
    private lateinit var eventQueryService: EventQueryService

    @field:MockitoBean
    private lateinit var internalProxyAuthObservability: InternalProxyAuthObservability

    @Test
    @DisplayName("GET /api/events - LISTED 이벤트 목록을 반환한다")
    @WithMockUser(username = "user-1")
    fun listEvents_returnsEvents() {
        org.mockito.BDDMockito.given(eventQueryService.listPublicEvents()).willReturn(listOf(eventResponse(11L)))

        mockMvc.perform(get("/api/events"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$[0].id").value(11))
            .andExpect(jsonPath("$[0].discoveryMode").value("LISTED"))
            .andExpect(jsonPath("$[0].publicBookingPath").value("/events/11"))
    }

    @Test
    @DisplayName("GET /api/events/{eventId} - LINK_ONLY 이벤트 상세를 반환한다")
    @WithMockUser(username = "user-1")
    fun getEvent_returnsLinkOnlyDetail() {
        org.mockito.BDDMockito.given(eventQueryService.getPublicEvent(12L)).willReturn(
            eventResponse(12L, discoveryMode = TicketDiscoveryMode.LINK_ONLY),
        )

        mockMvc.perform(get("/api/events/12"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.id").value(12))
            .andExpect(jsonPath("$.discoveryMode").value("LINK_ONLY"))
    }

    private fun eventResponse(
        id: Long,
        discoveryMode: TicketDiscoveryMode = TicketDiscoveryMode.LISTED,
    ) = EventDto.EventResponse(
        id = id,
        name = "PERFO Event",
        venue = "KSPO Dome",
        validFrom = OffsetDateTime.parse("2026-08-15T10:00:00Z").toString(),
        validUntil = OffsetDateTime.parse("2026-08-15T18:00:00Z").toString(),
        saleOpenAt = OffsetDateTime.parse("2026-08-01T10:00:00Z").toString(),
        saleCloseAt = OffsetDateTime.parse("2026-08-15T09:00:00Z").toString(),
        remainingQuantity = 90,
        totalQuantity = 100,
        maxPerUser = 2,
        allowDuplicate = false,
        active = true,
        saleStatus = EventDto.SaleStatus.OPEN,
        discoveryMode = discoveryMode,
        publicBookingPath = "/events/$id",
        publicBookingUrl = null,
    )
}
