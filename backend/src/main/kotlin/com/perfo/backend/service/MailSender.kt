package com.perfo.backend.service

interface MailSender {
    fun sendVerificationCode(
        email: String,
        code: String,
        purpose: String,
    )
}
