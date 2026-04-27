package com.perfo.backend.controller

import com.fasterxml.jackson.databind.ObjectMapper
import com.perfo.backend.dto.AuthDto
import com.perfo.backend.service.AuthService
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.mockito.BDDMockito.given
import org.mockito.BDDMockito.then
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest
import org.springframework.test.context.bean.override.mockito.MockitoBean
import org.springframework.http.MediaType
import org.springframework.security.test.context.support.WithMockUser
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf

/**
 * AuthController 슬라이스 테스트 (Web Layer Test)
 *
 * - @WebMvcTest: Controller + MockMvc만 로드 (DB/Service는 mock)
 * - @MockitoBean: Spring 컨텍스트에 mock 빈 등록
 * - @WithMockUser: 인증된 사용자로 요청 시뮬레이션
 */
@WebMvcTest(AuthController::class)
class AuthControllerTest {

    @Autowired
    private lateinit var mockMvc: MockMvc

    @Autowired
    private lateinit var objectMapper: ObjectMapper

    @field:MockitoBean
    private lateinit var authService: AuthService

    @Test
    @DisplayName("POST /api/auth/signup - 회원가입 성공 시 200 응답과 사용자 정보를 반환한다")
    @WithMockUser
    fun signUp_returns200() {
        // given
        val request = AuthDto.SignUpRequest(
            "test@example.com",
            "password123!",
            "테스터"
        )

        val response = AuthDto.AuthResponse(
            1L, "test@example.com", "테스터", "credentials", null
        )

        given(authService.signUp(request)).willReturn(response)

        // when & then
        mockMvc.perform(
            post("/api/auth/signup")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.email").value("test@example.com"))
            .andExpect(jsonPath("$.name").value("테스터"))
            .andExpect(jsonPath("$.provider").value("credentials"))
    }

    @Test
    @DisplayName("POST /api/auth/signup - 이메일 형식이 잘못되면 400을 반환한다")
    @WithMockUser
    fun signUp_invalidEmail_returns400() {
        // given
        val request = AuthDto.SignUpRequest(
            "not-an-email",
            "password123!",
            null
        )

        // when & then
        mockMvc.perform(
            post("/api/auth/signup")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isBadRequest)
    }

    @Test
    @DisplayName("POST /api/auth/login - 로그인 성공 시 200 응답과 사용자 정보를 반환한다")
    @WithMockUser
    fun login_returns200() {
        // given
        val request = AuthDto.LoginRequest(
            "test@example.com",
            "password123!"
        )
        val response = AuthDto.AuthResponse(
            1L, "test@example.com", "테스터", "credentials", null
        )

        given(authService.login(request)).willReturn(response)

        // when & then
        mockMvc.perform(
            post("/api/auth/login")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.email").value("test@example.com"))
            .andExpect(jsonPath("$.name").value("테스터"))
            .andExpect(jsonPath("$.provider").value("credentials"))
    }

    @Test
    @DisplayName("POST /api/auth/login - 이메일 형식이 잘못되면 400을 반환한다")
    @WithMockUser
    fun login_invalidEmail_returns400() {
        // given
        val request = AuthDto.LoginRequest(
            "not-an-email",
            "password123!"
        )

        // when & then
        mockMvc.perform(
            post("/api/auth/login")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isBadRequest)
    }

    @Test
    @DisplayName("POST /api/auth/logout - 로그아웃 성공 시 200 응답을 반환한다")
    @WithMockUser
    fun logout_returns200() {
        // given
        val response = AuthDto.LogoutResponse(true)
        given(authService.logout()).willReturn(response)

        // when & then
        mockMvc.perform(
            post("/api/auth/logout")
                .with(csrf())
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.success").value(true))

        then(authService).should().logout()
    }

    @Test
    @DisplayName("GET /api/auth/check-email - 가입된 이메일 조회 시 exists=true를 반환한다")
    @WithMockUser
    fun checkEmail_existingEmail_returnsTrue() {
        // given
        val response = AuthDto.CheckEmailResponse(true, "credentials")
        given(authService.checkEmail("test@example.com")).willReturn(response)

        // when & then
        mockMvc.perform(
            get("/api/auth/check-email")
                .param("email", "test@example.com")
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.exists").value(true))
            .andExpect(jsonPath("$.provider").value("credentials"))
    }

    @Test
    @DisplayName("GET /api/auth/health - 항상 status=ok를 반환한다")
    @WithMockUser
    fun health_returnsOk() {
        mockMvc.perform(get("/api/auth/health"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.status").value("ok"))
    }
}
