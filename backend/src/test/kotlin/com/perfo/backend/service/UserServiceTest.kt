package com.perfo.backend.service

import com.perfo.backend.dto.UserProfileDto
import com.perfo.backend.entity.User
import com.perfo.backend.repository.UserRepository
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.ArgumentCaptor
import org.mockito.BDDMockito.given
import org.mockito.BDDMockito.then
import org.mockito.InjectMocks
import org.mockito.Mock
import org.mockito.Mockito.never
import org.mockito.junit.jupiter.MockitoExtension
import org.mockito.kotlin.any
import org.mockito.kotlin.eq
import org.mockito.kotlin.whenever
import org.springframework.mock.web.MockMultipartFile
import java.time.LocalDateTime

@ExtendWith(MockitoExtension::class)
class UserServiceTest {

    @Mock
    private lateinit var userRepository: UserRepository

    @Mock
    private lateinit var profileImageStorageService: ProfileImageStorageService

    @InjectMocks
    private lateinit var userService: UserService

    @Test
    @DisplayName("내 프로필 조회 - preset 프로필 정보를 반환한다")
    fun getMyProfile_returnsProfile() {
        val user = user(
            name = "홍길동",
            profileImageType = "PRESET",
            profileImageValue = "avatar-blue",
        )
        given(userRepository.findByEmail("hong@example.com")).willReturn(user)

        val response = userService.getMyProfile("hong@example.com")

        assertThat(response.displayName).isEqualTo("홍길동")
        assertThat(response.profileImageType).isEqualTo("PRESET")
        assertThat(response.profileImageValue).isEqualTo("avatar-blue")
        assertThat(response.profileImageUrl).isNull()
    }

    @Test
    @DisplayName("내 프로필 수정 - 닉네임 trim, preset 저장, 레거시 profileImage 동기화를 수행한다")
    fun updateMyProfile_updatesProfile() {
        val user = user(
            name = "기존 이름",
            profileImageType = "PROVIDER",
            profileImageValue = "https://example.com/original.png",
            profileImage = "https://example.com/original.png",
        )
        given(userRepository.findByEmail("hong@example.com")).willReturn(user)
        given(userRepository.save(org.mockito.Mockito.any(User::class.java))).willAnswer { it.arguments[0] as User }

        val response = userService.updateMyProfile(
            "hong@example.com",
            UserProfileDto.UpdateMyProfileRequest(
                displayName = "  새 닉네임  ",
                profileImageType = "PRESET",
                profileImageValue = "avatar-green",
            ),
        )

        val savedUser = ArgumentCaptor.forClass(User::class.java)
        then(userRepository).should().save(savedUser.capture())

        assertThat(savedUser.value.name).isEqualTo("새 닉네임")
        assertThat(savedUser.value.profileImageType).isEqualTo("PRESET")
        assertThat(savedUser.value.profileImageValue).isEqualTo("avatar-green")
        assertThat(savedUser.value.profileImage).isEqualTo("avatar-green")
        assertThat(response.displayName).isEqualTo("새 닉네임")
        assertThat(response.profileImageValue).isEqualTo("avatar-green")
    }

    @Test
    @DisplayName("내 프로필 이미지 업로드 - 허용 이미지면 MinIO 업로드 후 object key를 저장한다")
    fun uploadMyProfileImage_uploadsAndUpdatesUser() {
        val user = user(
            profileImageType = "PRESET",
            profileImageValue = "avatar-blue",
        )
        val file = MockMultipartFile(
            "file",
            "avatar.png",
            "image/png",
            byteArrayOf(
                0x89.toByte(), 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
                0x00, 0x00, 0x00, 0x0D
            ),
        )
        given(userRepository.findByEmail("hong@example.com")).willReturn(user)
        whenever(profileImageStorageService.uploadProfileImage(any(), eq(file.bytes), any()))
            .thenReturn("1/generated.png")
        given(userRepository.save(org.mockito.Mockito.any(User::class.java))).willAnswer { it.arguments[0] as User }
        given(profileImageStorageService.buildMyProfileImageUrl("1/generated.png"))
            .willReturn("/api/users/me/profile-image?v=2026-04-29T12:00:00")

        val response = userService.uploadMyProfileImage("hong@example.com", file)

        assertThat(response.profileImageType).isEqualTo("UPLOADED")
        assertThat(response.profileImageValue).isEqualTo("1/generated.png")
        assertThat(response.profileImageUrl).isEqualTo("/api/users/me/profile-image?v=2026-04-29T12:00:00")
    }

