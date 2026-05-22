package com.perfo.backend.service

import com.perfo.backend.dto.TicketDto
import com.perfo.backend.dto.TicketDto.IssuedTicketStatus
import com.perfo.backend.entity.Event
import com.perfo.backend.entity.IssuedTicket
import com.perfo.backend.entity.TicketDiscoveryMode
import com.perfo.backend.repository.EventRepository
import com.perfo.backend.repository.IssuedTicketRepository
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.BDDMockito.given
import org.mockito.BDDMockito.then
import org.mockito.Mockito.never
import org.mockito.Mockito.verifyNoInteractions
import org.mockito.junit.jupiter.MockitoExtension
import org.mockito.kotlin.any
import org.mockito.kotlin.eq
import org.mockito.kotlin.whenever
import org.springframework.mock.web.MockMultipartFile
import org.springframework.security.access.AccessDeniedException
import java.time.Instant
import java.time.LocalDate
import java.time.OffsetDateTime
import java.time.ZoneOffset
import java.util.Optional

@ExtendWith(MockitoExtension::class)
class TicketServiceTest {

    @org.mockito.Mock
    private lateinit var issuedTicketRepository: IssuedTicketRepository

    @org.mockito.Mock
    private lateinit var eventRepository: EventRepository

    @org.mockito.Mock
    private lateinit var notificationBridgeService: NotificationBridgeService

    @org.mockito.Mock
    private lateinit var ticketImageStorageService: TicketImageStorageService

    @org.mockito.InjectMocks
    private lateinit var ticketService: TicketService

    @Test
    @DisplayName("티켓 생성 성공 - 유효한 요청이면 영속화 후 확장 필드를 반환한다")
    fun create_success() {
        val request = createRequest(
            ownerUserId = "owner-1",
            openAt = "2026-08-15T08:00:00Z",
            imageKey = "owner-1/1/cover.png",
        )
        given(issuedTicketRepository.save(any())).willAnswer {
            val ticket = it.arguments[0] as IssuedTicket
            ticket.id = ticket.id ?: 1L
            ticket
        }
        given(eventRepository.save(any())).willAnswer {
            val event = it.arguments[0] as Event
            event.id = event.id ?: 11L
            event
        }
        given(ticketImageStorageService.buildTicketImageUrl(1L)).willReturn("/api/tickets/1/image")

        val created = ticketService.create(request, "owner-1")

        assertThat(created.id).isEqualTo(1L)
        assertThat(created.name).isEqualTo("PERFO Test Ticket")
        assertThat(created.googlePlaceId).isEqualTo("ChIJPLACE")
        assertThat(created.status).isEqualTo(IssuedTicketStatus.INACTIVE)
        assertThat(created.issuedCount).isZero()
        assertThat(created.ownerUserId).isEqualTo("owner-1")
        assertThat(created.openAt).isEqualTo("2026-08-15T08:00Z")
        assertThat(created.imageKey).isEqualTo("owner-1/1/cover.png")
        assertThat(created.imageUrl).isEqualTo("/api/tickets/1/image")
        assertThat(created.discoveryMode).isEqualTo(TicketDiscoveryMode.LISTED)
        assertThat(created.eventId).isEqualTo(11L)
        assertThat(created.publicBookingPath).isEqualTo("/events/11")
    }

    @Test
    @DisplayName("티켓 생성 시 연결 이벤트의 saleOpenAt은 ticket.openAt 기준으로 동기화한다")
    fun create_syncsLinkedEventSaleOpenAtFromTicketOpenAt() {
        val request = createRequest(
            ownerUserId = "owner-1",
            openAt = "2026-08-15T08:00:00Z",
        )
        var syncedEvent: Event? = null
        given(issuedTicketRepository.save(any())).willAnswer {
            val ticket = it.arguments[0] as IssuedTicket
            ticket.id = ticket.id ?: 1L
            ticket
        }
        given(eventRepository.save(any())).willAnswer {
            val event = it.arguments[0] as Event
            event.id = event.id ?: 11L
            syncedEvent = event
            event
        }

        ticketService.create(request, "owner-1")

        assertThat(syncedEvent).isNotNull
        assertThat(syncedEvent?.saleOpenAt).isEqualTo(Instant.parse("2026-08-15T08:00:00Z"))
    }

