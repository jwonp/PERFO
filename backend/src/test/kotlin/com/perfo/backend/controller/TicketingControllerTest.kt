package com.perfo.backend.controller

import com.fasterxml.jackson.databind.ObjectMapper
import com.perfo.backend.config.HeaderAuthenticationFilter
import com.perfo.backend.config.InternalApiJwtService
import com.perfo.backend.config.SecurityConfig
import com.perfo.backend.dto.TicketDto
import com.perfo.backend.entity.TicketPurchaseResult
import com.perfo.backend.observability.InternalProxyAuthObservability
import com.perfo.backend.service.TicketingProjectionQueryService
import com.perfo.backend.service.TicketingService
import io.jsonwebtoken.Jwts
import io.jsonwebtoken.security.Keys
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.mockito.BDDMockito.given
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest
import org.springframework.context.annotation.Import
import org.springframework.http.MediaType
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf
import org.springframework.test.context.bean.override.mockito.MockitoBean
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import java.time.Instant
import java.util.Date

@WebMvcTest(
    value = [TicketingController::class],
    properties = [
        "app.security.internal-jwt.issuer=perfo-frontend",
        "app.security.internal-jwt.audience=perfo-backend-ticketing",
        "app.security.internal-jwt.active-kid=test-v1",
        "app.security.internal-jwt.active-secret=test-internal-jwt-secret-key-should-be-long-enough-123456",
        "app.cors.allowed-origins=http://localhost:14138",
    ],
)
@Import(SecurityConfig::class, HeaderAuthenticationFilter::class, InternalApiJwtService::class)
class TicketingControllerTest {

    @Autowired
    private lateinit var mockMvc: MockMvc

    @Autowired
    private lateinit var objectMapper: ObjectMapper

    @field:MockitoBean
    private lateinit var ticketingService: TicketingService

    @field:MockitoBean
    private lateinit var ticketingProjectionQueryService: TicketingProjectionQueryService

    @field:MockitoBean
    private lateinit var internalProxyAuthObservability: InternalProxyAuthObservability

    @Test
    @DisplayName("POST /api/ticketing/requests - 구매 성공 결과를 반환한다")
    fun submitRequest_returns200() {
        val request = TicketDto.TicketingRequestSubmitRequest(
            requestId = "req_phase1_0001",
            eventId = 11L,
            quantity = 2,
        )
        given(ticketingService.submitRequest(42L, request)).willReturn(
            TicketDto.TicketingRequestSubmitResponse(
                requestId = request.requestId,
                eventId = 11L,
                quantity = 2,
                result = TicketPurchaseResult.SUCCESS,
                ticketIds = listOf(100L, 101L),
                ticketNumbers = listOf(1, 2),
                remainingQuantity = 8,
                message = "Purchase confirmed",
            ),
        )

        mockMvc.perform(
            post("/api/ticketing/requests")
                .with(csrf())
                .header("Authorization", "Bearer ${createInternalToken(userId = 42L)}")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)),
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.requestId").value("req_phase1_0001"))
            .andExpect(jsonPath("$.result").value("SUCCESS"))
            .andExpect(jsonPath("$.ticketIds[0]").value(100))
            .andExpect(jsonPath("$.remainingQuantity").value(8))
    }

    @Test
    @DisplayName("POST /api/ticketing/requests - 내부 인증 없이 호출하면 401을 반환한다")
    fun submitRequest_withoutInternalAuth_returns401() {
        val request = TicketDto.TicketingRequestSubmitRequest(
            requestId = "req_phase1_unauthorized",
            eventId = 11L,
            quantity = 1,
        )

        mockMvc.perform(
            post("/api/ticketing/requests")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)),
        )
            .andExpect(status().isUnauthorized)
    }

    @Test
    @DisplayName("POST /api/ticketing/requests - 만료된 내부 토큰이면 401을 반환한다")
    fun submitRequest_expiredToken_returns401() {
        val request = TicketDto.TicketingRequestSubmitRequest(
            requestId = "req_phase1_0002",
            eventId = 11L,
            quantity = 1,
        )

        mockMvc.perform(
            post("/api/ticketing/requests")
                .with(csrf())
                .header("Authorization", "Bearer ${createInternalToken(userId = 42L, expiresAt = Instant.now().minusSeconds(5))}")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)),
        )
            .andExpect(status().isUnauthorized)
    }

    @Test
    @DisplayName("GET /api/ticketing/events/{eventId}/projection - projection summary를 반환한다")
    fun getEventProjection_returns200() {
        given(ticketingProjectionQueryService.getEventProjectionSummary(11L, 5)).willReturn(
            TicketDto.TicketingProjectionSummaryResponse(
                eventId = 11L,
                projectedCount = 2,
                successCount = 1,
                rejectedCount = 1,
                lastOccurredAt = "2026-05-08T13:00:02Z",
                lastProjectedAt = "2026-05-08T22:00:04",
                recentAttempts = listOf(
                    TicketDto.TicketingProjectionAttemptResponse(
                        outboxId = 2002L,
                        requestId = "projection_summary_0002",
                        eventType = "PURCHASE_REJECTED",
                        result = TicketPurchaseResult.SOLD_OUT,
                        quantity = 2,
                        ticketIds = emptyList(),
                        ticketNumbers = emptyList(),
                        remainingQuantity = 0,
                        message = "Insufficient inventory",
                        occurredAt = "2026-05-08T13:00:02Z",
                        projectedAt = "2026-05-08T22:00:04",
                    ),
                ),
            ),
        )

        mockMvc.perform(
            get("/api/ticketing/events/11/projection")
                .header("Authorization", "Bearer ${createInternalToken(userId = 42L, scope = "ticketing:projection")}")
                .param("limit", "5"),
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.eventId").value(11))
            .andExpect(jsonPath("$.projectedCount").value(2))
            .andExpect(jsonPath("$.recentAttempts[0].eventType").value("PURCHASE_REJECTED"))
            .andExpect(jsonPath("$.recentAttempts[0].result").value("SOLD_OUT"))
    }

    private fun createInternalToken(
        userId: Long,
        scope: String = "ticketing",
        expiresAt: Instant = Instant.now().plusSeconds(30),
    ): String {
        val signingKey = Keys.hmacShaKeyFor(
            "test-internal-jwt-secret-key-should-be-long-enough-123456".toByteArray(Charsets.UTF_8),
        )
        return Jwts.builder()
            .header()
            .keyId("test-v1")
            .and()
            .issuer("perfo-frontend")
            .subject("ticketing-proxy")
            .audience()
            .add("perfo-backend-ticketing")
            .and()
            .issuedAt(Date.from(Instant.now()))
            .expiration(Date.from(expiresAt))
            .claim("uid", userId)
            .claim("scope", listOf(scope))
            .signWith(signingKey)
            .compact()
    }
}
