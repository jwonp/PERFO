package com.perfo.backend.config

import com.perfo.backend.observability.InternalProxyAuthObservability
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import io.jsonwebtoken.ExpiredJwtException
import io.jsonwebtoken.Claims
import io.jsonwebtoken.Jwts
import io.jsonwebtoken.JwtException
import io.jsonwebtoken.security.Keys
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import java.util.Base64
import javax.crypto.SecretKey

@Component
class InternalApiJwtService(
    @Value("\${app.security.internal-jwt.issuer:perfo-frontend}")
    private val issuer: String,
    @Value("\${app.security.internal-jwt.audience:perfo-backend-ticketing}")
    private val audience: String,
    @Value("\${app.security.internal-jwt.active-kid:}")
    private val activeKid: String,
    @Value("\${app.security.internal-jwt.active-secret:}")
    private val activeSecret: String,
    @Value("\${app.security.internal-jwt.previous-keys:}")
    previousKeys: String,
    private val internalProxyAuthObservability: InternalProxyAuthObservability,
) {
    private val objectMapper = jacksonObjectMapper()
    private val signingKeys: Map<String, SecretKey> = buildSigningKeys(previousKeys)

    fun authenticate(token: String, requiredScope: String, requestPath: String): InternalAuthenticatedUser? {
        val kid = extractKeyId(token) ?: run {
            reject("missing_kid", requiredScope, requestPath)
            return null
        }
        val key = signingKeys[kid] ?: run {
            reject("unknown_kid", requiredScope, requestPath)
            return null
        }

        return try {
            val claims = Jwts.parser()
                .verifyWith(key)
                .requireIssuer(issuer)
                .build()
                .parseSignedClaims(token)
                .payload

            validateAudience(claims, requiredScope, requestPath) ?: return null
            validateScope(claims, requiredScope, requestPath) ?: return null

            val userId = claims["uid"]?.toString()?.toLongOrNull()
            if (userId == null) {
                reject("missing_uid", requiredScope, requestPath)
                return null
            }

            InternalAuthenticatedUser(
                userId = userId,
                email = claims["email"]?.toString()?.trim()?.lowercase(),
            )
        } catch (_: ExpiredJwtException) {
            reject("expired_token", requiredScope, requestPath)
            null
        } catch (exception: JwtException) {
            val reason = if ((exception.message ?: "").contains("signature", ignoreCase = true)) {
                "invalid_signature"
            } else {
                "invalid_token"
            }
            reject(reason, requiredScope, requestPath)
            null
        } catch (_: Exception) {
            reject("invalid_token", requiredScope, requestPath)
            null
        }
    }

    private fun validateAudience(claims: Claims, requiredScope: String, requestPath: String): Claims? {
        val audienceClaim = claims["aud"]
        val matches = when (audienceClaim) {
            is String -> audienceClaim == audience
            is Collection<*> -> audienceClaim.mapNotNull { it?.toString() }.contains(audience)
            else -> false
        }
        if (!matches) {
            reject("invalid_audience", requiredScope, requestPath)
            return null
        }
        return claims
    }

    private fun validateScope(claims: Claims, requiredScope: String, requestPath: String): Claims? {
        val scopeClaim = claims["scope"]
        val matches = when (scopeClaim) {
            is String -> scopeClaim.split(" ").contains(requiredScope)
            is Collection<*> -> scopeClaim.mapNotNull { it?.toString() }.contains(requiredScope)
            else -> false
        }
        if (!matches) {
            reject("invalid_scope", requiredScope, requestPath)
            return null
        }
        return claims
    }

    private fun buildSigningKeys(previousKeys: String): Map<String, SecretKey> {
        val keys = linkedMapOf<String, SecretKey>()
        if (activeKid.isNotBlank() && activeSecret.isNotBlank()) {
            keys[activeKid.trim()] = signingKey(activeSecret)
        }

        previousKeys.split(",")
            .map { it.trim() }
            .filter { it.isNotBlank() }
            .forEach { entry ->
                val separatorIndex = entry.indexOf(':')
                if (separatorIndex <= 0 || separatorIndex == entry.lastIndex) {
                    reject("malformed_previous_key", "internal", "bootstrap")
                    return@forEach
                }

                val kid = entry.substring(0, separatorIndex).trim()
                val secret = entry.substring(separatorIndex + 1).trim()
                if (kid.isNotBlank() && secret.isNotBlank()) {
                    keys.putIfAbsent(kid, signingKey(secret))
                }
            }

        return keys
    }

    private fun signingKey(secret: String): SecretKey {
        return Keys.hmacShaKeyFor(secret.toByteArray(Charsets.UTF_8))
    }

    private fun extractKeyId(token: String): String? {
        val headerSegment = token.substringBefore('.', "")
        if (headerSegment.isBlank()) {
            return null
        }

        return try {
            val headerJson = String(Base64.getUrlDecoder().decode(headerSegment), Charsets.UTF_8)
            val header = objectMapper.readTree(headerJson)
            header.path("kid").asText(null)
        } catch (_: Exception) {
            null
        }
    }

    private fun reject(reason: String, requiredScope: String, requestPath: String) {
        internalProxyAuthObservability.recordReject(
            reason = reason,
            scope = requiredScope,
            path = requestPath,
        )
    }
}
