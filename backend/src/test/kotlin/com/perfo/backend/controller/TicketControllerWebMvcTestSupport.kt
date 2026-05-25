package com.perfo.backend.controller

import com.fasterxml.jackson.databind.ObjectMapper
import com.perfo.backend.config.HeaderAuthenticationFilter
import com.perfo.backend.config.InternalApiJwtService
import com.perfo.backend.config.SecurityConfig
import com.perfo.backend.dto.TicketDto
import com.perfo.backend.dto.TicketDto.IssuedTicketStatus
import com.perfo.backend.entity.TicketDiscoveryMode
import com.perfo.backend.observability.InternalProxyAuthObservability
import com.perfo.backend.service.ProfileImageContent
import com.perfo.backend.service.ReservationService
import com.perfo.backend.service.TicketService
import com.perfo.backend.service.TicketTransitionService
import com.perfo.backend.service.TicketVerificationService
import io.jsonwebtoken.Jwts
import io.jsonwebtoken.security.Keys
import java.time.Instant
import java.util.Date
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest
import org.springframework.context.annotation.Import
import org.springframework.test.context.bean.override.mockito.MockitoBean

@WebMvcTest(
    value = [TicketController::class],
    properties = [
        "app.security.internal-jwt.issuer=perfo-frontend",
        "app.security.internal-jwt.audience=perfo-backend-ticketing",
        "app.security.internal-jwt.active-kid=test-v1",
        "app.security.internal-jwt.active-secret=test-internal-jwt-secret-key-should-be-long-enough-123456",
        "app.cors.allowed-origins=http://localhost:14138",
    ],
)
@Import(SecurityConfig::class, HeaderAuthenticationFilter::class, InternalApiJwtService::class)
abstract class TicketControllerWebMvcTestSupport {

    @Autowired
    protected lateinit var mockMvc: org.springframework.test.web.servlet.MockMvc

    @Autowired
    protected lateinit var objectMapper: ObjectMapper

    @field:MockitoBean
    protected lateinit var ticketService: TicketService

    @field:MockitoBean
    protected lateinit var reservationService: ReservationService

    @field:MockitoBean
    protected lateinit var ticketVerificationService: TicketVerificationService

    @field:MockitoBean
    protected lateinit var ticketTransitionService: TicketTransitionService

    @field:MockitoBean
    protected lateinit var internalProxyAuthObservability: InternalProxyAuthObservability

    protected fun ticketResponse(
        name: String = "PERFO Test Ticket",
        venue: String = "올림픽공원 체조경기장",
        googlePlaceId: String = "ChIJPLACE",
        validDate: String = "2026-08-15",
        openAt: String? = "2026-08-15T08:00:00Z",
        imageKey: String? = "owner-1/1/cover.png",
        status: IssuedTicketStatus = IssuedTicketStatus.INACTIVE,
    ) = TicketDto.TicketResponse(
        id = 1L,
        name = name,
        venue = venue,
        googlePlaceId = googlePlaceId,
        detailAddress = "2층 A게이트 앞",
        validDate = validDate,
        openAt = openAt,
        imageKey = imageKey,
        imageUrl = "/api/tickets/1/image",
        totalCount = 100,
        allowDuplicate = false,
        maxPerUser = 1,
        discoveryMode = TicketDiscoveryMode.LISTED,
        status = status,
        issuedCount = 0,
        ownerUserId = "owner-1",
        eventId = 11L,
        publicBookingPath = "/events/11",
        publicBookingUrl = null,
    )

    protected fun imageContent(bytes: ByteArray, contentType: String = "image/png") =
        ProfileImageContent(bytes = bytes, contentType = contentType)

    protected fun createInternalToken(
        userId: Long,
        scope: String,
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
            .subject("internal-proxy")
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
