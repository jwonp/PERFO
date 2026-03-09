package com.perfo.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

public class AuthDto {

    @Data
    public static class SignUpRequest {
        @NotBlank
        @Email
        private String email;

        @NotBlank
        @Size(min = 8)
        private String password;

        private String name;
    }

    @Data
    public static class LoginRequest {
        @NotBlank
        @Email
        private String email;

        @NotBlank
        private String password;
    }

    @Data
    public static class OAuthRequest {
        @NotBlank
        private String provider;

        @NotBlank
        private String providerId;

        @NotBlank
        @Email
        private String email;

        private String name;
        private String profileImage;
    }

    @Data
    public static class AuthResponse {
        private Long id;
        private String email;
        private String name;
        private String provider;
        private String profileImage;

        public AuthResponse(Long id, String email, String name, String provider, String profileImage) {
            this.id = id;
            this.email = email;
            this.name = name;
            this.provider = provider;
            this.profileImage = profileImage;
        }
    }

    @Data
    public static class CheckEmailResponse {
        private boolean exists;
        private String provider;

        public CheckEmailResponse(boolean exists, String provider) {
            this.exists = exists;
            this.provider = provider;
        }
    }
}
