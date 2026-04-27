package com.perfo.backend.service

import com.perfo.backend.dto.TicketDto
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

interface QrSignatureService {
    fun sign(ticketId: Long, eventId: Long, userId: Long): String
    fun isValid(request: TicketDto.VerifyTicketRequest): Boolean
}

@Service
class HmacQrSignatureService(
    @Value("\${app.security.qr-secret:}")
    private val qrSecret: String
) : QrSignatureService {

    override fun sign(ticketId: Long, eventId: Long, userId: Long): String {
        require(qrSecret.isNotBlank()) { "QR secret is not configured" }

        val payload = "$ticketId:$eventId:$userId"
        val mac = Mac.getInstance("HmacSHA256")
        mac.init(SecretKeySpec(qrSecret.toByteArray(), "HmacSHA256"))
        return mac.doFinal(payload.toByteArray()).joinToString("") { "%02x".format(it) }
    }

    override fun isValid(request: TicketDto.VerifyTicketRequest): Boolean {
        return sign(request.ticketId, request.eventId, request.userId) == request.signature
    }
}
