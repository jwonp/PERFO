package com.perfo.backend.service

object UserProfilePreset {
    const val NONE = "NONE"
    const val PRESET = "PRESET"
    const val PROVIDER = "PROVIDER"
    const val UPLOADED = "UPLOADED"

    val presetKeys = setOf(
        "avatar-blue",
        "avatar-green",
        "avatar-coral",
        "avatar-violet",
        "avatar-slate",
        "avatar-gold",
    )
}
