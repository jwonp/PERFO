package com.perfo.backend.service

import com.perfo.backend.dto.UserProfileDto
import com.perfo.backend.entity.User
import com.perfo.backend.repository.UserRepository
import org.springframework.stereotype.Service
import org.springframework.web.multipart.MultipartFile
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
class UserService(
    private val userRepository: UserRepository,
    private val profileImageStorageService: ProfileImageStorageService,
) {
    companion object {
        private const val MAX_PROFILE_IMAGE_SIZE_BYTES = 2 * 1024 * 1024L
    }

    fun getMyProfile(email: String): UserProfileDto.MyProfileResponse {
        val user = findUser(email)
        return user.toProfileResponse()
    }

    fun getMyProfileImage(email: String): ProfileImageContent {
        val user = findUser(email)
        require(user.profileImageType == UserProfilePreset.UPLOADED && !user.profileImageValue.isNullOrBlank()) {
            "Profile image not found"
        }

        return profileImageStorageService.downloadProfileImage(user.profileImageValue!!)
    }

    @Transactional
    fun updateMyProfile(email: String, request: UserProfileDto.UpdateMyProfileRequest): UserProfileDto.MyProfileResponse {
        val normalizedDisplayName = normalizeDisplayName(request.displayName)
        val normalizedImage = normalizeProfileImageForProfileUpdate(request.profileImageType, request.profileImageValue)
        val user = findUser(email)
        val previousUploadedKey = user.profileImageValue.takeIf { user.profileImageType == UserProfilePreset.UPLOADED }

        user.name = normalizedDisplayName
        user.profileImageType = normalizedImage.first
        user.profileImageValue = normalizedImage.second
        user.profileImage = when (normalizedImage.first) {
            UserProfilePreset.PRESET -> normalizedImage.second
            UserProfilePreset.UPLOADED, UserProfilePreset.PROVIDER -> normalizedImage.second
            else -> null
        }

        val saved = userRepository.save(user)

        if (previousUploadedKey != null && previousUploadedKey != saved.profileImageValue) {
            profileImageStorageService.deleteProfileImage(previousUploadedKey)
        }

        return saved.toProfileResponse()
    }

    @Transactional
    fun uploadMyProfileImage(email: String, file: MultipartFile): UserProfileDto.MyProfileResponse {
        validateUploadFile(file)
        val detectedImage = detectSupportedImage(file.bytes)
        val user = findUser(email)
        val userId = user.id ?: throw IllegalArgumentException("User id is missing")
        val objectKey = "$userId/${UUID.randomUUID()}.${detectedImage.extension}"
        val previousUploadedKey = user.profileImageValue.takeIf { user.profileImageType == UserProfilePreset.UPLOADED }
        val storedObjectKey = profileImageStorageService.uploadProfileImage(objectKey, file.bytes, detectedImage.contentType)

        try {
            user.profileImageType = UserProfilePreset.UPLOADED
            user.profileImageValue = storedObjectKey
            user.profileImage = storedObjectKey

            val saved = userRepository.save(user)

            if (previousUploadedKey != null && previousUploadedKey != storedObjectKey) {
                profileImageStorageService.deleteProfileImage(previousUploadedKey)
            }

            return saved.toProfileResponse()
        } catch (exception: Exception) {
            profileImageStorageService.deleteProfileImage(storedObjectKey)
            throw exception
        }
    }

    private fun findUser(email: String): User {
        return userRepository.findByEmail(email.trim().lowercase())
            ?: throw IllegalArgumentException("User not found")
    }

    private fun normalizeDisplayName(displayName: String): String {
        val trimmed = displayName.trim()
        require(trimmed.length >= 2) { "Display name must be at least 2 characters" }
        require(trimmed.length <= 20) { "Display name must be at most 20 characters" }
        require(trimmed.none { it == '\n' || it == '\r' || Character.isISOControl(it) }) {
            "Display name contains unsupported characters"
        }
        return trimmed
    }

    private fun normalizeProfileImageForProfileUpdate(type: String, value: String?): Pair<String, String?> {
        require(type != UserProfilePreset.UPLOADED) {
            "Uploaded profile image must be set via upload endpoint"
        }
        return normalizeProfileImage(type, value)
    }

    private fun normalizeProfileImage(type: String, value: String?): Pair<String, String?> {
        return when (type) {
            UserProfilePreset.NONE -> UserProfilePreset.NONE to null
            UserProfilePreset.PRESET -> {
                require(!value.isNullOrBlank() && UserProfilePreset.presetKeys.contains(value)) {
                    "Unsupported profile image preset"
                }
                UserProfilePreset.PRESET to value
            }
            UserProfilePreset.PROVIDER, UserProfilePreset.UPLOADED -> {
                require(!value.isNullOrBlank()) { "Profile image value is required" }
                type to value
            }
            else -> throw IllegalArgumentException("Unsupported profile image type")
        }
    }

    private fun validateUploadFile(file: MultipartFile) {
        require(!file.isEmpty) { "Profile image file is required" }
        require(file.size in 1..MAX_PROFILE_IMAGE_SIZE_BYTES) { "Profile image must be 2MB or smaller" }

        val contentType = file.contentType?.lowercase()
        val fileName = file.originalFilename?.lowercase().orEmpty()
        require(contentType != "image/svg+xml" && !fileName.endsWith(".svg")) {
            "Unsupported profile image format"
        }
    }

    private fun detectSupportedImage(bytes: ByteArray): DetectedProfileImage {
        require(bytes.isNotEmpty()) { "Profile image file is required" }

        if (bytes.size >= 8 && bytes.sliceArray(0..7).contentEquals(byteArrayOf(
                0x89.toByte(), 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A
            ))
        ) {
            return DetectedProfileImage("image/png", "png")
        }

        if (bytes.size >= 3 && bytes[0] == 0xFF.toByte() && bytes[1] == 0xD8.toByte() && bytes[2] == 0xFF.toByte()) {
            return DetectedProfileImage("image/jpeg", "jpg")
        }

        if (bytes.size >= 12 &&
            bytes.sliceArray(0..3).contentEquals(byteArrayOf(0x52, 0x49, 0x46, 0x46)) &&
            bytes.sliceArray(8..11).contentEquals(byteArrayOf(0x57, 0x45, 0x42, 0x50))
        ) {
            return DetectedProfileImage("image/webp", "webp")
        }

        val prefix = bytes.copyOfRange(0, minOf(bytes.size, 256)).toString(Charsets.UTF_8).trimStart()
        require(!prefix.startsWith("<svg", ignoreCase = true)) { "Unsupported profile image format" }
        throw IllegalArgumentException("Unsupported profile image format")
    }

    private data class DetectedProfileImage(
        val contentType: String,
        val extension: String,
    )

    private fun User.toProfileResponse(): UserProfileDto.MyProfileResponse {
        val resolvedType = when {
            !profileImageType.isNullOrBlank() -> profileImageType!!
            !profileImage.isNullOrBlank() -> UserProfilePreset.PROVIDER
            else -> UserProfilePreset.NONE
        }
        val resolvedValue = profileImageValue ?: profileImage

        return UserProfileDto.MyProfileResponse(
            id = id ?: throw IllegalArgumentException("User id is missing"),
            email = email,
            displayName = name?.takeIf { it.isNotBlank() } ?: "PERFO User",
            profileImageType = resolvedType,
            profileImageValue = resolvedValue,
            profileImageUrl = when (resolvedType) {
                UserProfilePreset.UPLOADED -> resolvedValue?.let(profileImageStorageService::buildMyProfileImageUrl)
                UserProfilePreset.PROVIDER -> resolvedValue
                else -> null
            },
            updatedAt = updatedAt?.toString(),
        )
    }
}
