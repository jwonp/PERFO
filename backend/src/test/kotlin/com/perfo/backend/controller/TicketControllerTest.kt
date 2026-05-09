package com.perfo.backend.controller

import com.fasterxml.jackson.databind.ObjectMapper
import com.perfo.backend.config.HeaderAuthenticationFilter
import com.perfo.backend.config.InternalApiJwtService
import com.perfo.backend.config.SecurityConfig
import com.perfo.backend.dto.TicketDto
import com.perfo.backend.dto.TicketDto.TicketValidationResult
import com.perfo.backend.entity.TicketDiscoveryMode
import com.perfo.backend.entity.TicketUsageStatus
import com.perfo.backend.observability.InternalProxyAuthObservability
import com.perfo.backend.service.ProfileImageContent
import com.perfo.backend.dto.TicketDto.IssuedTicketStatus
import com.perfo.backend.service.TicketService
import com.perfo.backend.service.TicketTransitionService
import com.perfo.backend.service.TicketVerificationService
import com.perfo.backend.service.ReservationService
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.mockito.BDDMockito.given
import org.mockito.kotlin.any
import org.mockito.kotlin.eq
import org.mockito.kotlin.whenever
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest
import org.springframework.context.annotation.Import
import org.springframework.http.MediaType
import org.springframework.security.access.AccessDeniedException
import org.springframework.security.test.context.support.WithMockUser
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf
import org.springframework.test.context.bean.override.mockito.MockitoBean
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.content
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.springframework.mock.web.MockMultipartFile
import io.jsonwebtoken.Jwts
import io.jsonwebtoken.security.Keys
import java.time.Instant
import java.util.Date

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
class TicketControllerTest {

    @Autowired
    private lateinit var mockMvc: MockMvc

    @Autowired
    private lateinit var objectMapper: ObjectMapper

    @field:MockitoBean
    private lateinit var ticketService: TicketService

    @field:MockitoBean
    private lateinit var reservationService: ReservationService

    @field:MockitoBean
    private lateinit var ticketVerificationService: TicketVerificationService

    @field:MockitoBean
    private lateinit var ticketTransitionService: TicketTransitionService

    @field:MockitoBean
    private lateinit var internalProxyAuthObservability: InternalProxyAuthObservability

