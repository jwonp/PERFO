package com.perfo.backend.service

import org.springframework.beans.factory.annotation.Value
import org.springframework.http.MediaType
import org.springframework.stereotype.Component
import org.springframework.web.client.RestClient

@Component
class ResendMailSender(
    restClientBuilder: RestClient.Builder,
    @Value("\${app.mail.provider:resend}")
    private val mailProvider: String,
    @Value("\${app.mail.resend.api-url:https://api.resend.com}")
    private val resendApiUrl: String,
    @Value("\${app.mail.resend.api-key:}")
    private val resendApiKey: String,
    @Value("\${app.mail.from:}")
    private val fromAddress: String,
    @Value("\${app.mail.reply-to:}")
    private val replyToAddress: String,
) : MailSender {
    private val restClient = restClientBuilder
        .baseUrl(resendApiUrl)
        .build()

    override fun sendVerificationCode(
        email: String,
        code: String,
        purpose: String,
    ) {
        require(mailProvider == "resend") { "Unsupported mail provider" }
        require(resendApiKey.isNotBlank()) { "RESEND_API_KEY is not configured" }
        require(fromAddress.isNotBlank()) { "MAIL_FROM is not configured" }

        val payload = mapOf(
            "from" to fromAddress,
            "to" to listOf(email),
            "subject" to subjectFor(purpose),
            "html" to htmlBodyFor(code, purpose),
            "text" to textBodyFor(code, purpose),
            "replyTo" to replyToAddress.takeIf { it.isNotBlank() },
        ).filterValues { it != null }

        restClient.post()
            .uri("/emails")
            .contentType(MediaType.APPLICATION_JSON)
            .header("Authorization", "Bearer $resendApiKey")
            .body(payload)
            .retrieve()
            .toBodilessEntity()
    }

    private fun subjectFor(purpose: String): String {
        return when (purpose) {
            "SIGN_UP" -> "[PERFO] 회원가입 인증 코드"
            "PASSWORD_RESET" -> "[PERFO] 비밀번호 재설정 인증 코드"
            else -> "[PERFO] 인증 코드"
        }
    }

    private fun htmlBodyFor(code: String, purpose: String): String {
        val title = when (purpose) {
            "SIGN_UP" -> "회원가입을 계속하려면 아래 인증 코드를 입력해 주세요."
            "PASSWORD_RESET" -> "비밀번호를 재설정하려면 아래 인증 코드를 입력해 주세요."
            else -> "아래 인증 코드를 입력해 주세요."
        }

        return """
            <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
              <h2 style="margin:0 0 16px">PERFO 인증 코드</h2>
              <p style="margin:0 0 16px">$title</p>
              <div style="display:inline-block;padding:12px 20px;border-radius:12px;background:#f3f4f6;font-size:28px;font-weight:700;letter-spacing:6px">
                $code
              </div>
              <p style="margin:16px 0 0;color:#6b7280">인증 코드는 10분 뒤 만료됩니다.</p>
            </div>
        """.trimIndent()
    }

    private fun textBodyFor(code: String, purpose: String): String {
        val title = when (purpose) {
            "SIGN_UP" -> "회원가입 인증 코드입니다."
            "PASSWORD_RESET" -> "비밀번호 재설정 인증 코드입니다."
            else -> "인증 코드입니다."
        }

        return "$title\n코드: $code\n10분 내에 입력해 주세요."
    }
}
