package com.perfo.backend.service

import com.perfo.backend.dto.TicketDto
import com.perfo.backend.entity.TicketUsageStatus
import com.perfo.backend.entity.VerificationRecord
import com.perfo.backend.repository.TicketRepository
import com.perfo.backend.repository.VerificationRecordRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class TicketVerificationService(
    private val ticketRepository: TicketRepository,
    private val verificationRecordRepository: VerificationRecordRepository,
    private val qrSignatureService: QrSignatureService
) {

    @Transactional
    fun verify(request: TicketDto.VerifyTicketRequest): TicketDto.VerifyTicketResponse {
        if (!qrSignatureService.isValid(request)) {
            throw IllegalArgumentException("Invalid QR signature")
        }

        val ticket = ticketRepository.findById(request.ticketId)
            .orElseThrow { IllegalArgumentException("Ticket not found") }

        if (ticket.eventId != request.eventId || ticket.userId != request.userId) {
            throw IllegalArgumentException("QR payload does not match ticket")
        }

        if (ticket.usageStatus == TicketUsageStatus.USED) {
            throw IllegalStateException("Ticket already used")
        }

        val usedTicket = ticket.copyWithUsageStatus(TicketUsageStatus.USED)
        ticketRepository.save(usedTicket)
        verificationRecordRepository.save(
            VerificationRecord(
                ticketId = request.ticketId,
                eventId = request.eventId,
                userId = request.userId
            )
        )

        return TicketDto.VerifyTicketResponse(
            verified = true,
            ticketId = request.ticketId,
            usageStatus = TicketUsageStatus.USED
        )
    }
}
