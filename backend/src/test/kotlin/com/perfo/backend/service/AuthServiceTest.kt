package com.perfo.backend.service

import com.perfo.backend.dto.AuthDto
import com.perfo.backend.entity.User
import com.perfo.backend.repository.UserRepository
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.InjectMocks
import org.mockito.Mock
import org.mockito.junit.jupiter.MockitoExtension
import org.springframework.security.crypto.password.PasswordEncoder
import org.mockito.BDDMockito.given
import org.mockito.BDDMockito.then
import org.mockito.Mockito.never
import org.mockito.Mockito.verifyNoInteractions
import org.mockito.ArgumentMatchers.any
import org.mockito.ArgumentMatchers.anyString
import org.mockito.ArgumentCaptor

/**
 * AuthService 단위 테스트 (Unit Test)
 *
 * - @ExtendWith(MockitoExtension.class): Spring 컨텍스트 없이 Mockito만 사용
 * - @Mock: 의존성을 가짜(mock)로 대체
 * - @InjectMocks: mock들을 주입받아 실제 테스트 대상 클래스를 생성
 */
@ExtendWith(MockitoExtension::class)
class AuthServiceTest {

    @Mock
    private lateinit var userRepository: UserRepository

    @Mock
    private lateinit var passwordEncoder: PasswordEncoder

    @InjectMocks
    private lateinit var authService: AuthService

    private lateinit var signUpRequest: AuthDto.SignUpRequest
    private lateinit var savedUser: User

    @BeforeEach
    fun setUp() {
        signUpRequest = AuthDto.SignUpRequest(
            "test@example.com",
            "password123!",
            "테스터"
        )

        savedUser = User(
            1L,
            "test@example.com",
            "encoded_password",
            "테스터",
            "credentials",
            null,
            null,
            null,
            null
        )
    }

    @Test
    @DisplayName("회원가입 성공 - 새 이메일로 가입하면 비밀번호를 암호화해 credentials 사용자로 저장한다")
    fun signUp_success() {
        // given
        given(userRepository.existsByEmail("test@example.com")).willReturn(false)
        given(passwordEncoder.encode("password123!")).willReturn("encoded_password")
        given(userRepository.save(any(User::class.java))).willReturn(savedUser)

        // when
        val response = authService.signUp(signUpRequest)

        // then
        assertThat(response.email).isEqualTo("test@example.com")
        assertThat(response.name).isEqualTo("테스터")
        assertThat(response.provider).isEqualTo("credentials")

        val userCaptor = ArgumentCaptor.forClass(User::class.java)
        then(userRepository).should().save(userCaptor.capture())
        assertThat(userCaptor.value.email).isEqualTo("test@example.com")
        assertThat(userCaptor.value.password).isEqualTo("encoded_password")
        assertThat(userCaptor.value.password).isNotEqualTo("password123!")
        assertThat(userCaptor.value.name).isEqualTo("테스터")
        assertThat(userCaptor.value.provider).isEqualTo("credentials")
    }

    @Test
    @DisplayName("회원가입 실패 - 이미 존재하는 이메일은 예외를 던진다")
    fun signUp_duplicateEmail_throwsException() {
        // given
        given(userRepository.existsByEmail("test@example.com")).willReturn(true)

        // when & then
        assertThatThrownBy { authService.signUp(signUpRequest) }
            .isInstanceOf(RuntimeException::class.java)
            .hasMessage("Email already exists")

        then(userRepository).should(never()).save(any(User::class.java))
    }

    @Test
    @DisplayName("회원가입 - 이메일 앞뒤 공백과 대소문자를 정규화해 중복 확인과 저장에 사용한다")
    fun signUp_normalizesEmail() {
        // given
        val request = AuthDto.SignUpRequest(
            " Test@Example.COM ",
            "password123!",
            "테스터"
        )

        given(userRepository.existsByEmail("test@example.com")).willReturn(false)
        given(passwordEncoder.encode("password123!")).willReturn("encoded_password")
        given(userRepository.save(any(User::class.java))).willReturn(savedUser)

        // when
        val response = authService.signUp(request)

        // then
        assertThat(response.email).isEqualTo("test@example.com")
        then(userRepository).should().existsByEmail("test@example.com")

        val userCaptor = ArgumentCaptor.forClass(User::class.java)
        then(userRepository).should().save(userCaptor.capture())
        assertThat(userCaptor.value.email).isEqualTo("test@example.com")
    }

