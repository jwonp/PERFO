package com.perfo.backend.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.UpdateTimestamp
import java.time.LocalDateTime

@Entity
@Table(name = "auth_verification_codes")
class AuthVerificationCode(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null,
    @Column(nullable = false)
    var email: String = "",
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var purpose: AuthVerificationPurpose = AuthVerificationPurpose.SIGN_UP,
    @Column(name = "code_hash", nullable = false)
    var codeHash: String = "",
    @Column(name = "verification_key")
    var verificationKey: String? = null,
    @Column(name = "expires_at", nullable = false)
    var expiresAt: LocalDateTime = LocalDateTime.now(),
    @Column(name = "verified_at")
    var verifiedAt: LocalDateTime? = null,
    @Column(name = "consumed_at")
    var consumedAt: LocalDateTime? = null,
    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    var createdAt: LocalDateTime? = null,
    @UpdateTimestamp
    @Column(name = "updated_at")
    var updatedAt: LocalDateTime? = null,
)