    @Test
    @DisplayName("티켓 생성 실패 - 소유자 헤더와 payload가 다르면 거부한다")
    fun create_ownerMismatch_throwsException() {
        assertThatThrownBy { ticketService.create(createRequest(ownerUserId = "owner-2"), "owner-1") }
            .isInstanceOf(AccessDeniedException::class.java)
            .hasMessage("Ticket owner mismatch")
    }

    @Test
    @DisplayName("티켓 생성 실패 - place id 형식이 잘못되면 예외를 던진다")
    fun create_invalidPlaceId_throwsException() {
        val request = createRequest(googlePlaceId = "bad id")

        assertThatThrownBy { ticketService.create(request, "owner-1") }
            .isInstanceOf(IllegalArgumentException::class.java)
            .hasMessage("Invalid googlePlaceId")
    }

    @Test
    @DisplayName("소유자별 티켓 조회 - 요청한 소유자의 티켓만 최신순으로 반환한다")
    fun findAllByOwnerUserId_returnsOwnerTicketsOnly() {
        val latest = issuedTicket(id = 2L, ownerUserId = "owner-1", name = "Latest Ticket")
        val first = issuedTicket(id = 1L, ownerUserId = "owner-1", name = "First Ticket")
        given(issuedTicketRepository.findByOwnerUserIdOrderByIdDesc("owner-1")).willReturn(listOf(latest, first))
        given(eventRepository.findAllById(emptyList<Long>())).willReturn(emptyList())

        val tickets = ticketService.findAllByOwnerUserId("owner-1", "owner-1")

        assertThat(tickets).extracting<Long> { it.id }.containsExactly(2L, 1L)
        assertThat(tickets).allMatch { it.ownerUserId == "owner-1" }
    }

    @Test
    @DisplayName("소유자별 티켓 조회 - openAt이 지나면 저장 상태와 무관하게 즉시 VERIFYING으로 계산한다")
    fun findAllByOwnerUserId_resolvesVerifyingImmediatelyAfterOpenAt() {
        val ticket = issuedTicket(
            id = 3L,
            ownerUserId = "owner-1",
            status = IssuedTicketStatus.ISSUING,
            validDate = LocalDate.now(ZoneOffset.UTC),
            openAt = OffsetDateTime.now(ZoneOffset.UTC).minusSeconds(1),
        )
        given(issuedTicketRepository.findByOwnerUserIdOrderByIdDesc("owner-1")).willReturn(listOf(ticket))
        given(eventRepository.findAllById(emptyList<Long>())).willReturn(emptyList())

        val tickets = ticketService.findAllByOwnerUserId("owner-1", "owner-1")

        assertThat(tickets.single().status).isEqualTo(IssuedTicketStatus.VERIFYING)
    }

    @Test
    @DisplayName("소유자별 티켓 조회 - 유효 날짜가 지나면 즉시 EXPIRED로 계산한다")
    fun findAllByOwnerUserId_resolvesExpiredImmediatelyAfterValidDate() {
        val ticket = issuedTicket(
            id = 4L,
            ownerUserId = "owner-1",
            status = IssuedTicketStatus.VERIFYING,
            validDate = LocalDate.now(ZoneOffset.UTC).minusDays(1),
            openAt = OffsetDateTime.now(ZoneOffset.UTC).minusHours(1),
        )
        given(issuedTicketRepository.findByOwnerUserIdOrderByIdDesc("owner-1")).willReturn(listOf(ticket))
        given(eventRepository.findAllById(emptyList<Long>())).willReturn(emptyList())

        val tickets = ticketService.findAllByOwnerUserId("owner-1", "owner-1")

        assertThat(tickets.single().status).isEqualTo(IssuedTicketStatus.EXPIRED)
    }

