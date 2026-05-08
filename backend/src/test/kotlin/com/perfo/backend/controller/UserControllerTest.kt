package com.perfo.backend.controller

import com.fasterxml.jackson.databind.ObjectMapper
import com.perfo.backend.config.HeaderAuthenticationFilter
import com.perfo.backend.config.InternalApiJwtService
import com.perfo.backend.config.SecurityConfig
import com.perfo.backend.dto.UserProfileDto
import com.perfo.backend.observability.InternalProxyAuthObservability
import com.perfo.backend.service.ProfileImageContent
import com.perfo.backend.service.UserService
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.mockito.BDDMockito.given
import org.mockito.BDDMockito.then
import org.mockito.kotlin.any
import org.mockito.kotlin.eq
import org.mockito.kotlin.whenever
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest
import org.springframework.context.annotation.Import
import org.springframework.http.MediaType
import org.springframework.security.test.context.support.WithMockUser
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf
import org.springframework.test.context.bean.override.mockito.MockitoBean
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.content
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.springframework.mock.web.MockMultipartFile
import io.jsonwebtoken.Jwts
import io.jsonwebtoken.security.Keys
import java.time.Instant
import java.util.Date

@WebMvcTest(
    value = [UserController::class],
    properties = [
        "app.security.internal-jwt.issuer=perfo-frontend",
        "app.security.internal-jwt.audience=perfo-backend-ticketing",
        "app.security.internal-jwt.active-kid=test-v1",
        "app.security.internal-jwt.active-secret=test-internal-jwt-secret-key-should-be-long-enough-123456",
        "app.cors.allowed-origins=http://localhost:14138",
    ],
)
@Import(SecurityConfig::class, HeaderAuthenticationFilter::class, InternalApiJwtService::class)
class UserControllerTest {

    @Autowired
    private lateinit var mockMvc: MockMvc

    @Autowired
    private lateinit var objectMapper: ObjectMapper

    @field:MockitoBean
    private lateinit var userService: UserService

    @field:MockitoBean
    private lateinit var internalProxyAuthObservability: InternalProxyAuthObservability

    @Test
    @DisplayName("GET /api/users/me - 현재 인증 사용자 프로필을 반환한다")
    fun getMyProfile_returns200() {
        val response = UserProfileDto.MyProfileResponse(
            id = 1L,
            email = "hong@example.com",
            displayName = "홍길동",
            profileImageType = "PRESET",
            profileImageValue = "avatar-blue",
            profileImageUrl = null,
            updatedAt = "2026-04-29T12:00:00",
        )
        given(userService.getMyProfile("hong@example.com")).willReturn(response)

        mockMvc.perform(
            get("/api/users/me")
                .header("Authorization", "Bearer ${createInternalToken(1L, "hong@example.com", "users")}"),
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.email").value("hong@example.com"))
            .andExpect(jsonPath("$.displayName").value("홍길동"))
            .andExpect(jsonPath("$.profileImageType").value("PRESET"))
            .andExpect(jsonPath("$.profileImageValue").value("avatar-blue"))
    }

    @Test
    @DisplayName("PATCH /api/users/me/profile - 현재 인증 사용자 프로필을 수정한다")
    fun updateMyProfile_returns200() {
        val request = UserProfileDto.UpdateMyProfileRequest(
            displayName = "새 닉네임",
            profileImageType = "PRESET",
            profileImageValue = "avatar-green",
        )
        val response = UserProfileDto.MyProfileResponse(
            id = 1L,
            email = "hong@example.com",
            displayName = "새 닉네임",
            profileImageType = "PRESET",
            profileImageValue = "avatar-green",
            profileImageUrl = null,
            updatedAt = "2026-04-29T13:00:00",
        )
        whenever(userService.updateMyProfile("hong@example.com", request)).thenReturn(response)

        mockMvc.perform(
            patch("/api/users/me/profile")
                .with(csrf())
                .header("Authorization", "Bearer ${createInternalToken(1L, "hong@example.com", "users")}")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)),
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.displayName").value("새 닉네임"))
            .andExpect(jsonPath("$.profileImageValue").value("avatar-green"))

        then(userService).should().updateMyProfile("hong@example.com", request)
    }

