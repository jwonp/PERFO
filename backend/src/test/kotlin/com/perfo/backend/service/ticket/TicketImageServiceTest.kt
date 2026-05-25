package com.perfo.backend.service.ticket

import com.perfo.backend.dto.TicketDto.IssuedTicketStatus
import com.perfo.backend.entity.IssuedTicket
import com.perfo.backend.entity.TicketDiscoveryMode
import com.perfo.backend.service.ProfileImageContent
import com.perfo.backend.service.PublicTicketImageUnavailableException
import com.perfo.backend.service.TicketImageStorageService
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.BDDMockito.given
import org.mockito.BDDMockito.then
import org.mockito.Mockito.never
import org.mockito.junit.jupiter.MockitoExtension
import org.mockito.kotlin.any
import org.mockito.kotlin.eq
import org.mockito.kotlin.whenever
import org.springframework.mock.web.MockMultipartFile
import java.time.LocalDate
import java.time.OffsetDateTime

@ExtendWith(MockitoExtension::class)
class TicketImageServiceTest {

    @org.mockito.Mock
    private lateinit var queryService: IssuedTicketQueryService

    @org.mockito.Mock
    private lateinit var ticketImageStorageService: TicketImageStorageService

    @org.mockito.InjectMocks
    private lateinit var imageService: TicketImageService

    @Test
    @DisplayName("티켓 이미지 업로드 - 허용 이미지면 object key와 표시 URL을 반환한다")
    fun uploadTicketImageReturnsImageKeyAndUrl() {
        val ticket = issuedTicket(id = 5L, ownerUserId = "owner-1")
        val file = MockMultipartFile(
            "file",
            "cover.png",
            "image/png",
            byteArrayOf(
                0x89.toByte(), 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
                0x00, 0x00, 0x00, 0x0D,
            ),
        )
        given(queryService.findOwnedTicket(5L, "owner-1")).willReturn(ticket)
        whenever(ticketImageStorageService.uploadTicketImage(any(), eq(file.bytes), eq("image/png")))
            .thenReturn("owner-1/5/generated.png")
        given(ticketImageStorageService.buildTicketImageUrl(5L)).willReturn("/api/tickets/5/image")

        val response = imageService.uploadTicketImage(5L, "owner-1", file)

        assertThat(response.imageKey).isEqualTo("owner-1/5/generated.png")
        assertThat(response.imageUrl).isEqualTo("/api/tickets/5/image")
    }

    @Test
    @DisplayName("티켓 이미지 업로드 - SVG는 거부한다")
    fun uploadTicketImageRejectsSvg() {
        val ticket = issuedTicket(id = 5L, ownerUserId = "owner-1")
        val file = MockMultipartFile(
            "file",
            "cover.svg",
            "image/svg+xml",
            "<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>".toByteArray(),
        )
        given(queryService.findOwnedTicket(5L, "owner-1")).willReturn(ticket)

        assertThatThrownBy { imageService.uploadTicketImage(5L, "owner-1", file) }
            .isInstanceOf(IllegalArgumentException::class.java)
            .hasMessage("Unsupported ticket image format")
    }

    @Test
    @DisplayName("티켓 이미지 cleanup - 아직 저장되지 않은 새 key만 삭제한다")
    fun cleanupUploadedTicketImageDeletesOnlyTransientKey() {
        val ticket = issuedTicket(id = 5L, ownerUserId = "owner-1", imageKey = "owner-1/5/current.png")
        given(queryService.findOwnedTicket(5L, "owner-1")).willReturn(ticket)

        imageService.cleanupUploadedTicketImage(5L, "owner-1", "owner-1/5/transient.png")

        then(ticketImageStorageService).should().deleteTicketImage("owner-1/5/transient.png")
    }

    @Test
    @DisplayName("티켓 이미지 cleanup - 현재 저장된 key는 삭제하지 않는다")
    fun cleanupUploadedTicketImageKeepsCurrentKey() {
        val ticket = issuedTicket(id = 5L, ownerUserId = "owner-1", imageKey = "owner-1/5/current.png")
        given(queryService.findOwnedTicket(5L, "owner-1")).willReturn(ticket)

        imageService.cleanupUploadedTicketImage(5L, "owner-1", "owner-1/5/current.png")

        then(ticketImageStorageService).should(never()).deleteTicketImage(any())
    }

    @Test
    @DisplayName("공개 티켓 이미지 조회 - 공개 가능한 티켓이면 이미지를 반환한다")
    fun getPublicTicketImageReturnsImageForPublicTicket() {
        val ticket = issuedTicket(
            id = 5L,
            ownerUserId = "owner-1",
            imageKey = "owner-1/5/current.png",
            status = IssuedTicketStatus.VERIFYING,
            discoveryMode = TicketDiscoveryMode.LINK_ONLY,
        )
        given(queryService.findTicket(5L)).willReturn(ticket)
        given(ticketImageStorageService.downloadTicketImage("owner-1/5/current.png")).willReturn(
            ProfileImageContent(bytes = "png".toByteArray(), contentType = "image/png"),
        )

        val image = imageService.getPublicTicketImage(5L)

        assertThat(image.contentType).isEqualTo("image/png")
        assertThat(image.bytes).isEqualTo("png".toByteArray())
    }

    @Test
    @DisplayName("공개 티켓 이미지 조회 - 비공개 상태 티켓이면 노출하지 않는다")
    fun getPublicTicketImageBlocksInactiveTicket() {
        val ticket = issuedTicket(
            id = 5L,
            ownerUserId = "owner-1",
            imageKey = "owner-1/5/current.png",
            status = IssuedTicketStatus.INACTIVE,
            discoveryMode = TicketDiscoveryMode.LISTED,
        )
        given(queryService.findTicket(5L)).willReturn(ticket)

        assertThatThrownBy { imageService.getPublicTicketImage(5L) }
            .isInstanceOf(PublicTicketImageUnavailableException::class.java)
    }

    private fun issuedTicket(
        id: Long,
        ownerUserId: String,
        status: IssuedTicketStatus = IssuedTicketStatus.INACTIVE,
        discoveryMode: TicketDiscoveryMode = TicketDiscoveryMode.LISTED,
        imageKey: String? = null,
    ) = IssuedTicket(
        id = id,
        ownerUserId = ownerUserId,
        name = "PERFO Test Ticket",
        venue = "올림픽공원 체조경기장",
        googlePlaceId = "ChIJPLACE",
        detailAddress = "2층 A게이트 앞",
        validDate = LocalDate.parse("2026-08-15"),
        openAt = OffsetDateTime.parse("2026-08-15T08:00:00Z"),
        imageKey = imageKey,
        totalCount = 100,
        allowDuplicate = false,
        maxPerUser = 1,
        discoveryMode = discoveryMode,
        eventId = null,
        status = status,
        issuedCount = 0,
    )
}