    @Test
    @DisplayName("소유자별 티켓 조회 - 연결 이벤트는 batch 조회로 issuedCount를 계산한다")
    fun findAllByOwnerUserId_resolvesIssuedCountWithoutNPlusOne() {
        val latest = issuedTicket(id = 2L, ownerUserId = "owner-1", eventId = 12L, totalCount = 100)
        val first = issuedTicket(id = 1L, ownerUserId = "owner-1", eventId = 11L, totalCount = 50)
        given(issuedTicketRepository.findByOwnerUserIdOrderByIdDesc("owner-1")).willReturn(listOf(latest, first))
        given(eventRepository.findAllById(listOf(12L, 11L))).willReturn(
            listOf(
                event(id = 12L, totalQuantity = 100, remainingQuantity = 60),
                event(id = 11L, totalQuantity = 50, remainingQuantity = 10),
            ),
        )

        val tickets = ticketService.findAllByOwnerUserId("owner-1", "owner-1")

        assertThat(tickets).extracting<Int> { it.issuedCount }.containsExactly(40, 40)
        then(eventRepository).should().findAllById(listOf(12L, 11L))
        then(eventRepository).should(never()).findById(any())
    }

    @Test
    @DisplayName("발행 티켓 수정 - 일반 필드와 이미지 key를 저장하고 상태 변화가 없으면 알림을 보내지 않는다")
    fun updateTicket_updatesFieldsWithoutNotification() {
        val ticket = issuedTicket(
            id = 10L,
            ownerUserId = "owner-1",
            status = IssuedTicketStatus.ISSUING,
            imageKey = "owner-1/10/old.png",
        )
        val request = TicketDto.UpdateTicketRequest(
            name = "Updated Ticket",
            venue = "잠실실내체육관",
            googlePlaceId = "ChIJUPDATED",
            detailAddress = "B 게이트",
            validDate = "2026-09-01",
            openAt = "2026-09-01T09:00:00Z",
            totalCount = 300,
            allowDuplicate = true,
            maxPerUser = 2,
            status = IssuedTicketStatus.ISSUING,
            imageKey = "owner-1/10/new.png",
        )
        given(issuedTicketRepository.findById(10L)).willReturn(Optional.of(ticket))
        given(ticketImageStorageService.buildTicketImageUrl(10L)).willReturn("/api/tickets/10/image")
        given(issuedTicketRepository.save(ticket)).willAnswer { it.arguments[0] as IssuedTicket }
        given(eventRepository.save(any())).willAnswer {
            val event = it.arguments[0] as Event
            event.id = event.id ?: 22L
            event
        }

        val updated = ticketService.updateTicket(10L, "owner-1", request)

        assertThat(updated.name).isEqualTo("Updated Ticket")
        assertThat(updated.imageKey).isEqualTo("owner-1/10/new.png")
        assertThat(updated.imageUrl).isEqualTo("/api/tickets/10/image")
        assertThat(updated.discoveryMode).isEqualTo(TicketDiscoveryMode.LISTED)
        assertThat(updated.publicBookingPath).isEqualTo("/events/22")
        then(ticketImageStorageService).should().deleteTicketImage("owner-1/10/old.png")
        verifyNoInteractions(notificationBridgeService)
    }

    @Test
    @DisplayName("발행 티켓 수정 - ISSUING에서 미래 openAt으로 VERIFYING 전환은 거부한다")
    fun updateTicket_rejectsFutureVerifying() {
        val ticket = issuedTicket(id = 10L, ownerUserId = "owner-1", status = IssuedTicketStatus.ISSUING)
        given(issuedTicketRepository.findById(10L)).willReturn(Optional.of(ticket))

        assertThatThrownBy {
            ticketService.updateTicket(
                10L,
                "owner-1",
                TicketDto.UpdateTicketRequest(
                    name = "Updated Ticket",
                    venue = "잠실실내체육관",
                    googlePlaceId = "ChIJUPDATED",
                    detailAddress = "B 게이트",
                    validDate = "2026-09-01",
                    openAt = "2999-09-01T09:00:00Z",
                    totalCount = 300,
                    allowDuplicate = false,
                    maxPerUser = 1,
                    status = IssuedTicketStatus.VERIFYING,
                    imageKey = "owner-1/10/new.png",
                ),
            )
        }
            .isInstanceOf(IllegalArgumentException::class.java)
            .hasMessage("Invalid issued ticket status transition")

        then(ticketImageStorageService).should().deleteTicketImage("owner-1/10/new.png")
    }