    @Test
    @DisplayName("내 프로필 이미지 업로드 - SVG는 서버에서 거부한다")
    fun uploadMyProfileImage_rejectsSvg() {
        val file = MockMultipartFile(
            "file",
            "avatar.svg",
            "image/svg+xml",
            "<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>".toByteArray(),
        )

        assertThatThrownBy { userService.uploadMyProfileImage("hong@example.com", file) }
            .isInstanceOf(IllegalArgumentException::class.java)
            .hasMessage("Unsupported profile image format")
    }

    @Test
    @DisplayName("내 프로필 이미지 업로드 - 저장소 업로드 실패 시 DB를 갱신하지 않는다")
    fun uploadMyProfileImage_storageFailure_keepsDatabaseClean() {
        val user = user(
            profileImageType = "PRESET",
            profileImageValue = "avatar-blue",
        )
        val file = MockMultipartFile(
            "file",
            "avatar.webp",
            "image/webp",
            byteArrayOf(
                0x52, 0x49, 0x46, 0x46,
                0x10, 0x00, 0x00, 0x00,
                0x57, 0x45, 0x42, 0x50,
                0x56, 0x50, 0x38, 0x20
            ),
        )
        given(userRepository.findByEmail("hong@example.com")).willReturn(user)
        whenever(profileImageStorageService.uploadProfileImage(any(), eq(file.bytes), any()))
            .thenThrow(IllegalStateException("Profile image upload failed"))

        assertThatThrownBy { userService.uploadMyProfileImage("hong@example.com", file) }
            .isInstanceOf(IllegalStateException::class.java)
            .hasMessage("Profile image upload failed")

        then(userRepository).should(never()).save(org.mockito.Mockito.any(User::class.java))
    }

    @Test
    @DisplayName("내 프로필 수정 - 공백 닉네임은 저장하지 않는다")
    fun updateMyProfile_rejectsBlankDisplayName() {
        assertThatThrownBy {
            userService.updateMyProfile(
                "hong@example.com",
                UserProfileDto.UpdateMyProfileRequest(
                    displayName = "   ",
                    profileImageType = "PRESET",
                    profileImageValue = "avatar-blue",
                ),
            )
        }
            .isInstanceOf(IllegalArgumentException::class.java)
            .hasMessage("Display name must be at least 2 characters")
    }

    @Test
    @DisplayName("내 프로필 수정 - 허용되지 않은 preset key는 저장하지 않는다")
    fun updateMyProfile_rejectsInvalidPreset() {
        assertThatThrownBy {
            userService.updateMyProfile(
                "hong@example.com",
                UserProfileDto.UpdateMyProfileRequest(
                    displayName = "홍길동",
                    profileImageType = "PRESET",
                    profileImageValue = "avatar-hacker",
                ),
            )
        }
            .isInstanceOf(IllegalArgumentException::class.java)
            .hasMessage("Unsupported profile image preset")
    }

    private fun user(
        name: String? = "홍길동",
        profileImageType: String? = null,
        profileImageValue: String? = null,
        profileImage: String? = null,
    ) = User(
        id = 1L,
        email = "hong@example.com",
        password = null,
        name = name,
        provider = "google",
        providerId = "google-1",
        profileImage = profileImage,
        profileImageType = profileImageType,
        profileImageValue = profileImageValue,
        createdAt = LocalDateTime.now(),
        updatedAt = LocalDateTime.now(),
    )
}
