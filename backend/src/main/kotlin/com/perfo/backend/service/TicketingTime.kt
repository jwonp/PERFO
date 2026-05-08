package com.perfo.backend.service

import java.time.LocalDateTime
import java.time.OffsetDateTime
import java.time.ZoneId
import java.time.ZoneOffset

private val EVENT_TIME_ZONE: ZoneId = ZoneId.of("Asia/Seoul")

object TicketingTime {
    fun utcNow(): OffsetDateTime = OffsetDateTime.now(ZoneOffset.UTC)

    fun eventNow(): LocalDateTime = LocalDateTime.now(EVENT_TIME_ZONE)
}
