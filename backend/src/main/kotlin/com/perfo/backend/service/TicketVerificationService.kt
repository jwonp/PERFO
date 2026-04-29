package com.perfo.backend.service

import com.perfo.backend.dto.TicketDto
import com.perfo.backend.entity.TicketUsageStatus
import com.perfo.backend.entity.VerificationRecord
import com.perfo.backend.repository.TicketRepository
import com.perfo.backend.repository.VerificationRecordRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.ZoneOffset

@Service
class TicketVerificationService(
    private val ticketRepository: TicketRepository,
    private val verificationRecordRepository: VerificationRecordRepository,
    private val qrSignatureService: QrSignatureService,
    private val notificationBridgeService: NotificationBridgeService,
) {

    @Transactional(readOnly = true)
    fun issueReservationQrToken(reservationId: Long): TicketDto.TicketQrTokenResponse {
        val ticket = ticketRepository.findById(reservationId)
            .orElseThrow { IllegalArgumentException("Reservation not found") }

        val (token, expiresAt) = qrSignatureService.issueToken(
            ticketId = ticket.id ?: throw IllegalArgumentException("Reservation not found"),
            eventId = ticket.eventId,
            userId = ticket.userId,
            ttlSeconds = 60,
        )

        return TicketDto.TicketQrTokenResponse(
            token = token,
            expiresAt = expiresAt.atOffset(ZoneOffset.UTC).toString(),
        )
    }

    @Transactional
    fun validateTicketByQr(ticketId: Long, request: TicketDto.TicketValidationRequest): TicketDto.TicketValidationResponse {
        val payload = qrSignatureService.verifyToken(request.qrToken)
            ?: return TicketDto.TicketValidationResponse(
                result = TicketDto.TicketValidationResult.INVALID,
                message = "Invalid or expired QR token",
            )

        if (payload.eventId != ticketId) {
            return TicketDto.TicketValidationResponse(
                result = TicketDto.TicketValidationResult.WRONG_TICKET,
                message = "QR is for a different ticket",
            )
        }

        val reservation = ticketRepository.findById(payload.ticketId).orElse(null)
            ?: return TicketDto.TicketValidationResponse(
                result = TicketDto.TicketValidationResult.INVALID,
                message = "Reservation ticket not found",
            )

        if (reservation.eventId != payload.eventId || reservation.userId != payload.userId) {
            return TicketDto.TicketValidationResponse(
                result = TicketDto.TicketValidationResult.INVALID,
                message = "QR payload mismatch",
            )
        }

        when (reservation.usageStatus) {
            TicketUsageStatus.USED -> {
                return TicketDto.TicketValidationResponse(
                    result = TicketDto.TicketValidationResult.ALREADY_USED,
                    ticketNumber = reservation.ticketNumber,
                    usageStatus = reservation.usageStatus,
                    message = "Ticket already used",
                )
            }

            TicketUsageStatus.BEFORE_SERVING,
            TicketUsageStatus.WAITING -> {
                return TicketDto.TicketValidationResponse(
                    result = TicketDto.TicketValidationResult.NOT_OPEN,
                    ticketNumber = reservation.ticketNumber,
                    usageStatus = reservation.usageStatus,
                    message = "Ticket is not open for validation",
                )
            }

            TicketUsageStatus.NOW_SERVING,
            TicketUsageStatus.EXPIRED -> {
                // continue
            }
        }

        val updatedCount = ticketRepository.markUsedIfNotUsed(payload.ticketId)
        if (updatedCount == 0) {
            return TicketDto.TicketValidationResponse(
                result = TicketDto.TicketValidationResult.ALREADY_USED,
                ticketNumber = reservation.ticketNumber,
                usageStatus = TicketUsageStatus.USED,
                message = "Ticket already used",
            )
        }

        val record = verificationRecordRepository.save(
            VerificationRecord(
                ticketId = payload.ticketId,
                eventId = payload.eventId,
                userId = payload.userId,
            ),
        )

        notificationBridgeService.notifyTicketTransition(
            TicketTransitionNotificationRequest(
                userId = reservation.userId.toString(),
                scope = "reserved",
                ticketId = payload.ticketId.toString(),
                ticketName = "Ticket #${reservation.ticketNumber}",
                targetUrl = "/reserved/${payload.ticketId}",
                statusKey = "usageStatus",
                previousStatus = reservation.usageStatus.name,
                nextStatus = TicketUsageStatus.USED.name,
            ),
        )

        return TicketDto.TicketValidationResponse(
            result = TicketDto.TicketValidationResult.SUCCESS,
            ticketNumber = reservation.ticketNumber,
            usedAt = record.verifiedAt?.atOffset(ZoneOffset.UTC)?.toString(),
            usageStatus = TicketUsageStatus.USED,
            message = "Ticket verified",
        )
    }
}
