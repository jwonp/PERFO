package com.perfo.backend.controller

import com.perfo.backend.dto.TicketDto
import com.perfo.backend.dto.TicketDto.IssuedTicketStatus
import java.time.Instant
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.mockito.BDDMockito.given
import org.mockito.kotlin.any
import org.mockito.kotlin.eq
import org.mockito.kotlin.whenever
import org.springframework.http.MediaType
import org.springframework.mock.web.MockMultipartFile
import org.springframework.security.access.AccessDeniedException
import org.springframework.security.test.context.support.WithMockUser
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.content
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

class TicketControllerIssuedTicketApiTest : TicketControllerWebMvcTestSupport() {

    @Test
    @DisplayName("POST /api/tickets - 티켓 생성 성공 시 200과 생성 결과를 반환한다")
    @WithMockUser(username = "owner-1", roles = ["ORGANIZER"])
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

        given(ticketService.create(request, "owner-1")).willReturn(ticketResponse())

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
    @DisplayName("POST /api/tickets multipart - 이미지와 함께 티켓 생성 결과를 반환한다")
    @WithMockUser(username = "owner-1", roles = ["ORGANIZER"])
    fun createTicketWithImage_returns200() {
        val request = TicketDto.CreateTicketRequest(
            name = "PERFO Multipart Ticket",
            venue = "올림픽공원 체조경기장",
            googlePlaceId = "ChIJPLACE",
            detailAddress = "2층 A게이트 앞",
            validDate = "2026-08-15",
            openAt = "2026-08-15T08:00:00Z",
            totalCount = 100,
            allowDuplicate = false,
            maxPerUser = 1,
        )
        val payload = MockMultipartFile(
            "payload",
            "payload.json",
            MediaType.APPLICATION_JSON_VALUE,
            objectMapper.writeValueAsBytes(request),
        )
        val file = MockMultipartFile("file", "cover.png", "image/png", "png".toByteArray())

        given(ticketService.create(eq(request), eq("owner-1"), any())).willReturn(
            ticketResponse(imageKey = "owner-1/1/generated.png"),
        )

        mockMvc.perform(
            multipart("/api/tickets")
                .file(payload)
                .file(file)
                .with(csrf()),
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.id").value(1))
            .andExpect(jsonPath("$.imageKey").value("owner-1/1/generated.png"))
            .andExpect(jsonPath("$.imageUrl").value("/api/tickets/1/image"))
    }

    @Test
    @DisplayName("GET /api/tickets - ownerUserId의 발행 티켓 목록을 반환한다")
    @WithMockUser(username = "owner-1", roles = ["ORGANIZER"])
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
    @WithMockUser(username = "owner-1", roles = ["ORGANIZER"])
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
    @WithMockUser(username = "owner-1", roles = ["ORGANIZER"])
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
    @WithMockUser(username = "owner-1", roles = ["ORGANIZER"])
    fun getTicketImage_returns200() {
        given(ticketService.getTicketImage(1L, "owner-1")).willReturn(
            imageContent("png".toByteArray()),
        )

        mockMvc.perform(get("/api/tickets/1/image"))
            .andExpect(status().isOk)
            .andExpect(content().contentType("image/png"))
            .andExpect(content().bytes("png".toByteArray()))
    }

    @Test
    @DisplayName("GET /api/public/tickets/{ticketId}/image - 공개 티켓 이미지를 인증 없이 반환한다")
    fun getPublicTicketImage_returns200() {
        given(ticketService.getPublicTicketImage(1L)).willReturn(
            imageContent("public-png".toByteArray()),
        )

        mockMvc.perform(get("/api/public/tickets/1/image"))
            .andExpect(status().isOk)
            .andExpect(content().contentType("image/png"))
            .andExpect(content().bytes("public-png".toByteArray()))
    }

    @Test
    @DisplayName("DELETE /api/tickets/{ticketId}/image - cleanup 요청을 처리한다")
    @WithMockUser(username = "owner-1", roles = ["ORGANIZER"])
    fun cleanupTicketImage_returns204() {
        mockMvc.perform(
            delete("/api/tickets/1/image")
                .with(csrf())
                .param("imageKey", "owner-1/1/transient.png"),
        )
            .andExpect(status().isNoContent)
    }

    @Test
    @DisplayName("POST /api/tickets - googlePlaceId가 형식에 맞지 않으면 400을 반환한다")
    @WithMockUser(username = "owner-1", roles = ["ORGANIZER"])
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
    @WithMockUser(username = "owner-1", roles = ["ORGANIZER"])
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
                .header(
                    "Authorization",
                    "Bearer ${createInternalToken(42L, "tickets", Instant.now().minusSeconds(5))}",
                )
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)),
        )
            .andExpect(status().isUnauthorized)
    }
}
