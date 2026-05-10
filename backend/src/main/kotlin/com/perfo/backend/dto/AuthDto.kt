package com.perfo.backend.dto

import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

class AuthDto {
    data class SignUpRequest(
        @field:NotBlank
        @field:Email
        val email: String,
        @field:NotBlank
        @field:Size(min = 8)
        val password: String,
        val name: String? = null
    )

    data class LoginRequest(
        @field:NotBlank
        @field:Email
        val email: String,
        @field:NotBlank
        val password: String
    )

    data class OAuthRequest(
        @field:NotBlank
        val provider: String,
        @field:NotBlank
        val providerId: String,
        @field:NotBlank
        @field:Email
        val email: String,
        val name: String? = null,
        val profileImage: String? = null
    )

    data class VerificationCodeRequest(
        @field:NotBlank
        @field:Email
        val email: String,
        @field:NotBlank
        val purpose: String,
    )

    data class VerificationCodeVerifyRequest(
        @field:NotBlank
        @field:Email
        val email: String,
        @field:NotBlank
        val purpose: String,
        @field:NotBlank
        @field:Size(min = 6, max = 6)
        val code: String,
    )

    data class VerifiedSignUpRequest(
        @field:NotBlank
        @field:Email
        val email: String,
        @field:NotBlank
        @field:Size(min = 8)
        val password: String,
        val name: String? = null,
        @field:NotBlank
        val verificationToken: String,
    )

    data class PasswordResetRequest(
        @field:NotBlank
        @field:Email
        val email: String,
        @field:NotBlank
        @field:Size(min = 8)
        val password: String,
        @field:NotBlank
        val verificationToken: String,
    )

    data class AuthResponse(
        val id: Long,
        val email: String,
        val name: String?,
        val provider: String,
        val role: String,
        val profileImage: String?,
        val profileImageType: String?,
        val profileImageValue: String?,
        val profileImageUrl: String?
    )

    data class VerificationCodeResponse(
        val email: String,
        val purpose: String,
        val expiresAt: String,
        val previewCode: String? = null,
    )

    data class VerificationCodeVerifyResponse(
        val email: String,
        val purpose: String,
        val verificationToken: String,
    )

    data class CheckEmailResponse(
        val exists: Boolean,
        val provider: String?
    )

    data class LogoutResponse(
        val success: Boolean
    )

    data class PasswordResetResponse(
        val success: Boolean,
    )
}
