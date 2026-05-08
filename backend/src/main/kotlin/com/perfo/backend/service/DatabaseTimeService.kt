package com.perfo.backend.service

import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Service
import java.sql.Timestamp
import java.time.Instant

@Service
class DatabaseTimeService(
    private val jdbcTemplate: JdbcTemplate,
) {
    fun currentInstant(): Instant {
        val timestamp = jdbcTemplate.queryForObject("select current_timestamp", Timestamp::class.java)
            ?: throw IllegalStateException("Database current_timestamp did not return a value")
        return timestamp.toInstant()
    }
}