    @Test
    @DisplayName("로그인 성공 - 올바른 이메일/비밀번호면 사용자 정보를 반환한다")
    fun login_success() {
        // given
        val loginRequest = AuthDto.LoginRequest(
            "test@example.com",
            "password123!"
        )

        given(userRepository.findByEmail("test@example.com")).willReturn(savedUser)
        given(passwordEncoder.matches("password123!", "encoded_password")).willReturn(true)

        // when
        val response = authService.login(loginRequest)

        // then
        assertThat(response.email).isEqualTo("test@example.com")
        assertThat(response.name).isEqualTo("테스터")
        assertThat(response.provider).isEqualTo("credentials")
    }

    @Test
    @DisplayName("로그인 - 이메일 앞뒤 공백과 대소문자를 정규화해 사용자를 찾는다")
    fun login_normalizesEmail() {
        // given
        val loginRequest = AuthDto.LoginRequest(
            " Test@Example.COM ",
            "password123!"
        )

        given(userRepository.findByEmail("test@example.com")).willReturn(savedUser)
        given(passwordEncoder.matches("password123!", "encoded_password")).willReturn(true)

        // when
        val response = authService.login(loginRequest)

        // then
        assertThat(response.email).isEqualTo("test@example.com")
        then(userRepository).should().findByEmail("test@example.com")
    }

    @Test
    @DisplayName("로그인 실패 - 존재하지 않는 이메일은 예외를 던진다")
    fun login_userNotFound_throwsException() {
        // given
        val loginRequest = AuthDto.LoginRequest(
            "notexist@example.com",
            "password123!"
        )

        given(userRepository.findByEmail("notexist@example.com")).willReturn(null)

        // when & then
        assertThatThrownBy { authService.login(loginRequest) }
            .isInstanceOf(RuntimeException::class.java)
            .hasMessage("User not found")
    }

    @Test
    @DisplayName("로그인 실패 - 비밀번호가 일치하지 않으면 예외를 던진다")
    fun login_invalidPassword_throwsException() {
        // given
        val loginRequest = AuthDto.LoginRequest(
            "test@example.com",
            "wrong-password"
        )

        given(userRepository.findByEmail("test@example.com")).willReturn(savedUser)
        given(passwordEncoder.matches("wrong-password", "encoded_password")).willReturn(false)

        // when & then
        assertThatThrownBy { authService.login(loginRequest) }
            .isInstanceOf(RuntimeException::class.java)
            .hasMessage("Invalid password")
    }

    @Test
    @DisplayName("로그인 실패 - 소셜 로그인 계정이면 credentials 로그인을 차단한다")
    fun login_socialAccount_throwsException() {
        // given
        val loginRequest = AuthDto.LoginRequest(
            "test@example.com",
            "password123!"
        )
        val socialUser = User(
            2L,
            "test@example.com",
            null,
            "테스터",
            "google",
            "google-id",
            null,
            null,
            null
        )

        given(userRepository.findByEmail("test@example.com")).willReturn(socialUser)

        // when & then
        assertThatThrownBy { authService.login(loginRequest) }
            .isInstanceOf(RuntimeException::class.java)
            .hasMessage("This email uses google login")

        then(passwordEncoder).should(never()).matches(anyString(), anyString())
    }

    @Test
    @DisplayName("로그아웃 - stateless 인증에서는 서버 저장소 변경 없이 성공 응답을 반환한다")
    fun logout_returnsSuccessWithoutStateMutation() {
        // when
        val response = authService.logout()

        // then
        assertThat(response.success).isTrue()
        verifyNoInteractions(userRepository, passwordEncoder)
    }

    @Test
    @DisplayName("이메일 확인 - 가입된 이메일이면 exists=true와 provider를 반환한다")
    fun checkEmail_existingEmail_returnsExistsTrue() {
        // given
        given(userRepository.findByEmail("test@example.com")).willReturn(savedUser)

        // when
        val response = authService.checkEmail("test@example.com")

        // then
        assertThat(response.exists).isTrue()
        assertThat(response.provider).isEqualTo("credentials")
    }

    @Test
    @DisplayName("이메일 확인 - 미가입 이메일이면 exists=false를 반환한다")
    fun checkEmail_newEmail_returnsExistsFalse() {
        // given
        given(userRepository.findByEmail("new@example.com")).willReturn(null)

        // when
        val response = authService.checkEmail("new@example.com")

        // then
        assertThat(response.exists).isFalse()
        assertThat(response.provider).isNull()
    }
}
