package com.perfo.backend.controller

import com.perfo.backend.dto.AuthDto
import com.perfo.backend.service.AuthService
import jakarta.validation.Valid
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

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
        println("/api/auth/oauth")
        return ResponseEntity.ok(authService.oauthLogin(request))
    }

    @GetMapping("/check-email")
    fun checkEmail(@RequestParam email: String): ResponseEntity<AuthDto.CheckEmailResponse> {
        return ResponseEntity.ok(authService.checkEmail(email))
    }

    @GetMapping("/health")
    fun health(): ResponseEntity<Map<String, String>> {
        return ResponseEntity.ok(mapOf("status" to "ok"))
    }
}
