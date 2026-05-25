package com.perfo.backend.controller

import com.perfo.backend.dto.TicketDto
import com.perfo.backend.entity.TicketingStatus
import com.perfo.backend.service.ReservationQrTokenUnavailableException
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.mockito.BDDMockito.given
import org.springframework.security.test.context.support.WithMockUser
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

class TicketControllerReservationApiTest : TicketControllerWebMvcTestSupport() {

    @Test
    @DisplayName("GET /api/reservations - userId의 예약 티켓 목록을 반환한다")
    @WithMockUser(username = "5", roles = ["ORGANIZER"])
    fun listReservations_returnsUserReservations() {
        val response = TicketDto.ReservationResponse(
            id = 21L,
            name = "PERFO Reservation",
            venue = "올림픽공원 체조경기장",
            validDate = "2026-08-15",
            ticketNumber = 7,
            totalCount = 100,
            ticketingStatus = TicketingStatus.SUCCESS,
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
    @DisplayName("POST /api/reservations/{reservationId}/qr-token 요청 시 QR 토큰을 발급한다")
    @WithMockUser(username = "5", roles = ["ORGANIZER"])
    fun issueQrToken_returns200() {
        val response = TicketDto.TicketQrTokenResponse(
            token = "qr_test_42",
            expiresAt = "2026-04-28T12:00:30Z",
        )
        given(ticketVerificationService.issueReservationQrToken(42L, 5L)).willReturn(response)

        mockMvc.perform(
            post("/api/reservations/42/qr-token")
                .with(csrf()),
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.token").value("qr_test_42"))
    }

    @Test
    @DisplayName("POST /api/reservations/{reservationId}/qr-token - 이미 사용된 티켓은 409와 코드 응답을 반환한다")
    @WithMockUser(username = "5", roles = ["ORGANIZER"])
    fun issueQrToken_alreadyUsed_returns409() {
        given(ticketVerificationService.issueReservationQrToken(42L, 5L)).willThrow(
            ReservationQrTokenUnavailableException.alreadyUsed(),
        )

        mockMvc.perform(
            post("/api/reservations/42/qr-token")
                .with(csrf()),
        )
            .andExpect(status().isConflict)
            .andExpect(jsonPath("$.code").value("ALREADY_USED"))
    }
}
