package com.perfo.backend.controller

import com.perfo.backend.dto.TicketDto
import com.perfo.backend.dto.TicketDto.TicketValidationResult
import com.perfo.backend.entity.TicketUsageStatus
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.mockito.BDDMockito.given
import org.springframework.http.MediaType
import org.springframework.security.access.AccessDeniedException
import org.springframework.security.test.context.support.WithMockUser
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

class TicketControllerValidationApiTest : TicketControllerWebMvcTestSupport() {

    @Test
    @DisplayName("POST /api/tickets/{ticketId}/validations 요청 시 검표 결과를 반환한다")
    @WithMockUser(username = "5", roles = ["ORGANIZER"])
    fun validateTicket_returns200() {
        val request = TicketDto.TicketValidationRequest(qrToken = "opaque-token")
        val response = TicketDto.TicketValidationResponse(
            result = TicketValidationResult.SUCCESS,
            ticketNumber = 121,
            usageStatus = TicketUsageStatus.USED,
        )
        given(ticketVerificationService.validateTicketByQr(10L, 5L, request)).willReturn(response)

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
    @DisplayName("POST /api/tickets/{ticketId}/validations 요청 시 owner가 아니면 403을 반환한다")
    @WithMockUser(username = "5", roles = ["ORGANIZER"])
    fun validateTicket_forbidden_returns403() {
        val request = TicketDto.TicketValidationRequest(qrToken = "opaque-token")
        given(ticketVerificationService.validateTicketByQr(10L, 5L, request))
            .willThrow(AccessDeniedException("Ticket validation forbidden"))

        mockMvc.perform(
            post("/api/tickets/10/validations")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)),
        )
            .andExpect(status().isForbidden)
            .andExpect(jsonPath("$.message").value("Ticket validation forbidden"))
    }
}
