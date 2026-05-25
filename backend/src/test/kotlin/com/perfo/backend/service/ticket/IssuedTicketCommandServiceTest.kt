package com.perfo.backend.service.ticket

import com.perfo.backend.dto.TicketDto
import com.perfo.backend.dto.TicketDto.IssuedTicketStatus
import com.perfo.backend.entity.Event
import com.perfo.backend.entity.IssuedTicket
import com.perfo.backend.entity.TicketDiscoveryMode
import com.perfo.backend.repository.IssuedTicketRepository
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
import org.mockito.kotlin.doThrow
import org.mockito.kotlin.eq
import org.mockito.kotlin.whenever
import org.springframework.mock.web.MockMultipartFile
import org.springframework.security.access.AccessDeniedException
import java.time.LocalDate
import java.time.OffsetDateTime
import java.time.ZoneOffset
import java.util.Optional

@ExtendWith(MockitoExtension::class)
class IssuedTicketCommandServiceTest {

    @org.mockito.Mock
    private lateinit var issuedTicketRepository: IssuedTicketRepository

    @org.mockito.Mock
    private lateinit var queryService: IssuedTicketQueryService

    @org.mockito.Mock
    private lateinit var eventSyncService: IssuedTicketEventSyncService

    @org.mockito.Mock
    private lateinit var imageService: TicketImageService

    @org.mockito.Mock
    private lateinit var notificationService: IssuedTicketNotificationService

    @org.mockito.InjectMocks
    private lateinit var commandService: IssuedTicketCommandService

    @Test
    @DisplayName("티켓 생성 성공 - 이벤트 연결까지 반영한다")
    fun createSuccess() {
        val request = createRequest(ownerUserId = "owner-1", openAt = "2026-08-15T08:00:00Z", imageKey = "owner-1/1/cover.png")
        given(issuedTicketRepository.save(any())).willAnswer {
            val ticket = it.arguments[0] as IssuedTicket
            ticket.id = ticket.id ?: 1L
            ticket
        }
        whenever(eventSyncService.syncLinkedEvent(any(), any())).thenAnswer {
            val ticket = it.arguments[0] as IssuedTicket
            ticket.eventId = 11L
            Event(id = 11L)
        }
        whenever(imageService.normalizeImageKey("owner-1/1/cover.png", "owner-1/")).thenReturn("owner-1/1/cover.png")

        val created = commandService.create(request, "owner-1", null)

        assertThat(created.id).isEqualTo(1L)
        assertThat(created.eventId).isEqualTo(11L)
        assertThat(created.status).isEqualTo(IssuedTicketStatus.INACTIVE)
        assertThat(created.imageKey).isEqualTo("owner-1/1/cover.png")
    }

    @Test
    @DisplayName("티켓 생성 성공 - 대표 이미지를 함께 업로드하면 저장 key를 반영한다")
    fun createWithImageSuccess() {
        val request = createRequest(ownerUserId = "owner-1")
        val file = MockMultipartFile(
            "file",
            "cover.png",
            "image/png",
            byteArrayOf(
                0x89.toByte(), 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
                0x00, 0x00, 0x00, 0x0D,
            ),
        )
        given(issuedTicketRepository.save(any())).willAnswer {
            val ticket = it.arguments[0] as IssuedTicket
            ticket.id = ticket.id ?: 1L
            ticket
        }
        whenever(eventSyncService.syncLinkedEvent(any(), any())).thenReturn(Event(id = 11L))
        whenever(imageService.uploadImageForCreatedTicket(any(), any())).thenReturn("owner-1/1/generated.png")

        val created = commandService.create(request, "owner-1", file)

        assertThat(created.imageKey).isEqualTo("owner-1/1/generated.png")
    }

    @Test
    @DisplayName("티켓 생성 실패 - 소유자 헤더와 payload가 다르면 거부한다")
    fun createOwnerMismatchThrowsException() {
        doThrow(AccessDeniedException("Ticket owner mismatch"))
            .whenever(queryService)
            .validateOwner("owner-2", "owner-1")

        assertThatThrownBy { commandService.create(createRequest(ownerUserId = "owner-2"), "owner-1", null) }
            .isInstanceOf(AccessDeniedException::class.java)
            .hasMessage("Ticket owner mismatch")
    }

