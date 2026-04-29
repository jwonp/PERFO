package com.perfo.backend.controller

import com.fasterxml.jackson.databind.ObjectMapper
import com.perfo.backend.config.HeaderAuthenticationFilter
import com.perfo.backend.dto.TicketDto
import com.perfo.backend.dto.TicketDto.IssuedTicketStatus
import com.perfo.backend.entity.TicketUsageStatus
import com.perfo.backend.entity.TicketingStatus
import com.perfo.backend.service.TicketTransitionService
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest
import org.springframework.context.annotation.Import
import org.springframework.http.MediaType
import org.springframework.security.test.context.support.WithMockUser
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf
import org.springframework.test.context.bean.override.mockito.MockitoBean
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.mockito.BDDMockito.given

@WebMvcTest(TicketController::class)
@Import(HeaderAuthenticationFilter::class)
class TicketTransitionControllerTest {

    @Autowired
    private lateinit var mockMvc: MockMvc

    @Autowired
    private lateinit var objectMapper: ObjectMapper

    @field:MockitoBean
    private lateinit var ticketService: com.perfo.backend.service.TicketService

    @field:MockitoBean
    private lateinit var ticketVerificationService: com.perfo.backend.service.TicketVerificationService

    @field:MockitoBean
    private lateinit var ticketTransitionService: TicketTransitionService

    @Test
    @DisplayName("PATCH /api/internal/tickets/{ticketId}/ticketing-status - 티켓팅 상태를 전환한다")
    @WithMockUser
    fun transitionTicketingStatus_returns200() {
        val request = TicketDto.TicketStatusTransitionRequest(nextStatus = TicketingStatus.SUCCESS)
        val response = TicketDto.TicketStateResponse(
            ticketId = 10L,
            ticketingStatus = TicketingStatus.SUCCESS,
            usageStatus = TicketUsageStatus.WAITING,
        )

        given(ticketTransitionService.transitionTicketingStatus(10L, TicketingStatus.SUCCESS)).willReturn(response)

        mockMvc.perform(
            patch("/api/internal/tickets/10/ticketing-status")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)),
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.ticketingStatus").value("SUCCESS"))
    }

    @Test
    @DisplayName("PATCH /api/internal/tickets/{ticketId}/usage-status - 사용 상태를 전환한다")
    @WithMockUser
    fun transitionUsageStatus_returns200() {
        val request = TicketDto.TicketUsageTransitionRequest(nextStatus = TicketUsageStatus.EXPIRED)
        val response = TicketDto.TicketStateResponse(
            ticketId = 10L,
            ticketingStatus = TicketingStatus.SUCCESS,
            usageStatus = TicketUsageStatus.EXPIRED,
        )

        given(ticketTransitionService.transitionUsageStatus(10L, TicketUsageStatus.EXPIRED)).willReturn(response)

        mockMvc.perform(
            patch("/api/internal/tickets/10/usage-status")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)),
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.usageStatus").value("EXPIRED"))
    }

    @Test
    @DisplayName("PATCH /api/internal/issued-tickets/{ticketId}/status - 발행 티켓 상태를 전환한다")
    @WithMockUser
    fun transitionIssuedTicketStatus_returns200() {
        val request = TicketDto.IssuedTicketStatusTransitionRequest(nextStatus = IssuedTicketStatus.VERIFYING)
        val response = TicketDto.TicketResponse(
            id = 20L,
            name = "PERFO Test Ticket",
            venue = "올림픽공원 체조경기장",
            googlePlaceId = "ChIJPLACE",
            detailAddress = "2층 A게이트 앞",
            validDate = "2026-08-15",
            totalCount = 100,
            allowDuplicate = false,
            maxPerUser = 1,
            status = IssuedTicketStatus.VERIFYING,
            issuedCount = 15,
            ownerUserId = "owner-1",
        )

        given(ticketService.updateIssuedStatus(20L, IssuedTicketStatus.VERIFYING)).willReturn(response)

        mockMvc.perform(
            patch("/api/internal/issued-tickets/20/status")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)),
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.status").value("VERIFYING"))
            .andExpect(jsonPath("$.issuedCount").value(15))
    }
}
