package com.perfo.backend.controller

import com.fasterxml.jackson.databind.ObjectMapper
import com.perfo.backend.dto.TicketDto
import com.perfo.backend.entity.TicketUsageStatus
import com.perfo.backend.entity.TicketingStatus
import com.perfo.backend.service.TicketService
import com.perfo.backend.service.TicketVerificationService
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.mockito.BDDMockito.given
import org.mockito.BDDMockito.then
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest
import org.springframework.http.MediaType
import org.springframework.security.test.context.support.WithMockUser
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf
import org.springframework.test.context.bean.override.mockito.MockitoBean
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

@WebMvcTest(TicketController::class)
class TicketControllerTest {

    @Autowired
    private lateinit var mockMvc: MockMvc

    @Autowired
    private lateinit var objectMapper: ObjectMapper

    @field:MockitoBean
    private lateinit var ticketService: TicketService

    @field:MockitoBean
    private lateinit var ticketVerificationService: TicketVerificationService

    @Test
    @DisplayName("POST /api/tickets/request - 티켓 발급 성공 시 200 응답과 발급 결과를 반환한다")
    @WithMockUser
    fun requestTicket_returns200() {
        // given
        val request = TicketDto.TicketRequest(10L, 1L, "idem-1")
        val response = TicketDto.TicketResponse(
            id = 100L,
            eventId = 10L,
            userId = 1L,
            ticketNumber = 98,
            ticketingStatus = TicketingStatus.SUCCESS,
            usageStatus = TicketUsageStatus.BEFORE_SERVING,
            remainingQuantity = 2
        )

        given(ticketService.requestTicket(request)).willReturn(response)

        // when & then
        mockMvc.perform(
            post("/api/tickets/request")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.id").value(100))
            .andExpect(jsonPath("$.eventId").value(10))
            .andExpect(jsonPath("$.userId").value(1))
            .andExpect(jsonPath("$.ticketNumber").value(98))
            .andExpect(jsonPath("$.ticketingStatus").value("SUCCESS"))
            .andExpect(jsonPath("$.usageStatus").value("BEFORE_SERVING"))
            .andExpect(jsonPath("$.remainingQuantity").value(2))

        then(ticketService).should().requestTicket(request)
    }

    @Test
    @DisplayName("POST /api/tickets/request - 유효하지 않은 발급 요청이면 400을 반환한다")
    @WithMockUser
    fun requestTicket_invalidRequest_returns400() {
        // given
        val request = TicketDto.TicketRequest(0L, 1L, "")

        // when & then
        mockMvc.perform(
            post("/api/tickets/request")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isBadRequest)
    }

    @Test
    @DisplayName("POST /api/tickets/verify - QR 검증 성공 시 200 응답과 사용 처리 결과를 반환한다")
    @WithMockUser
    fun verifyTicket_returns200() {
        // given
        val request = TicketDto.VerifyTicketRequest(100L, 10L, 1L, "valid-signature")
        val response = TicketDto.VerifyTicketResponse(
            verified = true,
            ticketId = 100L,
            usageStatus = TicketUsageStatus.USED
        )

        given(ticketVerificationService.verify(request)).willReturn(response)

        // when & then
        mockMvc.perform(
            post("/api/tickets/verify")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.verified").value(true))
            .andExpect(jsonPath("$.ticketId").value(100))
            .andExpect(jsonPath("$.usageStatus").value("USED"))

        then(ticketVerificationService).should().verify(request)
    }

    @Test
    @DisplayName("POST /api/tickets/verify - 유효하지 않은 검증 요청이면 400을 반환한다")
    @WithMockUser
    fun verifyTicket_invalidRequest_returns400() {
        // given
        val request = TicketDto.VerifyTicketRequest(100L, 10L, 1L, "")

        // when & then
        mockMvc.perform(
            post("/api/tickets/verify")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isBadRequest)
    }
}