    @Test
    @DisplayName("POST /api/tickets - 티켓 생성 성공 시 200과 생성 결과를 반환한다")
    @WithMockUser(username = "owner-1")
    fun createTicket_returns200() {
        val request = TicketDto.CreateTicketRequest(
            name = "PERFO Test Ticket",
            venue = "올림픽공원 체조경기장",
            googlePlaceId = "ChIJPLACE",
            detailAddress = "2층 A게이트 앞",
            validDate = "2026-08-15",
            openAt = "2026-08-15T08:00:00Z",
            totalCount = 100,
            allowDuplicate = false,
            maxPerUser = 1,
            imageKey = "owner-1/1/cover.png",
        )

        val response = ticketResponse()

        given(ticketService.create(request, "owner-1")).willReturn(response)

        mockMvc.perform(
            post("/api/tickets")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)),
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.id").value(1))
            .andExpect(jsonPath("$.name").value("PERFO Test Ticket"))
            .andExpect(jsonPath("$.openAt").value("2026-08-15T08:00:00Z"))
            .andExpect(jsonPath("$.imageUrl").value("/api/tickets/1/image"))
    }

    @Test
    @DisplayName("GET /api/tickets - ownerUserId의 발행 티켓 목록을 반환한다")
    @WithMockUser(username = "owner-1")
    fun listIssuedTickets_returnsOwnerTickets() {
        given(ticketService.findAllByOwnerUserId("owner-1", "owner-1")).willReturn(listOf(ticketResponse()))

        mockMvc.perform(
            get("/api/tickets")
                .param("ownerUserId", "owner-1"),
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$[0].id").value(1))
            .andExpect(jsonPath("$[0].status").value("INACTIVE"))
            .andExpect(jsonPath("$[0].imageUrl").value("/api/tickets/1/image"))
            .andExpect(jsonPath("$[0].ownerUserId").value("owner-1"))
    }

    @Test
    @DisplayName("PATCH /api/tickets/{ticketId} - 수정 결과를 반환한다")
    @WithMockUser(username = "owner-1")
    fun updateTicket_returns200() {
        val request = TicketDto.UpdateTicketRequest(
            name = "Updated Ticket",
            venue = "잠실실내체육관",
            googlePlaceId = "ChIJUPDATED",
            detailAddress = "B 게이트",
            validDate = "2026-09-01",
            openAt = "2026-09-01T09:00:00Z",
            totalCount = 200,
            allowDuplicate = true,
            maxPerUser = 2,
            status = IssuedTicketStatus.ISSUING,
            imageKey = "owner-1/1/new.png",
        )
        given(ticketService.updateTicket(1L, "owner-1", request)).willReturn(
            ticketResponse(
                name = "Updated Ticket",
                venue = "잠실실내체육관",
                googlePlaceId = "ChIJUPDATED",
                validDate = "2026-09-01",
                openAt = "2026-09-01T09:00:00Z",
                imageKey = "owner-1/1/new.png",
                status = IssuedTicketStatus.ISSUING,
            ),
        )

        mockMvc.perform(
            patch("/api/tickets/1")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)),
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.name").value("Updated Ticket"))
            .andExpect(jsonPath("$.status").value("ISSUING"))
            .andExpect(jsonPath("$.imageKey").value("owner-1/1/new.png"))
    }

    @Test
    @DisplayName("POST /api/tickets/{ticketId}/image - 이미지 업로드 결과를 반환한다")
    @WithMockUser(username = "owner-1")
    fun uploadTicketImage_returns200() {
        val file = MockMultipartFile("file", "cover.png", "image/png", "png".toByteArray())
        given(ticketService.uploadTicketImage(eq(1L), eq("owner-1"), any())).willReturn(
            TicketDto.TicketImageUploadResponse(
                imageKey = "owner-1/1/generated.png",
                imageUrl = "/api/tickets/1/image",
            ),
        )

        mockMvc.perform(
            multipart("/api/tickets/1/image")
                .file(file)
                .with(csrf()),
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.imageKey").value("owner-1/1/generated.png"))
            .andExpect(jsonPath("$.imageUrl").value("/api/tickets/1/image"))
    }

    @Test
    @DisplayName("GET /api/tickets/{ticketId}/image - 현재 티켓 이미지를 반환한다")
    @WithMockUser(username = "owner-1")
    fun getTicketImage_returns200() {
        given(ticketService.getTicketImage(1L, "owner-1")).willReturn(
            ProfileImageContent(
                bytes = "png".toByteArray(),
                contentType = "image/png",
            ),
        )

        mockMvc.perform(
            get("/api/tickets/1/image"),
        )
            .andExpect(status().isOk)
            .andExpect(content().contentType("image/png"))
            .andExpect(content().bytes("png".toByteArray()))
    }

    @Test
    @DisplayName("DELETE /api/tickets/{ticketId}/image - cleanup 요청을 처리한다")
    @WithMockUser(username = "owner-1")
    fun cleanupTicketImage_returns204() {
        mockMvc.perform(
            delete("/api/tickets/1/image")
                .with(csrf())
                .param("imageKey", "owner-1/1/transient.png"),
        )
            .andExpect(status().isNoContent)
    }

    @Test
    @DisplayName("GET /api/reservations - userId의 예약 티켓 목록을 반환한다")
    @WithMockUser(username = "owner-1")
    fun listReservations_returnsUserReservations() {
        val response = TicketDto.ReservationResponse(
            id = 21L,
            name = "PERFO Reservation",
            venue = "올림픽공원 체조경기장",
            validDate = "2026-08-15",
            ticketNumber = 7,
            totalCount = 100,
            ticketingStatus = com.perfo.backend.entity.TicketingStatus.SUCCESS,
            usageStatus = TicketDto.ReservedUsageStatus.MY_TURN,
        )

        given(reservationService.findAllByUserId(5L)).willReturn(listOf(response))

        mockMvc.perform(
            get("/api/reservations")
                .param("userId", "5"),
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$[0].id").value(21))
            .andExpect(jsonPath("$[0].ticketNumber").value(7))
            .andExpect(jsonPath("$[0].usageStatus").value("MY_TURN"))
    }

    @Test
    @DisplayName("POST /api/tickets - googlePlaceId가 형식에 맞지 않으면 400을 반환한다")
    @WithMockUser(username = "owner-1")
    fun createTicket_invalidPlaceId_returns400() {
        val request = TicketDto.CreateTicketRequest(
            name = "PERFO Test Ticket",
            venue = "올림픽공원 체조경기장",
            googlePlaceId = "bad id",
            detailAddress = "2층 A게이트 앞",
            validDate = "2026-08-15",
            totalCount = 100,
            allowDuplicate = false,
            maxPerUser = 1,
        )

        mockMvc.perform(
            post("/api/tickets")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)),
        )
            .andExpect(status().isBadRequest)
    }

    @Test
    @DisplayName("PATCH /api/tickets/{ticketId} - 소유자가 아니면 403을 반환한다")
    @WithMockUser(username = "owner-1")
    fun updateTicket_ownerMismatch_returns403() {
        val request = TicketDto.UpdateTicketRequest(
            name = "Updated Ticket",
            venue = "잠실실내체육관",
            googlePlaceId = "ChIJUPDATED",
            detailAddress = "B 게이트",
            validDate = "2026-09-01",
            openAt = null,
            totalCount = 200,
            allowDuplicate = false,
            maxPerUser = 1,
            status = null,
            imageKey = null,
        )
        whenever(ticketService.updateTicket(1L, "owner-1", request))
            .thenThrow(AccessDeniedException("Ticket owner mismatch"))

        mockMvc.perform(
            patch("/api/tickets/1")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)),
        )
            .andExpect(status().isForbidden)
            .andExpect(jsonPath("$.message").value("Ticket owner mismatch"))
    }

    @Test
    @DisplayName("POST /api/reservations/{reservationId}/qr-token 요청 시 QR 토큰을 발급한다")
    @WithMockUser
    fun issueQrToken_returns200() {
        val response = TicketDto.TicketQrTokenResponse(
            token = buildString {
                append("qr")
                append("-token-")
                append("test-42")
            },
            expiresAt = "2026-04-28T12:00:30Z",
        )
        given(ticketVerificationService.issueReservationQrToken(42L)).willReturn(response)

        mockMvc.perform(
            post("/api/reservations/42/qr-token")
                .with(csrf()),
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.token").value("qr-token-test-42"))
    }

    @Test
    @DisplayName("POST /api/tickets/{ticketId}/validations 요청 시 검표 결과를 반환한다")
    @WithMockUser
    fun validateTicket_returns200() {
        val request = TicketDto.TicketValidationRequest(qrToken = "opaque-token")
        val response = TicketDto.TicketValidationResponse(
            result = TicketValidationResult.SUCCESS,
            ticketNumber = 121,
            usageStatus = TicketUsageStatus.USED,
        )
        given(ticketVerificationService.validateTicketByQr(10L, request)).willReturn(response)

        mockMvc.perform(
            post("/api/tickets/10/validations")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)),
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.result").value("SUCCESS"))
            .andExpect(jsonPath("$.ticketNumber").value(121))
    }

    @Test
    @DisplayName("POST /api/tickets - 인증되지 않으면 401을 반환한다")
    fun createTicket_unauthenticated_returns401() {
        val request = TicketDto.CreateTicketRequest(
            name = "PERFO Test Ticket",
            venue = "올림픽공원 체조경기장",
            googlePlaceId = "ChIJPLACE",
            detailAddress = "2층 A게이트 앞",
            validDate = "2026-08-15",
            totalCount = 100,
            allowDuplicate = false,
            maxPerUser = 1,
        )

        mockMvc.perform(
            post("/api/tickets")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)),
        )
            .andExpect(status().isUnauthorized)
    }

    @Test
    @DisplayName("POST /api/tickets - 만료된 내부 JWT면 401을 반환한다")
    fun createTicket_expiredJwt_returns401() {
        val request = TicketDto.CreateTicketRequest(
            name = "PERFO Test Ticket",
            venue = "올림픽공원 체조경기장",
            googlePlaceId = "ChIJPLACE",
            detailAddress = "2층 A게이트 앞",
            validDate = "2026-08-15",
            totalCount = 100,
            allowDuplicate = false,
            maxPerUser = 1,
        )

        mockMvc.perform(
            post("/api/tickets")
                .with(csrf())
                .header("Authorization", "Bearer ${createInternalToken(42L, "tickets", Instant.now().minusSeconds(5))}")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)),
        )
            .andExpect(status().isUnauthorized)
    }

    private fun ticketResponse(
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

    private fun createInternalToken(
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
