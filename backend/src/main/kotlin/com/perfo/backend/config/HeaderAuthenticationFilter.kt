package com.perfo.backend.config

import com.perfo.backend.observability.InternalProxyAuthObservability
import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter

@Component
class HeaderAuthenticationFilter(
    private val internalApiJwtService: InternalApiJwtService,
    private val internalProxyAuthObservability: InternalProxyAuthObservability,
) : OncePerRequestFilter() {
    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain,
    ) {
        if (SecurityContextHolder.getContext().authentication == null) {
            val requiredScope = resolveRequiredScope(request)
            if (requiredScope != null) {
                authenticateInternalProxyRequest(request, requiredScope)
            }
        }

        filterChain.doFilter(request, response)
    }

    override fun shouldNotFilter(request: HttpServletRequest): Boolean {
        return resolveRequiredScope(request) == null
    }

    private fun authenticateInternalProxyRequest(request: HttpServletRequest, requiredScope: String) {
        val authorizationHeader = request.getHeader("Authorization")?.trim()
        if (authorizationHeader.isNullOrBlank() || !authorizationHeader.startsWith("Bearer ")) {
            internalProxyAuthObservability.recordReject(
                reason = "missing_token",
                scope = requiredScope,
                path = request.requestURI,
            )
            return
        }

        val token = authorizationHeader.removePrefix("Bearer ").trim()
        val principal = internalApiJwtService.authenticate(
            token = token,
            requiredScope = requiredScope,
            requestPath = request.requestURI,
        ) ?: return
        SecurityContextHolder.getContext().authentication = UsernamePasswordAuthenticationToken.authenticated(
            principal,
            null,
            emptyList(),
        )
    }

    private fun resolveRequiredScope(request: HttpServletRequest): String? {
        val path = request.requestURI
        return when {
            path.startsWith("/api/ticketing/") -> "ticketing"
            path.startsWith("/api/users/") -> "users"
            path == "/api/tickets" -> "tickets"
            path.startsWith("/api/tickets/") && !path.matches(Regex("^/api/tickets/[^/]+/validations$")) -> "tickets"
            else -> null
        }
    }
}