    @Test
    @DisplayName("티켓 생성 실패 - place id 형식이 잘못되면 예외를 던진다")
    fun createInvalidPlaceIdThrowsException() {
        assertThatThrownBy { commandService.create(createRequest(googlePlaceId = "bad id"), "owner-1", null) }
            .isInstanceOf(IllegalArgumentException::class.java)
            .hasMessage("Invalid googlePlaceId")
    }

    @Test
    @DisplayName("발행 티켓 수정 - 일반 필드와 이미지 key를 저장하고 상태 변화가 없으면 같은 상태로 알림 호출한다")
    fun updateTicketUpdatesFields() {
        val ticket = issuedTicket(
            id = 10L,
            ownerUserId = "owner-1",
            status = IssuedTicketStatus.ISSUING,
            imageKey = "owner-1/10/old.png",
        )
        val request = updateRequest(imageKey = "owner-1/10/new.png", status = IssuedTicketStatus.ISSUING)
        given(queryService.findOwnedTicket(10L, "owner-1")).willReturn(ticket)
        given(issuedTicketRepository.save(ticket)).willAnswer { it.arguments[0] as IssuedTicket }
        whenever(imageService.normalizeImageKey("owner-1/10/new.png", "owner-1/10/")).thenReturn("owner-1/10/new.png")
        val updated = commandService.updateTicket(10L, "owner-1", request)

        assertThat(updated.name).isEqualTo("Updated Ticket")
        assertThat(updated.imageKey).isEqualTo("owner-1/10/new.png")
        then(imageService).should().cleanupPreviousImage("owner-1/10/old.png", "owner-1/10/new.png")
        then(notificationService).should().notifyIssuedStatusTransition(ticket, IssuedTicketStatus.ISSUING, IssuedTicketStatus.ISSUING)
    }

    @Test
    @DisplayName("발행 티켓 수정 - ISSUING에서 미래 openAt으로 VERIFYING 전환은 거부한다")
    fun updateTicketRejectsFutureVerifying() {
        val ticket = issuedTicket(
            id = 10L,
            ownerUserId = "owner-1",
            status = IssuedTicketStatus.ISSUING,
            imageKey = "owner-1/10/old.png",
        )
        given(queryService.findOwnedTicket(10L, "owner-1")).willReturn(ticket)
        whenever(imageService.normalizeImageKey("owner-1/10/new.png", "owner-1/10/")).thenReturn("owner-1/10/new.png")

        assertThatThrownBy {
            commandService.updateTicket(
                10L,
                "owner-1",
                updateRequest(
                    openAt = "2999-09-01T09:00:00Z",
                    status = IssuedTicketStatus.VERIFYING,
                    imageKey = "owner-1/10/new.png",
                ),
            )
        }
            .isInstanceOf(IllegalArgumentException::class.java)
            .hasMessage("Invalid issued ticket status transition")

        then(imageService).should().cleanupReplacedImage("owner-1/10/old.png", "owner-1/10/new.png")
    }

    @Test
    @DisplayName("발행 티켓 상태 전환 - 상태를 갱신하고 event sync와 알림을 호출한다")
    fun updateIssuedStatusUpdatesStatusAndNotifies() {
        val ticket = issuedTicket(id = 1L, ownerUserId = "owner-1", status = IssuedTicketStatus.INACTIVE)
        given(queryService.findOwnedTicket(1L, "owner-1")).willReturn(ticket)
        given(issuedTicketRepository.save(ticket)).willAnswer { it.arguments[0] as IssuedTicket }

        val updated = commandService.updateIssuedStatus(1L, "owner-1", IssuedTicketStatus.ISSUING)

        assertThat(updated.status).isEqualTo(IssuedTicketStatus.ISSUING)
        then(eventSyncService).should().syncLinkedEvent(eq(ticket), any())
        then(notificationService).should().notifyIssuedStatusTransition(ticket, IssuedTicketStatus.INACTIVE, IssuedTicketStatus.ISSUING)
    }

