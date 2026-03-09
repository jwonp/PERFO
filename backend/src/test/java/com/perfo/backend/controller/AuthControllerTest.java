package com.perfo.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.perfo.backend.dto.AuthDto;
import com.perfo.backend.service.AuthService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * AuthController 슬라이스 테스트 (Web Layer Test)
 *
 * - @WebMvcTest: Controller + MockMvc만 로드 (DB/Service는 mock)
 * - @MockBean: Spring 컨텍스트에 mock 빈 등록
 * - @WithMockUser: 인증된 사용자로 요청 시뮬레이션
 */
@WebMvcTest(AuthController.class)
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AuthService authService;

    @Test
    @DisplayName("POST /api/auth/signup - 회원가입 성공 시 200 응답과 사용자 정보를 반환한다")
    @WithMockUser
    void signUp_returns200() throws Exception {
        // given
        AuthDto.SignUpRequest request = new AuthDto.SignUpRequest();
        request.setEmail("test@example.com");
        request.setPassword("password123!");
        request.setName("테스터");

        AuthDto.AuthResponse response = new AuthDto.AuthResponse(
                1L, "test@example.com", "테스터", "credentials", null);

        given(authService.signUp(any())).willReturn(response);

        // when & then
        mockMvc.perform(post("/api/auth/signup")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("test@example.com"))
                .andExpect(jsonPath("$.name").value("테스터"))
                .andExpect(jsonPath("$.provider").value("credentials"));
    }

    @Test
    @DisplayName("POST /api/auth/signup - 이메일 형식이 잘못되면 400을 반환한다")
    @WithMockUser
    void signUp_invalidEmail_returns400() throws Exception {
        // given
        AuthDto.SignUpRequest request = new AuthDto.SignUpRequest();
        request.setEmail("not-an-email");
        request.setPassword("password123!");

        // when & then
        mockMvc.perform(post("/api/auth/signup")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("GET /api/auth/check-email - 가입된 이메일 조회 시 exists=true를 반환한다")
    @WithMockUser
    void checkEmail_existingEmail_returnsTrue() throws Exception {
        // given
        AuthDto.CheckEmailResponse response = new AuthDto.CheckEmailResponse(true, "credentials");
        given(authService.checkEmail("test@example.com")).willReturn(response);

        // when & then
        mockMvc.perform(get("/api/auth/check-email")
                        .param("email", "test@example.com"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.exists").value(true))
                .andExpect(jsonPath("$.provider").value("credentials"));
    }

    @Test
    @DisplayName("GET /api/auth/health - 항상 status=ok를 반환한다")
    @WithMockUser
    void health_returnsOk() throws Exception {
        mockMvc.perform(get("/api/auth/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ok"));
    }
}
