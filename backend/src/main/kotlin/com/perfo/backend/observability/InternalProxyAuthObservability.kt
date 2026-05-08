package com.perfo.backend.observability

import io.micrometer.core.instrument.MeterRegistry
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Component

@Component
class InternalProxyAuthObservability(
    private val meterRegistry: MeterRegistry,
) {
    private val logger = LoggerFactory.getLogger(javaClass)

    fun recordReject(reason: String, scope: String, path: String) {
        meterRegistry.counter(
            "perfo.internal_proxy_auth.reject",
            "reason",
            reason,
            "scope",
            scope,
        ).increment()
        logger.warn(
            "internal_proxy_auth_rejected reason={} scope={} path={}",
            reason,
            scope,
            path,
        )
    }
}
