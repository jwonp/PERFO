package com.perfo.backend.service;

import com.perfo.backend.dto.AuthDto;
import com.perfo.backend.entity.User;
import com.perfo.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.*;

/**
 * AuthService 단위 테스트 (Unit Test)
 *
 * - @ExtendWith(MockitoExtension.class): Spring 컨텍스트 없이 Mockito만 사용
 * - @Mock: 의존성을 가짜(mock)로 대체
 * - @InjectMocks: mock들을 주입받아 실제 테스트 대상 클래스를 생성
 */
@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private AuthService authService;

    private AuthDto.SignUpRequest signUpRequest;
    private User savedUser;

    @BeforeEach
    void setUp() {
        signUpRequest = new AuthDto.SignUpRequest();
        signUpRequest.setEmail("test@example.com");
        signUpRequest.setPassword("password123!");
        signUpRequest.setName("테스터");

        savedUser = User.builder()
                .id(1L)
                .email("test@example.com")
                .password("encoded_password")
                .name("테스터")
                .provider("credentials")
                .build();
    }

    @Test
    @DisplayName("회원가입 성공 - 새 이메일로 가입하면 사용자가 생성된다")
    void signUp_success() {
        // given
        given(userRepository.existsByEmail("test@example.com")).willReturn(false);
        given(passwordEncoder.encode("password123!")).willReturn("encoded_password");
        given(userRepository.save(any(User.class))).willReturn(savedUser);

        // when
        AuthDto.AuthResponse response = authService.signUp(signUpRequest);

        // then
        assertThat(response.getEmail()).isEqualTo("test@example.com");
        assertThat(response.getName()).isEqualTo("테스터");
        assertThat(response.getProvider()).isEqualTo("credentials");
        then(userRepository).should().save(any(User.class));
    }

    @Test
    @DisplayName("회원가입 실패 - 이미 존재하는 이메일은 예외를 던진다")
    void signUp_duplicateEmail_throwsException() {
        // given
        given(userRepository.existsByEmail("test@example.com")).willReturn(true);

        // when & then
        assertThatThrownBy(() -> authService.signUp(signUpRequest))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Email already exists");

        then(userRepository).should(never()).save(any(User.class));
    }

    @Test
    @DisplayName("로그인 성공 - 올바른 이메일/비밀번호면 사용자 정보를 반환한다")
    void login_success() {
        // given
        AuthDto.LoginRequest loginRequest = new AuthDto.LoginRequest();
        loginRequest.setEmail("test@example.com");
        loginRequest.setPassword("password123!");

        given(userRepository.findByEmail("test@example.com")).willReturn(Optional.of(savedUser));
        given(passwordEncoder.matches("password123!", "encoded_password")).willReturn(true);

        // when
        AuthDto.AuthResponse response = authService.login(loginRequest);

        // then
        assertThat(response.getEmail()).isEqualTo("test@example.com");
    }

    @Test
    @DisplayName("로그인 실패 - 존재하지 않는 이메일은 예외를 던진다")
    void login_userNotFound_throwsException() {
        // given
        AuthDto.LoginRequest loginRequest = new AuthDto.LoginRequest();
        loginRequest.setEmail("notexist@example.com");
        loginRequest.setPassword("password123!");

        given(userRepository.findByEmail("notexist@example.com")).willReturn(Optional.empty());

        // when & then
        assertThatThrownBy(() -> authService.login(loginRequest))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("User not found");
    }

    @Test
    @DisplayName("이메일 확인 - 가입된 이메일이면 exists=true와 provider를 반환한다")
    void checkEmail_existingEmail_returnsExistsTrue() {
        // given
        given(userRepository.findByEmail("test@example.com")).willReturn(Optional.of(savedUser));

        // when
        AuthDto.CheckEmailResponse response = authService.checkEmail("test@example.com");

        // then
        assertThat(response.isExists()).isTrue();
        assertThat(response.getProvider()).isEqualTo("credentials");
    }

    @Test
    @DisplayName("이메일 확인 - 미가입 이메일이면 exists=false를 반환한다")
    void checkEmail_newEmail_returnsExistsFalse() {
        // given
        given(userRepository.findByEmail("new@example.com")).willReturn(Optional.empty());

        // when
        AuthDto.CheckEmailResponse response = authService.checkEmail("new@example.com");

        // then
        assertThat(response.isExists()).isFalse();
        assertThat(response.getProvider()).isNull();
    }
}
