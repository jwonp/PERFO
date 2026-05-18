package com.perfo.backend.controller

import com.perfo.backend.dto.AuthDto
import com.perfo.backend.service.AuthService
import jakarta.validation.Valid
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.bind.annotation.GetMapping

@RestController
@RequestMapping("/api/auth")
class AuthController(
    private val authService: AuthService
) {

    @PostMapping("/signup")
    fun signUp(@Valid @RequestBody request: AuthDto.SignUpRequest): ResponseEntity<AuthDto.AuthResponse> {
        return ResponseEntity.ok(authService.signUp(request))
    }

    @PostMapping("/login")
    fun login(@Valid @RequestBody request: AuthDto.LoginRequest): ResponseEntity<AuthDto.AuthResponse> {
        return ResponseEntity.ok(authService.login(request))
    }

    @PostMapping("/logout")
    fun logout(): ResponseEntity<AuthDto.LogoutResponse> {
        return ResponseEntity.ok(authService.logout())
    }

    @PostMapping("/oauth")
    fun oauthLogin(@Valid @RequestBody request: AuthDto.OAuthRequest): ResponseEntity<AuthDto.AuthResponse> {
        return ResponseEntity.ok(authService.oauthLogin(request))
    }

    @PostMapping("/verification-codes/request")
    fun requestVerificationCode(
        @Valid @RequestBody request: AuthDto.VerificationCodeRequest,
    ): ResponseEntity<AuthDto.VerificationCodeResponse> {
        return ResponseEntity.ok(authService.requestVerificationCode(request))
    }

    @PostMapping("/verification-codes/verify")
    fun verifyVerificationCode(
        @Valid @RequestBody request: AuthDto.VerificationCodeVerifyRequest,
    ): ResponseEntity<AuthDto.VerificationCodeVerifyResponse> {
        return ResponseEntity.ok(authService.verifyVerificationCode(request))
    }

    @PostMapping("/signup/verified")
    fun completeVerifiedSignUp(
        @Valid @RequestBody request: AuthDto.VerifiedSignUpRequest,
    ): ResponseEntity<AuthDto.AuthResponse> {
        return ResponseEntity.ok(authService.completeVerifiedSignUp(request))
    }

    @PostMapping("/password-reset")
    fun resetPassword(
        @Valid @RequestBody request: AuthDto.PasswordResetRequest,
    ): ResponseEntity<AuthDto.PasswordResetResponse> {
        return ResponseEntity.ok(authService.resetPassword(request))
    }

    @GetMapping("/check-email")
    fun checkEmail(@RequestParam email: String): ResponseEntity<AuthDto.CheckEmailResponse> {
        return ResponseEntity.ok(authService.checkEmail(email))
    }

    @org.springframework.web.bind.annotation.ExceptionHandler(IllegalArgumentException::class)
    fun handleIllegalArgument(exception: IllegalArgumentException): ResponseEntity<Map<String, String>> {
        return ResponseEntity.badRequest().body(mapOf("message" to (exception.message ?: "Invalid request")))
    }
}
