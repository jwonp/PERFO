package com.perfo.backend.repository

import com.perfo.backend.entity.User
import org.springframework.data.jpa.repository.JpaRepository
import java.util.Optional

interface UserRepository : JpaRepository<User, Long> {
    fun findByEmail(email: String): Optional<User>
    fun existsByEmail(email: String): Boolean
    fun findByProviderAndProviderId(provider: String, providerId: String): Optional<User>
}
