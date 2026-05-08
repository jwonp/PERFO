package com.perfo.backend.config

data class InternalAuthenticatedUser(
    val userId: Long? = null,
    val email: String? = null,
)
