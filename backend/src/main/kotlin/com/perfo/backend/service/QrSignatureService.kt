package com.perfo.backend.service

import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import java.time.Instant
import java.util.Base64
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

data class QrTokenPayload(
    val ticketId: Long,
    val eventId: Long,
    val userId: Long,
    val expiresAtEpochSecond: Long,
)

interface QrSignatureService {
    fun issueToken(ticketId: Long, eventId: Long, userId: Long, ttlSeconds: Long = 60): Pair<String, Instant>
    fun verifyToken(token: String): QrTokenPayload?
}

@Service
class HmacQrSignatureService(
    @Value("\${app.security.qr-secret:}")
    private val qrSecret: String,
) : QrSignatureService {
    private val mapper = jacksonObjectMapper()

    override fun issueToken(ticketId: Long, eventId: Long, userId: Long, ttlSeconds: Long): Pair<String, Instant> {
        require(qrSecret.isNotBlank()) { "QR secret is not configured" }

        val expiresAt = Instant.now().plusSeconds(ttlSeconds)
        val payload = QrTokenPayload(
            ticketId = ticketId,
            eventId = eventId,
            userId = userId,
            expiresAtEpochSecond = expiresAt.epochSecond,
        )

        val payloadJson = mapper.writeValueAsString(payload)
        val payloadBase64 = Base64.getUrlEncoder().withoutPadding().encodeToString(payloadJson.toByteArray())
        val signature = sign(payloadBase64)

        return Pair("$payloadBase64.$signature", expiresAt)
    }

    override fun verifyToken(token: String): QrTokenPayload? {
        if (qrSecret.isBlank()) {
            return null
        }

        val parts = token.split(".", limit = 2)
        if (parts.size != 2) {
            return null
        }

        val payloadBase64 = parts[0]
        val providedSignature = parts[1]
        val expectedSignature = sign(payloadBase64)

        if (providedSignature != expectedSignature) {
            return null
        }

        val payloadJson = runCatching {
            String(Base64.getUrlDecoder().decode(payloadBase64))
        }.getOrNull() ?: return null

        val payload = runCatching {
            mapper.readValue<QrTokenPayload>(payloadJson)
        }.getOrNull() ?: return null

        if (payload.expiresAtEpochSecond <= Instant.now().epochSecond) {
            return null
        }

        return payload
    }

    private fun sign(payload: String): String {
        val mac = Mac.getInstance("HmacSHA256")
        mac.init(SecretKeySpec(qrSecret.toByteArray(), "HmacSHA256"))
        return mac.doFinal(payload.toByteArray()).joinToString("") { "%02x".format(it) }
    }
}
