package com.perfo.backend.repository

import com.perfo.backend.entity.AuthVerificationCode
import com.perfo.backend.entity.AuthVerificationPurpose
import org.springframework.data.jpa.repository.JpaRepository

interface AuthVerificationCodeRepository : JpaRepository<AuthVerificationCode, Long> {
    fun findTopByEmailAndPurposeAndConsumedAtIsNullOrderByIdDesc(
        email: String,
        purpose: AuthVerificationPurpose,
    ): AuthVerificationCode?

    fun findByEmailAndPurposeAndVerificationKeyAndConsumedAtIsNull(
        email: String,
        purpose: AuthVerificationPurpose,
        verificationKey: String,
    ): AuthVerificationCode?
}
