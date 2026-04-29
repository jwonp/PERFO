package com.perfo.backend.controller

import com.fasterxml.jackson.databind.ObjectMapper
import com.perfo.backend.config.HeaderAuthenticationFilter
import com.perfo.backend.dto.TicketDto
import com.perfo.backend.dto.TicketDto.TicketValidationResult
import com.perfo.backend.entity.TicketUsageStatus
import com.perfo.backend.dto.TicketDto.IssuedTicketStatus
import com.perfo.backend.service.TicketService
import com.perfo.backend.service.TicketTransitionService
import com.perfo.backend.service.TicketVerificationService
import com.perfo.backend.service.ReservationService
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.mockito.BDDMockito.given
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest
import org.springframework.context.annotation.Import
import org.springframework.http.MediaType
import org.springframework.security.test.context.support.WithMockUser
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf
import org.springframework.test.context.bean.override.mockito.MockitoBean
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

@WebMvcTest(TicketController::class)
@Import(HeaderAuthenticationFilter::class)
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

    @Test
    @DisplayName("POST /api/tickets - 티켓 생성 성공 시 200과 생성 결과를 반환한다")
    @WithMockUser
    fun createTicket_returns200() {
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

        val response = TicketDto.TicketResponse(
            id = 1L,
            name = request.name,
            venue = request.venue,
            googlePlaceId = request.googlePlaceId,
            detailAddress = request.detailAddress,
            validDate = request.validDate,
            totalCount = request.totalCount,
            allowDuplicate = request.allowDuplicate,
            maxPerUser = request.maxPerUser,
            status = IssuedTicketStatus.INACTIVE,
            issuedCount = 0,
            ownerUserId = "owner-1",
        )

        given(ticketService.create(request)).willReturn(response)

        mockMvc.perform(
            post("/api/tickets")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)),
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.id").value(1))
            .andExpect(jsonPath("$.name").value("PERFO Test Ticket"))
            .andExpect(jsonPath("$.googlePlaceId").value("ChIJPLACE"))
    }

    @Test
    @DisplayName("GET /api/tickets - ownerUserId의 발행 티켓 목록을 반환한다")
    @WithMockUser
    fun listIssuedTickets_returnsOwnerTickets() {
        val response = TicketDto.TicketResponse(
            id = 10L,
            name = "PERFO Test Ticket",
            venue = "올림픽공원 체조경기장",
            googlePlaceId = "ChIJPLACE",
            detailAddress = "2층 A게이트 앞",
            validDate = "2026-08-15",
            totalCount = 100,
            allowDuplicate = false,
            maxPerUser = 1,
            status = IssuedTicketStatus.ISSUING,
            issuedCount = 12,
            ownerUserId = "owner-1",
        )

        given(ticketService.findAllByOwnerUserId("owner-1")).willReturn(listOf(response))

        mockMvc.perform(
            get("/api/tickets")
                .param("ownerUserId", "owner-1"),
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$[0].id").value(10))
            .andExpect(jsonPath("$[0].status").value("ISSUING"))
            .andExpect(jsonPath("$[0].issuedCount").value(12))
            .andExpect(jsonPath("$[0].ownerUserId").value("owner-1"))
    }

    @Test
    @DisplayName("GET /api/reservations - userId의 예약 티켓 목록을 반환한다")
    @WithMockUser
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
    @WithMockUser
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
}