    @Test
    @DisplayName("발행 티켓 상태 전환 - 상태를 갱신하고 알림 브리지를 호출한다")
    fun updateIssuedStatus_updatesStatusAndSendsBridge() {
        val ticket = issuedTicket(id = 1L, ownerUserId = "owner-1", status = IssuedTicketStatus.INACTIVE)
        given(issuedTicketRepository.findById(1L)).willReturn(Optional.of(ticket))
        given(issuedTicketRepository.save(ticket)).willAnswer { it.arguments[0] as IssuedTicket }
        given(eventRepository.save(any())).willAnswer {
            val event = it.arguments[0] as Event
            event.id = event.id ?: 21L
            event
        }

        val updated = ticketService.updateIssuedStatus(1L, "owner-1", IssuedTicketStatus.ISSUING)

        assertThat(updated.status).isEqualTo(IssuedTicketStatus.ISSUING)
        then(notificationBridgeService).should().notifyTicketTransition(
            TicketTransitionNotificationRequest(
                userId = "owner-1",
                scope = "issued",
                ticketId = "1",
                ticketName = "PERFO Test Ticket",
                targetUrl = "/my-tickets/1/scan",
                statusKey = "issueStatus",
                previousStatus = IssuedTicketStatus.INACTIVE.name,
                nextStatus = IssuedTicketStatus.ISSUING.name,
            ),
        )
    }

    @Test
    @DisplayName("발행 티켓 상태 전환 - 같은 상태면 알림을 보내지 않는다")
    fun updateIssuedStatus_sameStatus_doesNotSendBridge() {
        val ticket = issuedTicket(id = 1L, ownerUserId = "owner-1", status = IssuedTicketStatus.INACTIVE)
        given(issuedTicketRepository.findById(1L)).willReturn(Optional.of(ticket))

        val updated = ticketService.updateIssuedStatus(1L, "owner-1", IssuedTicketStatus.INACTIVE)

        assertThat(updated.status).isEqualTo(IssuedTicketStatus.INACTIVE)
        then(issuedTicketRepository).should(never()).save(any())
        verifyNoInteractions(notificationBridgeService)
    }

    @Test
    @DisplayName("자동 상태 동기화 - openAt이 지난 ISSUING 티켓은 VERIFYING으로 전환한다")
    fun reconcileIssuedTicketStatuses_movesOpenTicketsToVerifying() {
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
        given(
            issuedTicketRepository.findByStatusAndOpenAtLessThanEqual(
                eq(IssuedTicketStatus.ISSUING),
                any(),
            ),
        ).willReturn(listOf(ticket))
        given(issuedTicketRepository.save(ticket)).willAnswer { it.arguments[0] as IssuedTicket }
        given(eventRepository.save(any())).willAnswer {
            val event = it.arguments[0] as Event
            event.id = event.id ?: 31L
            event
        }

        ticketService.reconcileIssuedTicketStatuses()

        assertThat(ticket.status).isEqualTo(IssuedTicketStatus.VERIFYING)
        then(notificationBridgeService).should().notifyTicketTransition(
            TicketTransitionNotificationRequest(
                userId = "owner-1",
                scope = "issued",
                ticketId = "11",
                ticketName = "PERFO Test Ticket",
                targetUrl = "/my-tickets/11/scan",
                statusKey = "issueStatus",
                previousStatus = IssuedTicketStatus.ISSUING.name,
                nextStatus = IssuedTicketStatus.VERIFYING.name,
            ),
        )
    }

