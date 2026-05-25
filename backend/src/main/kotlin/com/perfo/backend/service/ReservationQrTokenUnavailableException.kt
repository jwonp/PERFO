package com.perfo.backend.service

import org.springframework.http.HttpStatus

class ReservationQrTokenUnavailableException(
    val code: String,
    val status: HttpStatus,
    message: String,
) : RuntimeException(message) {
    companion object {
        fun alreadyUsed() = ReservationQrTokenUnavailableException(
            code = "ALREADY_USED",
            status = HttpStatus.CONFLICT,
            message = "이미 사용된 티켓입니다",
        )

        fun notOpen() = ReservationQrTokenUnavailableException(
            code = "NOT_OPEN",
            status = HttpStatus.CONFLICT,
            message = "아직 검표 시간이 아닙니다",
        )

        fun expired() = ReservationQrTokenUnavailableException(
            code = "EXPIRED",
            status = HttpStatus.GONE,
            message = "유효 기간이 지난 티켓입니다",
        )
    }
}
