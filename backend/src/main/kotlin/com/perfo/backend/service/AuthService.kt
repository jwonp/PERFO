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
    private val passwordEncoder: PasswordEncoder,
    private val profileImageStorageService: ProfileImageStorageService,
) {

    @Transactional
    fun signUp(request: AuthDto.SignUpRequest): AuthDto.AuthResponse {
        val email = normalizeEmail(request.email)

        if (userRepository.existsByEmail(email)) {
            throw RuntimeException("Email already exists")
        }

        val user = User(
            email = email,
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
            saved.profileImage,
            saved.profileImageType,
            saved.profileImageValue,
            saved.resolveProfileImageUrl(profileImageStorageService)
        )
    }

    fun login(request: AuthDto.LoginRequest): AuthDto.AuthResponse {
        val user = userRepository.findByEmail(normalizeEmail(request.email))
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
            user.profileImage,
            user.profileImageType,
            user.profileImageValue,
            user.resolveProfileImageUrl(profileImageStorageService)
        )
    }

    fun logout(): AuthDto.LogoutResponse {
        return AuthDto.LogoutResponse(success = true)
    }

    @Transactional
    fun oauthLogin(request: AuthDto.OAuthRequest): AuthDto.AuthResponse {
        val email = normalizeEmail(request.email)
        val user = userRepository.findByProviderAndProviderId(
            request.provider,
            request.providerId
        ) ?: userRepository.findByEmail(email)

        val ensured = user ?: run {
            val created = User(
                email = email,
                name = request.name,
                provider = request.provider,
                providerId = request.providerId,
                profileImage = request.profileImage,
                profileImageType = if (request.profileImage.isNullOrBlank()) null else "PROVIDER",
                profileImageValue = request.profileImage
            )
            userRepository.save(created)
        }

        return AuthDto.AuthResponse(
            ensured.id!!,
            ensured.email,
            ensured.name,
            ensured.provider,
            ensured.profileImage,
            ensured.profileImageType,
            ensured.profileImageValue,
            ensured.resolveProfileImageUrl(profileImageStorageService)
        )
    }

    fun checkEmail(email: String): AuthDto.CheckEmailResponse {
        val user = userRepository.findByEmail(normalizeEmail(email))
        return if (user != null) {
            AuthDto.CheckEmailResponse(true, user.provider)
        } else {
            AuthDto.CheckEmailResponse(false, null)
        }
    }

    private fun normalizeEmail(email: String): String = email.trim().lowercase()

    private fun User.resolveProfileImageUrl(storageService: ProfileImageStorageService): String? {
        val resolvedType = when {
            !profileImageType.isNullOrBlank() -> profileImageType
            !profileImage.isNullOrBlank() -> UserProfilePreset.PROVIDER
            else -> UserProfilePreset.NONE
        }
        val resolvedValue = profileImageValue ?: profileImage

        return when (resolvedType) {
            UserProfilePreset.UPLOADED -> resolvedValue?.let(storageService::buildMyProfileImageUrl)
            UserProfilePreset.PROVIDER -> resolvedValue
            else -> null
        }
    }
}
