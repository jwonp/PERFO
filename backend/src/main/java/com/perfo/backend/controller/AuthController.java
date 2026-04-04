package com.perfo.backend.controller;

import com.perfo.backend.dto.AuthDto;
import com.perfo.backend.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/signup")
    public ResponseEntity<AuthDto.AuthResponse> signUp(
            @Valid @RequestBody AuthDto.SignUpRequest request) {
        return ResponseEntity.ok(authService.signUp(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthDto.AuthResponse> login(
            @Valid @RequestBody AuthDto.LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/oauth")
    public ResponseEntity<AuthDto.AuthResponse> oauthLogin(
            @Valid @RequestBody AuthDto.OAuthRequest request) {
        System.out.println("/api/auth/oauth");
        return ResponseEntity.ok(authService.oauthLogin(request));
    }

    @GetMapping("/check-email")
    public ResponseEntity<AuthDto.CheckEmailResponse> checkEmail(
            @RequestParam String email) {
        return ResponseEntity.ok(authService.checkEmail(email));
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of("status", "ok"));
    }
}
