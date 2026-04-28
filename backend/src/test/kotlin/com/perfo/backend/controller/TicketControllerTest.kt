package com.perfo.backend.controller

import com.fasterxml.jackson.databind.ObjectMapper
import com.perfo.backend.dto.TicketDto
import com.perfo.backend.service.TicketService
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.mockito.BDDMockito.given
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest
import org.springframework.http.MediaType
import org.springframework.security.test.context.support.WithMockUser
import org.springframework.test.context.bean.override.mockito.MockitoBean
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf

@WebMvcTest(TicketController::class)
class TicketControllerTest {

    @Autowired
    private lateinit var mockMvc: MockMvc

    @Autowired
    private lateinit var objectMapper: ObjectMapper

    @field:MockitoBean
    private lateinit var ticketService: TicketService

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
            maxPerUser = 1
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
            maxPerUser = request.maxPerUser
        )

        given(ticketService.create(request)).willReturn(response)

        mockMvc.perform(
            post("/api/tickets")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.id").value(1))
            .andExpect(jsonPath("$.name").value("PERFO Test Ticket"))
            .andExpect(jsonPath("$.googlePlaceId").value("ChIJPLACE"))
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
            maxPerUser = 1
        )

        mockMvc.perform(
            post("/api/tickets")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isBadRequest)
    }
}
