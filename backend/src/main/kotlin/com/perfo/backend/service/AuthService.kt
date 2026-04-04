package com.perfo.backend.service

import com.perfo.backend.dto.AuthDto
import com.perfo.backend.entity.User
import com.perfo.backend.repository.UserRepository
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class AuthService(
    private val userRepository: UserRepository,
    private val passwordEncoder: PasswordEncoder
) {

    @Transactional
    fun signUp(request: AuthDto.SignUpRequest): AuthDto.AuthResponse {
        if (userRepository.existsByEmail(request.email)) {
            throw RuntimeException("Email already exists")
        }

        val user = User(
            email = request.email,
            password = passwordEncoder.encode(request.password),
            name = request.name,
            provider = "credentials"
        )

        val saved = userRepository.save(user)

        return AuthDto.AuthResponse(
            saved.id!!,
            saved.email,
            saved.name,
            saved.provider,
            saved.profileImage
        )
    }

    fun login(request: AuthDto.LoginRequest): AuthDto.AuthResponse {
        val user = userRepository.findByEmail(request.email)
            ?: throw RuntimeException("User not found")

        if (user.provider != "credentials") {
            throw RuntimeException("This email uses ${user.provider} login")
        }

        if (!passwordEncoder.matches(request.password, user.password)) {
            throw RuntimeException("Invalid password")
        }

        return AuthDto.AuthResponse(
            user.id!!,
            user.email,
            user.name,
            user.provider,
            user.profileImage
        )
    }

    @Transactional
    fun oauthLogin(request: AuthDto.OAuthRequest): AuthDto.AuthResponse {
        val user = userRepository.findByProviderAndProviderId(
            request.provider,
            request.providerId
        ) ?: userRepository.findByEmail(request.email)

        val ensured = user ?: run {
            val created = User(
                email = request.email,
                name = request.name,
                provider = request.provider,
                providerId = request.providerId,
                profileImage = request.profileImage
            )
            userRepository.save(created)
        }

        return AuthDto.AuthResponse(
            ensured.id!!,
            ensured.email,
            ensured.name,
            ensured.provider,
            ensured.profileImage
        )
    }

    fun checkEmail(email: String): AuthDto.CheckEmailResponse {
        val user = userRepository.findByEmail(email)
        return if (user != null) {
            AuthDto.CheckEmailResponse(true, user.provider)
        } else {
            AuthDto.CheckEmailResponse(false, null)
        }
    }
}
