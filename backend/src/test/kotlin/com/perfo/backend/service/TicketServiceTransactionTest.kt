package com.perfo.backend.service

import com.perfo.backend.dto.TicketDto
import com.perfo.backend.repository.EventRepository
import com.perfo.backend.repository.IssuedTicketRepository
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.mockito.kotlin.any
import org.mockito.kotlin.eq
import org.mockito.kotlin.whenever
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.mock.web.MockMultipartFile
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.context.bean.override.mockito.MockitoBean

@SpringBootTest
@ActiveProfiles("test")
class TicketServiceTransactionTest {

    @Autowired
    private lateinit var ticketService: TicketService

    @Autowired
    private lateinit var issuedTicketRepository: IssuedTicketRepository

    @Autowired
    private lateinit var eventRepository: EventRepository

    @field:MockitoBean
    private lateinit var ticketImageStorageService: TicketImageStorageService

    @BeforeEach
    fun setUp() {
        issuedTicketRepository.deleteAll()
        eventRepository.deleteAll()
    }

    @Test
    @DisplayName("대표 이미지 저장이 실패하면 발행 티켓과 연결 이벤트를 모두 롤백한다")
    fun create_withImageStorageFailure_rollsBackTicketAndEvent() {
        val file = MockMultipartFile(
            "file",
            "cover.png",
            "image/png",
            byteArrayOf(
                0x89.toByte(), 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
                0x00, 0x00, 0x00, 0x0D,
            ),
        )
        whenever(ticketImageStorageService.uploadTicketImage(any(), eq(file.bytes), eq("image/png")))
            .thenThrow(IllegalStateException("Ticket image upload failed"))

        assertThatThrownBy {
            ticketService.create(
                request = TicketDto.CreateTicketRequest(
                    name = "PERFO Rollback Ticket",
                    venue = "올림픽공원 체조경기장",
                    googlePlaceId = "ChIJPLACE",
                    detailAddress = "2층 A게이트 앞",
                    validDate = "2026-08-15",
                    openAt = "2026-08-15T08:00:00Z",
                    totalCount = 100,
                    allowDuplicate = false,
                    maxPerUser = 1,
                ),
                authenticatedOwnerUserId = "owner-1",
                file = file,
            )
        }
            .isInstanceOf(IllegalStateException::class.java)
            .hasMessage("Ticket image upload failed")

        assertThat(issuedTicketRepository.findAll()).isEmpty()
        assertThat(eventRepository.findAll()).isEmpty()
    }
}