    @Test
    @DisplayName("자동 상태 동기화 - 유효 날짜가 지난 티켓은 EXPIRED로 전환한다")
    fun reconcileIssuedTicketStatuses_expiresPastValidDate() {
        val expiredTicket = issuedTicket(
            id = 12L,
            ownerUserId = "owner-1",
            status = IssuedTicketStatus.VERIFYING,
            validDate = LocalDate.now(ZoneOffset.UTC).minusDays(1),
            openAt = OffsetDateTime.now(ZoneOffset.UTC).minusHours(2),
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
        ).willReturn(listOf(expiredTicket))
        given(
            issuedTicketRepository.findByStatusAndOpenAtLessThanEqual(
                eq(IssuedTicketStatus.ISSUING),
                any(),
            ),
        ).willReturn(emptyList())
        given(issuedTicketRepository.save(expiredTicket)).willAnswer { it.arguments[0] as IssuedTicket }
        given(eventRepository.save(any())).willAnswer {
            val event = it.arguments[0] as Event
            event.id = event.id ?: 32L
            event
        }

        ticketService.reconcileIssuedTicketStatuses()

        assertThat(expiredTicket.status).isEqualTo(IssuedTicketStatus.EXPIRED)
        then(notificationBridgeService).should().notifyTicketTransition(
            TicketTransitionNotificationRequest(
                userId = "owner-1",
                scope = "issued",
                ticketId = "12",
                ticketName = "PERFO Test Ticket",
                targetUrl = "/my-tickets/12/scan",
                statusKey = "issueStatus",
                previousStatus = IssuedTicketStatus.VERIFYING.name,
                nextStatus = IssuedTicketStatus.EXPIRED.name,
            ),
        )
    }

    @Test
    @DisplayName("티켓 이미지 업로드 - 허용 이미지면 object key와 표시 URL을 반환한다")
    fun uploadTicketImage_returnsImageKeyAndUrl() {
        val ticket = issuedTicket(id = 5L, ownerUserId = "owner-1")
        val file = MockMultipartFile(
            "file",
            "cover.png",
            "image/png",
            byteArrayOf(
                0x89.toByte(), 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
                0x00, 0x00, 0x00, 0x0D
            ),
        )
        given(issuedTicketRepository.findById(5L)).willReturn(Optional.of(ticket))
        whenever(ticketImageStorageService.uploadTicketImage(any(), eq(file.bytes), eq("image/png")))
            .thenReturn("owner-1/5/generated.png")
        given(ticketImageStorageService.buildTicketImageUrl(5L)).willReturn("/api/tickets/5/image")

        val response = ticketService.uploadTicketImage(5L, "owner-1", file)

        assertThat(response.imageKey).isEqualTo("owner-1/5/generated.png")
        assertThat(response.imageUrl).isEqualTo("/api/tickets/5/image")
    }

    @Test
    @DisplayName("티켓 이미지 업로드 - SVG는 거부한다")
    fun uploadTicketImage_rejectsSvg() {
        val ticket = issuedTicket(id = 5L, ownerUserId = "owner-1")
        val file = MockMultipartFile(
            "file",
            "cover.svg",
            "image/svg+xml",
            "<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>".toByteArray(),
        )
        given(issuedTicketRepository.findById(5L)).willReturn(Optional.of(ticket))

        assertThatThrownBy { ticketService.uploadTicketImage(5L, "owner-1", file) }
            .isInstanceOf(IllegalArgumentException::class.java)
            .hasMessage("Unsupported ticket image format")
    }

    @Test
    @DisplayName("티켓 이미지 cleanup - 아직 저장되지 않은 새 key만 삭제한다")
    fun cleanupUploadedTicketImage_deletesOnlyTransientKey() {
        val ticket = issuedTicket(id = 5L, ownerUserId = "owner-1", imageKey = "owner-1/5/current.png")
        given(issuedTicketRepository.findById(5L)).willReturn(Optional.of(ticket))

        ticketService.cleanupUploadedTicketImage(5L, "owner-1", "owner-1/5/transient.png")

        then(ticketImageStorageService).should().deleteTicketImage("owner-1/5/transient.png")
    }

