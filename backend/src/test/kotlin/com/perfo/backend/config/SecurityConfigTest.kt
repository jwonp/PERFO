package com.perfo.backend.config

import com.perfo.backend.observability.InternalProxyAuthObservability
import io.jsonwebtoken.Jwts
import io.jsonwebtoken.security.Keys
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest
import org.springframework.context.annotation.Import
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf
import org.springframework.test.context.bean.override.mockito.MockitoBean
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.content
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RestController
import java.time.Instant
import java.util.Date

@WebMvcTest(
    value = [SecurityConfigTest.AdminProbeController::class],
    properties = [
        "app.security.internal-jwt.issuer=perfo-frontend",
        "app.security.internal-jwt.audience=perfo-backend-ticketing",
        "app.security.internal-jwt.active-kid=test-v1",
        "app.security.internal-jwt.active-secret=test-internal-jwt-secret-key-should-be-long-enough-123456",
        "app.cors.allowed-origins=http://localhost:14138",
    ],
)
@Import(SecurityConfig::class, HeaderAuthenticationFilter::class, InternalApiJwtService::class)
class SecurityConfigTest {
    @Autowired
    private lateinit var mockMvc: MockMvc

    @field:MockitoBean
    private lateinit var internalProxyAuthObservability: InternalProxyAuthObservability

    @Test
    @DisplayName("GET /api/admin/** - ADMIN role이면 접근을 허용한다")
    fun adminRoute_withAdminRole_returns200() {
        mockMvc.perform(
            get("/api/admin/probe")
                .with(csrf())
                .header("Authorization", "Bearer ${createInternalToken(role = "ADMIN")}"),
        )
            .andExpect(status().isOk)
            .andExpect(content().string("ok"))
    }

    @Test
    @DisplayName("GET /api/admin - ADMIN role이면 접근을 허용한다")
    fun adminRootRoute_withAdminRole_returns200() {
        mockMvc.perform(
            get("/api/admin")
                .with(csrf())
                .header("Authorization", "Bearer ${createInternalToken(role = "ADMIN")}"),
        )
            .andExpect(status().isOk)
            .andExpect(content().string("root"))
    }

    @Test
    @DisplayName("GET /api/admin/** - ADMIN role이 아니면 403을 반환한다")
    fun adminRoute_withoutAdminRole_returns403() {
        mockMvc.perform(
            get("/api/admin/probe")
                .with(csrf())
                .header("Authorization", "Bearer ${createInternalToken(role = "USER")}"),
        )
            .andExpect(status().isForbidden)
    }

    @Test
    @DisplayName("GET /api/admin - ADMIN role이 아니면 403을 반환한다")
    fun adminRootRoute_withoutAdminRole_returns403() {
        mockMvc.perform(
            get("/api/admin")
                .with(csrf())
                .header("Authorization", "Bearer ${createInternalToken(role = "USER")}"),
        )
            .andExpect(status().isForbidden)
    }

    @Test
    @DisplayName("GET /api/admin/** - 토큰이 없으면 401을 반환한다")
    fun adminRoute_withoutToken_returns401() {
        mockMvc.perform(
            get("/api/admin/probe")
                .with(csrf()),
        )
            .andExpect(status().isUnauthorized)
    }

    private fun createInternalToken(role: String): String {
        val signingKey = Keys.hmacShaKeyFor(
            "test-internal-jwt-secret-key-should-be-long-enough-123456".toByteArray(Charsets.UTF_8),
        )
        return Jwts.builder()
            .header()
            .keyId("test-v1")
            .and()
            .issuer("perfo-frontend")
            .subject("admin-proxy")
            .audience()
            .add("perfo-backend-ticketing")
            .and()
            .issuedAt(Date.from(Instant.now()))
            .expiration(Date.from(Instant.now().plusSeconds(30)))
            .claim("uid", 1L)
            .claim("email", "admin@example.com")
            .claim("role", role)
            .claim("scope", listOf("admin"))
            .signWith(signingKey)
            .compact()
    }

    @RestController
    class AdminProbeController {
        @GetMapping("/api/admin")
        fun root(): String = "root"

        @GetMapping("/api/admin/probe")
        fun probe(): String = "ok"
    }
}
