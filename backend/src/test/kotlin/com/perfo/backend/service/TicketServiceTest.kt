package com.perfo.backend.service

import com.perfo.backend.dto.TicketDto
import com.perfo.backend.dto.TicketDto.IssuedTicketStatus
import com.perfo.backend.service.ticket.IssuedTicketCommandService
import com.perfo.backend.service.ticket.IssuedTicketQueryService
import com.perfo.backend.service.ticket.TicketImageService
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.BDDMockito.given
import org.mockito.BDDMockito.then
import org.mockito.junit.jupiter.MockitoExtension
import org.mockito.kotlin.any
import org.mockito.kotlin.anyOrNull
import org.mockito.kotlin.eq
import org.springframework.mock.web.MockMultipartFile

@ExtendWith(MockitoExtension::class)
class TicketServiceTest {

    @org.mockito.Mock
    private lateinit var commandService: IssuedTicketCommandService

    @org.mockito.Mock
    private lateinit var queryService: IssuedTicketQueryService

    @org.mockito.Mock
    private lateinit var imageService: TicketImageService

    @org.mockito.InjectMocks
    private lateinit var ticketService: TicketService

    @Test
    @DisplayName("facade는 생성 command 결과를 query 응답으로 변환한다")
    fun createDelegatesToCommandAndQuery() {
        val request = createRequest()
        val ticket = issuedTicket(id = 1L, ownerUserId = "owner-1")
        val response = ticketResponse(id = 1L, ownerUserId = "owner-1")
        given(commandService.create(request, "owner-1", null)).willReturn(ticket)
        given(queryService.toResponse(eq(ticket), any(), anyOrNull())).willReturn(response)

        val created = ticketService.create(request, "owner-1")

        assertThat(created).isSameAs(response)
    }

    @Test
    @DisplayName("facade는 조회를 query service에 위임한다")
    fun findAllDelegatesToQueryService() {
        val responses = listOf(ticketResponse(id = 2L, ownerUserId = "owner-1"))
        given(queryService.findAllByOwnerUserId("owner-1", "owner-1")).willReturn(responses)

        val result = ticketService.findAllByOwnerUserId("owner-1", "owner-1")

        assertThat(result).isSameAs(responses)
    }

    @Test
    @DisplayName("facade는 수정 command 결과를 query 응답으로 변환한다")
    fun updateDelegatesToCommandAndQuery() {
        val request = updateRequest()
        val ticket = issuedTicket(id = 10L, ownerUserId = "owner-1")
        val response = ticketResponse(id = 10L, ownerUserId = "owner-1")
        given(commandService.updateTicket(10L, "owner-1", request)).willReturn(ticket)
        given(queryService.toResponse(eq(ticket), any(), anyOrNull())).willReturn(response)

        val updated = ticketService.updateTicket(10L, "owner-1", request)

        assertThat(updated).isSameAs(response)
    }

    @Test
    @DisplayName("facade는 이미지 관련 호출을 image service에 위임한다")
    fun imageOperationsDelegateToImageService() {
        val file = MockMultipartFile("file", "cover.png", "image/png", byteArrayOf(1, 2, 3))
        val uploadResponse = TicketDto.TicketImageUploadResponse("owner-1/5/generated.png", "/api/tickets/5/image")
        val image = ProfileImageContent("png".toByteArray(), "image/png")
        given(imageService.uploadTicketImage(5L, "owner-1", file)).willReturn(uploadResponse)
        given(imageService.getTicketImage(5L, "owner-1")).willReturn(image)
        given(imageService.getPublicTicketImage(5L)).willReturn(image)

        assertThat(ticketService.uploadTicketImage(5L, "owner-1", file)).isSameAs(uploadResponse)
        assertThat(ticketService.getTicketImage(5L, "owner-1")).isSameAs(image)
        assertThat(ticketService.getPublicTicketImage(5L)).isSameAs(image)

        ticketService.cleanupUploadedTicketImage(5L, "owner-1", "owner-1/5/transient.png")
        then(imageService).should().cleanupUploadedTicketImage(5L, "owner-1", "owner-1/5/transient.png")
    }

    @Test
    @DisplayName("facade는 상태 전환과 reconcile을 command service에 위임한다")
    fun statusOperationsDelegateToCommandService() {
        val ticket = issuedTicket(id = 1L, ownerUserId = "owner-1", status = IssuedTicketStatus.ISSUING)
        val response = ticketResponse(id = 1L, ownerUserId = "owner-1", status = IssuedTicketStatus.ISSUING)
        given(commandService.updateIssuedStatus(1L, "owner-1", IssuedTicketStatus.ISSUING)).willReturn(ticket)
        given(queryService.toResponse(eq(ticket), any(), anyOrNull())).willReturn(response)

        val updated = ticketService.updateIssuedStatus(1L, "owner-1", IssuedTicketStatus.ISSUING)
        ticketService.reconcileIssuedTicketStatuses()

        assertThat(updated).isSameAs(response)
        then(commandService).should().reconcileIssuedTicketStatuses()
        then(commandService).should().updateIssuedStatus(1L, "owner-1", IssuedTicketStatus.ISSUING)
        then(queryService).should().toResponse(eq(ticket), any(), anyOrNull())
    }

    private fun createRequest() = TicketDto.CreateTicketRequest(
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
        ownerUserId = "owner-1",
    )

    private fun updateRequest() = TicketDto.UpdateTicketRequest(
        name = "Updated Ticket",
        venue = "잠실실내체육관",
        googlePlaceId = "ChIJUPDATED",
        detailAddress = "B 게이트",
        validDate = "2026-09-01",
        openAt = "2026-09-01T09:00:00Z",
        totalCount = 300,
        allowDuplicate = false,
        maxPerUser = 1,
        status = IssuedTicketStatus.ISSUING,
        imageKey = "owner-1/10/new.png",
    )

    private fun issuedTicket(
        id: Long,
        ownerUserId: String,
        status: IssuedTicketStatus = IssuedTicketStatus.INACTIVE,
    ) = com.perfo.backend.entity.IssuedTicket(
        id = id,
        ownerUserId = ownerUserId,
        name = "PERFO Test Ticket",
        venue = "올림픽공원 체조경기장",
        googlePlaceId = "ChIJPLACE",
        detailAddress = "2층 A게이트 앞",
        validDate = java.time.LocalDate.parse("2026-08-15"),
        openAt = java.time.OffsetDateTime.parse("2026-08-15T08:00:00Z"),
        totalCount = 100,
        allowDuplicate = false,
        maxPerUser = 1,
        discoveryMode = com.perfo.backend.entity.TicketDiscoveryMode.LISTED,
        status = status,
        issuedCount = 0,
    )

    private fun ticketResponse(
        id: Long,
        ownerUserId: String,
        status: IssuedTicketStatus = IssuedTicketStatus.INACTIVE,
    ) = TicketDto.TicketResponse(
        id = id,
        name = "PERFO Test Ticket",
        venue = "올림픽공원 체조경기장",
        googlePlaceId = "ChIJPLACE",
        detailAddress = "2층 A게이트 앞",
        validDate = "2026-08-15",
        openAt = "2026-08-15T08:00Z",
        imageKey = null,
        imageUrl = null,
        totalCount = 100,
        allowDuplicate = false,
        maxPerUser = 1,
        discoveryMode = com.perfo.backend.entity.TicketDiscoveryMode.LISTED,
        status = status,
        issuedCount = 0,
        ownerUserId = ownerUserId,
        eventId = null,
        publicBookingPath = null,
        publicBookingUrl = null,
    )
}
