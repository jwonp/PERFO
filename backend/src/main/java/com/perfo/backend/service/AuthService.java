package com.perfo.backend.service;

import com.perfo.backend.dto.AuthDto;
import com.perfo.backend.entity.User;
import com.perfo.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public AuthDto.AuthResponse signUp(AuthDto.SignUpRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already exists");
        }

        User user = User.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .name(request.getName())
                .provider("credentials")
                .build();

        user = userRepository.save(user);

        return new AuthDto.AuthResponse(
                user.getId(), user.getEmail(), user.getName(),
                user.getProvider(), user.getProfileImage());
    }

    public AuthDto.AuthResponse login(AuthDto.LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!"credentials".equals(user.getProvider())) {
            throw new RuntimeException("This email uses " + user.getProvider() + " login");
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("Invalid password");
        }

        return new AuthDto.AuthResponse(
                user.getId(), user.getEmail(), user.getName(),
                user.getProvider(), user.getProfileImage());
    }

    @Transactional
    public AuthDto.AuthResponse oauthLogin(AuthDto.OAuthRequest request) {
        User user = userRepository.findByProviderAndProviderId(
                request.getProvider(), request.getProviderId()).orElseGet(() -> {
                    // Check if email already exists with different provider
                    return userRepository.findByEmail(request.getEmail())
                            .orElse(null);
                });

        if (user == null) {
            // Create new user
            user = User.builder()
                    .email(request.getEmail())
                    .name(request.getName())
                    .provider(request.getProvider())
                    .providerId(request.getProviderId())
                    .profileImage(request.getProfileImage())
                    .build();
            user = userRepository.save(user);
        }

        return new AuthDto.AuthResponse(
                user.getId(), user.getEmail(), user.getName(),
                user.getProvider(), user.getProfileImage());
    }

    public AuthDto.CheckEmailResponse checkEmail(String email) {
        return userRepository.findByEmail(email)
                .map(user -> new AuthDto.CheckEmailResponse(true, user.getProvider()))
                .orElse(new AuthDto.CheckEmailResponse(false, null));
    }
}
