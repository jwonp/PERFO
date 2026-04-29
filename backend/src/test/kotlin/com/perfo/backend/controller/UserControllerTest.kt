package com.perfo.backend.controller

import com.fasterxml.jackson.databind.ObjectMapper
import com.perfo.backend.config.HeaderAuthenticationFilter
import com.perfo.backend.dto.UserProfileDto
import com.perfo.backend.service.ProfileImageContent
import com.perfo.backend.service.UserService
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.mockito.BDDMockito.given
import org.mockito.BDDMockito.then
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

@WebMvcTest(UserController::class)
@Import(HeaderAuthenticationFilter::class)
class UserControllerTest {

    @Autowired
    private lateinit var mockMvc: MockMvc

    @Autowired
    private lateinit var objectMapper: ObjectMapper

    @field:MockitoBean
    private lateinit var userService: UserService

    @Test
    @DisplayName("GET /api/users/me - 현재 인증 사용자 프로필을 반환한다")
    @WithMockUser(username = "hong@example.com")
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

        mockMvc.perform(get("/api/users/me"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.email").value("hong@example.com"))
            .andExpect(jsonPath("$.displayName").value("홍길동"))
            .andExpect(jsonPath("$.profileImageType").value("PRESET"))
            .andExpect(jsonPath("$.profileImageValue").value("avatar-blue"))
    }

    @Test
    @DisplayName("PATCH /api/users/me/profile - 현재 인증 사용자 프로필을 수정한다")
    @WithMockUser(username = "hong@example.com")
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
        given(userService.updateMyProfile("hong@example.com", request)).willReturn(response)

        mockMvc.perform(
            patch("/api/users/me/profile")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)),
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.displayName").value("새 닉네임"))
            .andExpect(jsonPath("$.profileImageValue").value("avatar-green"))

        then(userService).should().updateMyProfile("hong@example.com", request)
    }

    @Test
    @DisplayName("PATCH /api/users/me/profile - 인증되지 않으면 401 또는 403을 반환한다")
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
            .andExpect(status().is4xxClientError)
    }

    @Test
    @DisplayName("POST /api/users/me/profile-image - multipart 업로드 성공 시 업데이트된 프로필을 반환한다")
    @WithMockUser(username = "hong@example.com")
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
        given(userService.uploadMyProfileImage(org.mockito.ArgumentMatchers.eq("hong@example.com"), org.mockito.ArgumentMatchers.any()))
            .willReturn(response)

        mockMvc.perform(
            multipart("/api/users/me/profile-image")
                .file(file)
                .with(csrf()),
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.profileImageType").value("UPLOADED"))
            .andExpect(jsonPath("$.profileImageValue").value("1/generated.png"))
            .andExpect(jsonPath("$.profileImageUrl").value("/api/users/me/profile-image?v=2026-04-29T13%3A00%3A00"))
    }

    @Test
    @DisplayName("GET /api/users/me/profile-image - 현재 사용자 프로필 이미지를 반환한다")
    @WithMockUser(username = "hong@example.com")
    fun getMyProfileImage_returns200() {
        given(userService.getMyProfileImage("hong@example.com")).willReturn(
            ProfileImageContent(
                bytes = "png".toByteArray(),
                contentType = "image/png",
            ),
        )

        mockMvc.perform(get("/api/users/me/profile-image"))
            .andExpect(status().isOk)
            .andExpect(content().contentType("image/png"))
            .andExpect(content().bytes("png".toByteArray()))
    }
}