    @Test
    @DisplayName("티켓 이미지 cleanup - 현재 저장된 key는 삭제하지 않는다")
    fun cleanupUploadedTicketImage_keepsCurrentKey() {
        val ticket = issuedTicket(id = 5L, ownerUserId = "owner-1", imageKey = "owner-1/5/current.png")
        given(issuedTicketRepository.findById(5L)).willReturn(Optional.of(ticket))

        ticketService.cleanupUploadedTicketImage(5L, "owner-1", "owner-1/5/current.png")

        then(ticketImageStorageService).should(never()).deleteTicketImage(any())
    }

    @Test
    @DisplayName("발행 티켓 조회/수정은 소유자가 아니면 거부한다")
    fun ownerMismatch_throwsAccessDenied() {
        given(issuedTicketRepository.findById(7L)).willReturn(Optional.of(issuedTicket(id = 7L, ownerUserId = "owner-2")))

        assertThatThrownBy { ticketService.getTicketImage(7L, "owner-1") }
            .isInstanceOf(AccessDeniedException::class.java)
            .hasMessage("Ticket owner mismatch")
    }

    @Test
    @DisplayName("발행 티켓 수정 실패 - 다른 소유자 prefix imageKey는 거부한다")
    fun updateTicket_rejectsForeignImageKey() {
        val ticket = issuedTicket(id = 10L, ownerUserId = "owner-1", status = IssuedTicketStatus.ISSUING)
        given(issuedTicketRepository.findById(10L)).willReturn(Optional.of(ticket))

        assertThatThrownBy {
            ticketService.updateTicket(
                10L,
                "owner-1",
                TicketDto.UpdateTicketRequest(
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
                    imageKey = "owner-2/10/hijack.png",
                ),
            )
        }
            .isInstanceOf(IllegalArgumentException::class.java)
            .hasMessage("Invalid imageKey")
    }

    @Test
    @DisplayName("발행 티켓 수정 실패 - 같은 소유자라도 다른 티켓 경로 imageKey는 거부한다")
    fun updateTicket_rejectsDifferentTicketImageKey() {
        val ticket = issuedTicket(id = 10L, ownerUserId = "owner-1", status = IssuedTicketStatus.ISSUING)
        given(issuedTicketRepository.findById(10L)).willReturn(Optional.of(ticket))

        assertThatThrownBy {
            ticketService.updateTicket(
                10L,
                "owner-1",
                TicketDto.UpdateTicketRequest(
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
                    imageKey = "owner-1/999/hijack.png",
                ),
            )
        }
            .isInstanceOf(IllegalArgumentException::class.java)
            .hasMessage("Invalid imageKey")
    }

    private fun createRequest(
        name: String = "PERFO Test Ticket",
        googlePlaceId: String = "ChIJPLACE",
        ownerUserId: String? = null,
        openAt: String? = null,
        imageKey: String? = null,
    ) = TicketDto.CreateTicketRequest(
        name = name,
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

    private fun issuedTicket(
        id: Long,
        ownerUserId: String,
        name: String = "PERFO Test Ticket",
        status: IssuedTicketStatus = IssuedTicketStatus.INACTIVE,
        imageKey: String? = null,
        eventId: Long? = null,
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
        discoveryMode = TicketDiscoveryMode.LISTED,
        eventId = eventId,
        status = status,
        issuedCount = 0,
    )

    private fun event(
        id: Long,
        totalQuantity: Int,
        remainingQuantity: Int,
    ) = Event(
        id = id,
        name = "PERFO Test Ticket",
        venue = "올림픽공원 체조경기장",
        validFrom = LocalDate.parse("2026-08-15").atStartOfDay(),
        validUntil = LocalDate.parse("2026-08-15").plusDays(1).atStartOfDay().minusSeconds(1),
        totalQuantity = totalQuantity,
        remainingQuantity = remainingQuantity,
        maxPerUser = 1,
        active = true,
    )
}