    @Test
    @DisplayName("발행 티켓 상태 전환 - 같은 상태면 저장하지 않는다")
    fun updateIssuedStatusSameStatusDoesNotSave() {
        val ticket = issuedTicket(id = 1L, ownerUserId = "owner-1", status = IssuedTicketStatus.INACTIVE)
        given(queryService.findOwnedTicket(1L, "owner-1")).willReturn(ticket)

        val updated = commandService.updateIssuedStatus(1L, "owner-1", IssuedTicketStatus.INACTIVE)

        assertThat(updated).isSameAs(ticket)
        then(issuedTicketRepository).should(never()).save(any())
    }

    @Test
    @DisplayName("자동 상태 동기화 - openAt이 지난 ISSUING 티켓은 VERIFYING으로 전환한다")
    fun reconcileMovesOpenTicketsToVerifying() {
        val ticket = issuedTicket(
            id = 11L,
            ownerUserId = "owner-1",
            status = IssuedTicketStatus.ISSUING,
            validDate = LocalDate.now(ZoneOffset.UTC),
            openAt = OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(5),
        )
        given(
            issuedTicketRepository.findByStatusInAndValidDateBefore(
                listOf(
                    IssuedTicketStatus.INACTIVE,
                    IssuedTicketStatus.ISSUING,
                    IssuedTicketStatus.VERIFYING,
                ),
                LocalDate.now(ZoneOffset.UTC),
            ),
        ).willReturn(emptyList())
        given(issuedTicketRepository.findByStatusAndOpenAtLessThanEqual(eq(IssuedTicketStatus.ISSUING), any())).willReturn(listOf(ticket))
        given(issuedTicketRepository.save(ticket)).willAnswer { it.arguments[0] as IssuedTicket }

        commandService.reconcileIssuedTicketStatuses()

        assertThat(ticket.status).isEqualTo(IssuedTicketStatus.VERIFYING)
        then(notificationService).should().notifyIssuedStatusTransition(ticket, IssuedTicketStatus.ISSUING, IssuedTicketStatus.VERIFYING)
    }

    private fun createRequest(
        googlePlaceId: String = "ChIJPLACE",
        ownerUserId: String? = null,
        openAt: String? = null,
        imageKey: String? = null,
    ) = TicketDto.CreateTicketRequest(
        name = "PERFO Test Ticket",
        venue = "올림픽공원 체조경기장",
        googlePlaceId = googlePlaceId,
        detailAddress = "2층 A게이트 앞",
        validDate = "2026-08-15",
        openAt = openAt,
        totalCount = 100,
        allowDuplicate = false,
        maxPerUser = 1,
        imageKey = imageKey,
        ownerUserId = ownerUserId,
    )

    private fun updateRequest(
        openAt: String = "2026-09-01T09:00:00Z",
        status: IssuedTicketStatus = IssuedTicketStatus.ISSUING,
        imageKey: String = "owner-1/10/new.png",
    ) = TicketDto.UpdateTicketRequest(
        name = "Updated Ticket",
        venue = "잠실실내체육관",
        googlePlaceId = "ChIJUPDATED",
        detailAddress = "B 게이트",
        validDate = "2026-09-01",
        openAt = openAt,
        totalCount = 300,
        allowDuplicate = true,
        maxPerUser = 2,
        status = status,
        imageKey = imageKey,
    )

    private fun issuedTicket(
        id: Long,
        ownerUserId: String,
        name: String = "PERFO Test Ticket",
        status: IssuedTicketStatus = IssuedTicketStatus.INACTIVE,
        discoveryMode: TicketDiscoveryMode = TicketDiscoveryMode.LISTED,
        imageKey: String? = null,
        totalCount: Int = 100,
        validDate: LocalDate = LocalDate.parse("2026-08-15"),
        openAt: OffsetDateTime = OffsetDateTime.parse("2026-08-15T08:00:00Z"),
    ) = IssuedTicket(
        id = id,
        ownerUserId = ownerUserId,
        name = name,
        venue = "올림픽공원 체조경기장",
        googlePlaceId = "ChIJPLACE",
        detailAddress = "2층 A게이트 앞",
        validDate = validDate,
        openAt = openAt,
        imageKey = imageKey,
        totalCount = totalCount,
        allowDuplicate = false,
        maxPerUser = 1,
        discoveryMode = discoveryMode,
        eventId = null,
        status = status,
        issuedCount = 0,
    )
}
