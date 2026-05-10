package com.perfo.backend.service

import com.perfo.backend.dto.AuthDto
import com.perfo.backend.entity.AuthVerificationCode
import com.perfo.backend.entity.AuthVerificationPurpose
import com.perfo.backend.entity.User
import com.perfo.backend.entity.UserRole
import com.perfo.backend.repository.AuthVerificationCodeRepository
import com.perfo.backend.repository.UserRepository
import org.springframework.beans.factory.annotation.Value
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.security.SecureRandom
import java.time.LocalDateTime
import java.util.UUID
import kotlin.math.pow

@Service
class AuthService(
    private val userRepository: UserRepository,
    private val authVerificationCodeRepository: AuthVerificationCodeRepository,
    private val passwordEncoder: PasswordEncoder,
    private val profileImageStorageService: ProfileImageStorageService,
    private val mailSender: MailSender,
    @Value("\${app.auth.preview-code-enabled:true}")
    private val previewCodeEnabled: Boolean,
) {
    companion object {
        private const val VERIFICATION_CODE_LENGTH = 6
        private const val VERIFICATION_CODE_TTL_MINUTES = 10L
    }

    private val random = SecureRandom()

    @Transactional
    fun signUp(request: AuthDto.SignUpRequest): AuthDto.AuthResponse {
        val email = normalizeEmail(request.email)

        if (userRepository.existsByEmail(email)) {
            throw IllegalArgumentException("Email already exists")
        }

        val user = User(
            email = email,
            password = passwordEncoder.encode(request.password),
            name = request.name,
            provider = "credentials",
            role = UserRole.USER,
        )

        return userRepository.save(user).toAuthResponse()
    }

    fun login(request: AuthDto.LoginRequest): AuthDto.AuthResponse {
        val user = userRepository.findByEmail(normalizeEmail(request.email))
            ?: throw IllegalArgumentException("User not found")

        if (user.provider != "credentials") {
            throw IllegalArgumentException("This email uses ${user.provider} login")
        }

        if (!passwordEncoder.matches(request.password, user.password)) {
            throw IllegalArgumentException("Invalid password")
        }

        return user.toAuthResponse()
    }

    fun logout(): AuthDto.LogoutResponse {
        return AuthDto.LogoutResponse(success = true)
    }

    @Transactional
    fun oauthLogin(request: AuthDto.OAuthRequest): AuthDto.AuthResponse {
        val email = normalizeEmail(request.email)
        val user = userRepository.findByProviderAndProviderId(
            request.provider,
            request.providerId,
        ) ?: userRepository.findByEmail(email)

        val ensured = user ?: run {
            userRepository.save(
                User(
                    email = email,
                    name = request.name,
                    provider = request.provider,
                    providerId = request.providerId,
                    profileImage = request.profileImage,
                    profileImageType = if (request.profileImage.isNullOrBlank()) null else "PROVIDER",
                    profileImageValue = request.profileImage,
                    role = UserRole.USER,
                ),
            )
        }

        return ensured.toAuthResponse()
    }

    fun checkEmail(email: String): AuthDto.CheckEmailResponse {
        val user = userRepository.findByEmail(normalizeEmail(email))
        return if (user != null) {
            AuthDto.CheckEmailResponse(true, user.provider)
        } else {
            AuthDto.CheckEmailResponse(false, null)
        }
    }

    @Transactional
    fun requestVerificationCode(request: AuthDto.VerificationCodeRequest): AuthDto.VerificationCodeResponse {
        val email = normalizeEmail(request.email)
        val purpose = parsePurpose(request.purpose)
        validateVerificationCodeRequest(email, purpose)

        val code = generateVerificationCode()
        val saved = authVerificationCodeRepository.save(
            AuthVerificationCode(
                email = email,
                purpose = purpose,
                codeHash = passwordEncoder.encode(code),
                expiresAt = LocalDateTime.now().plusMinutes(VERIFICATION_CODE_TTL_MINUTES),
            ),
        )
        mailSender.sendVerificationCode(
            email = email,
            code = code,
            purpose = purpose.name,
        )

        return AuthDto.VerificationCodeResponse(
            email = email,
            purpose = purpose.name,
            expiresAt = saved.expiresAt.toString(),
            previewCode = code.takeIf { previewCodeEnabled },
        )
    }

    @Transactional
    fun verifyVerificationCode(request: AuthDto.VerificationCodeVerifyRequest): AuthDto.VerificationCodeVerifyResponse {
        val email = normalizeEmail(request.email)
        val purpose = parsePurpose(request.purpose)
        val verification = authVerificationCodeRepository.findTopByEmailAndPurposeAndConsumedAtIsNullOrderByIdDesc(
            email,
            purpose,
        ) ?: throw IllegalArgumentException("Verification code not found")

        if (verification.expiresAt.isBefore(LocalDateTime.now())) {
            throw IllegalArgumentException("Verification code expired")
        }

        if (!passwordEncoder.matches(request.code.trim(), verification.codeHash)) {
            throw IllegalArgumentException("Invalid verification code")
        }

        verification.verifiedAt = LocalDateTime.now()
        verification.verificationKey = UUID.randomUUID().toString()
        val saved = authVerificationCodeRepository.save(verification)

        return AuthDto.VerificationCodeVerifyResponse(
            email = email,
            purpose = purpose.name,
            verificationToken = saved.verificationKey ?: throw IllegalStateException("Verification token missing"),
        )
    }

    @Transactional
    fun completeVerifiedSignUp(request: AuthDto.VerifiedSignUpRequest): AuthDto.AuthResponse {
        val email = normalizeEmail(request.email)
        consumeVerification(email, AuthVerificationPurpose.SIGN_UP, request.verificationToken)
        return signUp(AuthDto.SignUpRequest(email = email, password = request.password, name = request.name))
    }

    @Transactional
    fun resetPassword(request: AuthDto.PasswordResetRequest): AuthDto.PasswordResetResponse {
        val email = normalizeEmail(request.email)
        consumeVerification(email, AuthVerificationPurpose.PASSWORD_RESET, request.verificationToken)

        val user = userRepository.findByEmail(email) ?: throw IllegalArgumentException("User not found")
        if (user.provider != "credentials") {
            throw IllegalArgumentException("This email uses ${user.provider} login")
        }

        user.password = passwordEncoder.encode(request.password)
        userRepository.save(user)
        return AuthDto.PasswordResetResponse(success = true)
    }

    private fun normalizeEmail(email: String): String = email.trim().lowercase()

    private fun parsePurpose(rawPurpose: String): AuthVerificationPurpose {
        return try {
            AuthVerificationPurpose.valueOf(rawPurpose.trim().uppercase())
        } catch (_: Exception) {
            throw IllegalArgumentException("Unsupported verification purpose")
        }
    }

    private fun validateVerificationCodeRequest(email: String, purpose: AuthVerificationPurpose) {
        val user = userRepository.findByEmail(email)
        when (purpose) {
            AuthVerificationPurpose.SIGN_UP -> {
                if (user != null) {
                    if (user.provider == "credentials") {
                        throw IllegalArgumentException("Email already exists")
                    }
                    throw IllegalArgumentException("This email uses ${user.provider} login")
                }
            }

            AuthVerificationPurpose.PASSWORD_RESET -> {
                if (user == null) {
                    throw IllegalArgumentException("User not found")
                }
                if (user.provider != "credentials") {
                    throw IllegalArgumentException("This email uses ${user.provider} login")
                }
            }
        }
    }

    private fun consumeVerification(
        email: String,
        purpose: AuthVerificationPurpose,
        verificationToken: String,
    ) {
        val verification = authVerificationCodeRepository.findByEmailAndPurposeAndVerificationKeyAndConsumedAtIsNull(
            email,
            purpose,
            verificationToken.trim(),
        ) ?: throw IllegalArgumentException("Verification token not found")

        if (verification.verifiedAt == null) {
            throw IllegalArgumentException("Verification is not completed")
        }

        if (verification.expiresAt.isBefore(LocalDateTime.now())) {
            throw IllegalArgumentException("Verification token expired")
        }

        verification.consumedAt = LocalDateTime.now()
        authVerificationCodeRepository.save(verification)
    }

    private fun generateVerificationCode(): String {
        val upperBound = 10.0.pow(VERIFICATION_CODE_LENGTH.toDouble()).toInt()
        val value = random.nextInt(upperBound)
        return value.toString().padStart(VERIFICATION_CODE_LENGTH, '0')
    }

    private fun User.toAuthResponse(): AuthDto.AuthResponse {
        return AuthDto.AuthResponse(
            id = id ?: throw IllegalArgumentException("User id is missing"),
            email = email,
            name = name,
            provider = provider,
            role = role.name,
            profileImage = profileImage,
            profileImageType = profileImageType,
            profileImageValue = profileImageValue,
            profileImageUrl = resolveProfileImageUrl(profileImageStorageService),
        )
    }

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
