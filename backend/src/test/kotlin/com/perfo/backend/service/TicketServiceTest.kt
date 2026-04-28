package com.perfo.backend.service

import com.perfo.backend.dto.TicketDto
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test

class TicketServiceTest {

    private val ticketService = TicketService()

    @Test
    @DisplayName("티켓 생성 성공 - 유효한 요청이면 id를 부여해 반환한다")
    fun create_success() {
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

        val created = ticketService.create(request)

        assertThat(created.id).isEqualTo(1L)
        assertThat(created.name).isEqualTo("PERFO Test Ticket")
        assertThat(created.googlePlaceId).isEqualTo("ChIJPLACE")
    }

    @Test
    @DisplayName("티켓 생성 실패 - place id 형식이 잘못되면 예외를 던진다")
    fun create_invalidPlaceId_throwsException() {
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

        assertThatThrownBy { ticketService.create(request) }
            .isInstanceOf(IllegalArgumentException::class.java)
            .hasMessage("Invalid googlePlaceId")
    }
}
