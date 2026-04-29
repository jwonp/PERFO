package com.perfo.backend.dto

class UserProfileDto {
    data class UpdateMyProfileRequest(
        val displayName: String,
        val profileImageType: String,
        val profileImageValue: String? = null
    )

    data class MyProfileResponse(
        val id: Long,
        val email: String,
        val displayName: String,
        val profileImageType: String,
        val profileImageValue: String?,
        val profileImageUrl: String?,
        val updatedAt: String?
    )
}
