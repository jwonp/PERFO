package com.perfo.backend.controller

import com.perfo.backend.dto.UserProfileDto
import com.perfo.backend.service.ProfileImageContent
import com.perfo.backend.service.UserService
import jakarta.validation.Valid
import org.springframework.http.CacheControl
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.multipart.MultipartFile
import java.util.concurrent.TimeUnit

@RestController
@RequestMapping("/api/users")
class UserController(
    private val userService: UserService,
) {

    @GetMapping("/me")
    fun getMyProfile(authentication: Authentication): UserProfileDto.MyProfileResponse {
        return userService.getMyProfile(authentication.name)
    }

    @GetMapping("/me/profile-image")
    fun getMyProfileImage(authentication: Authentication): ResponseEntity<ByteArray> {
        val image = userService.getMyProfileImage(authentication.name)

        return ResponseEntity.ok()
            .cacheControl(CacheControl.maxAge(0, TimeUnit.SECONDS).mustRevalidate().cachePrivate())
            .header(HttpHeaders.PRAGMA, "no-cache")
            .contentType(MediaType.parseMediaType(image.contentType))
            .body(image.bytes)
    }

    @PatchMapping("/me/profile")
    fun updateMyProfile(
        authentication: Authentication,
        @Valid @RequestBody request: UserProfileDto.UpdateMyProfileRequest,
    ): UserProfileDto.MyProfileResponse {
        return userService.updateMyProfile(authentication.name, request)
    }

    @PostMapping("/me/profile-image")
    fun uploadMyProfileImage(
        authentication: Authentication,
        @RequestParam("file") file: MultipartFile,
    ): UserProfileDto.MyProfileResponse {
        return userService.uploadMyProfileImage(authentication.name, file)
    }

    @ResponseStatus(HttpStatus.BAD_REQUEST)
    @ExceptionHandler(IllegalArgumentException::class)
    fun handleIllegalArgument(exception: IllegalArgumentException): Map<String, String> {
        return mapOf("message" to (exception.message ?: "Invalid request"))
    }

    @ResponseStatus(HttpStatus.SERVICE_UNAVAILABLE)
    @ExceptionHandler(IllegalStateException::class)
    fun handleIllegalState(exception: IllegalStateException): Map<String, String> {
        return mapOf("message" to (exception.message ?: "Storage unavailable"))
    }
}