    @Test
    @DisplayName("PATCH /api/users/me/profile - 인증되지 않으면 401을 반환한다")
    fun updateMyProfile_unauthenticated_returnsError() {
        val request = UserProfileDto.UpdateMyProfileRequest(
            displayName = "새 닉네임",
            profileImageType = "PRESET",
            profileImageValue = "avatar-green",
        )

        mockMvc.perform(
            patch("/api/users/me/profile")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)),
        )
            .andExpect(status().isUnauthorized)
    }

    @Test
    @DisplayName("POST /api/users/me/profile-image - multipart 업로드 성공 시 업데이트된 프로필을 반환한다")
    fun uploadMyProfileImage_returns200() {
        val file = MockMultipartFile("file", "avatar.png", "image/png", "png".toByteArray())
        val response = UserProfileDto.MyProfileResponse(
            id = 1L,
            email = "hong@example.com",
            displayName = "홍길동",
            profileImageType = "UPLOADED",
            profileImageValue = "1/generated.png",
            profileImageUrl = "/api/users/me/profile-image?v=2026-04-29T13%3A00%3A00",
            updatedAt = "2026-04-29T13:00:00",
        )
        whenever(userService.uploadMyProfileImage(eq("hong@example.com"), any())).thenReturn(response)

        mockMvc.perform(
            multipart("/api/users/me/profile-image")
                .file(file)
                .with(csrf())
                .header("Authorization", "Bearer ${createInternalToken(1L, "hong@example.com", "users")}"),
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.profileImageType").value("UPLOADED"))
            .andExpect(jsonPath("$.profileImageValue").value("1/generated.png"))
            .andExpect(jsonPath("$.profileImageUrl").value("/api/users/me/profile-image?v=2026-04-29T13%3A00%3A00"))
    }

    @Test
    @DisplayName("GET /api/users/me/profile-image - 현재 사용자 프로필 이미지를 반환한다")
    fun getMyProfileImage_returns200() {
        given(userService.getMyProfileImage("hong@example.com")).willReturn(
            ProfileImageContent(
                bytes = "png".toByteArray(),
                contentType = "image/png",
            ),
        )

        mockMvc.perform(
            get("/api/users/me/profile-image")
                .header("Authorization", "Bearer ${createInternalToken(1L, "hong@example.com", "users")}"),
        )
            .andExpect(status().isOk)
            .andExpect(content().contentType("image/png"))
            .andExpect(content().bytes("png".toByteArray()))
    }

    @Test
    @DisplayName("GET /api/users/me - 만료된 내부 JWT면 401을 반환한다")
    fun getMyProfile_expiredToken_returns401() {
        mockMvc.perform(
            get("/api/users/me")
                .header("Authorization", "Bearer ${createInternalToken(1L, "hong@example.com", "users", Instant.now().minusSeconds(5))}"),
        )
            .andExpect(status().isUnauthorized)
    }

    private fun createInternalToken(
        userId: Long,
        email: String,
        scope: String,
        expiresAt: Instant = Instant.now().plusSeconds(30),
    ): String {
        val signingKey = Keys.hmacShaKeyFor(
            "test-internal-jwt-secret-key-should-be-long-enough-123456".toByteArray(Charsets.UTF_8),
        )
        return Jwts.builder()
            .header()
            .keyId("test-v1")
            .and()
            .issuer("perfo-frontend")
            .subject("internal-proxy")
            .audience()
            .add("perfo-backend-ticketing")
            .and()
            .issuedAt(Date.from(Instant.now()))
            .expiration(Date.from(expiresAt))
            .claim("uid", userId)
            .claim("email", email)
            .claim("scope", listOf(scope))
            .signWith(signingKey)
            .compact()
    }
}
