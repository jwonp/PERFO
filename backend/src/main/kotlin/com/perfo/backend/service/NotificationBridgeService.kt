package com.perfo.backend.service

import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.MediaType
import org.springframework.stereotype.Service
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.time.Duration

data class TicketTransitionNotificationRequest(
    val userId: String,
    val scope: String,
    val ticketId: String,
    val ticketName: String,
    val targetUrl: String,
    val statusKey: String,
    val previousStatus: String?,
    val nextStatus: String,
)

@Service
class NotificationBridgeService(
    private val objectMapper: ObjectMapper,
) {

    @Value("\${app.notifications.bridge-url:}")
    private lateinit var bridgeUrl: String

    @Value("\${app.notifications.secret:}")
    private lateinit var notificationSecret: String

    private val httpClient: HttpClient = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(2))
        .build()

    fun notifyTicketTransition(request: TicketTransitionNotificationRequest) {
        if (bridgeUrl.isBlank() || notificationSecret.isBlank()) {
            return
        }

        runCatching {
            val body = objectMapper.writeValueAsString(request)
            val httpRequest = HttpRequest.newBuilder(URI.create(bridgeUrl))
                .timeout(Duration.ofSeconds(3))
                .header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .header("X-Internal-Notification-Secret", notificationSecret)
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build()

            httpClient.send(httpRequest, java.net.http.HttpResponse.BodyHandlers.discarding())
        }.onFailure {
            // Notification delivery must not break the main ticket flow.
            println("Notification bridge failed: ${it.message}")
        }
    }
}
