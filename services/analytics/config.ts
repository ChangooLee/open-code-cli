/**
 * Shared analytics configuration
 *
 * Common logic for determining when analytics should be disabled
 * across all analytics systems (Datadog, 1P)
 */

import { getOpenCodeCliEnv, isEnvTruthy } from '../../utils/envUtils.js'
import { isTelemetryDisabled } from '../../utils/privacyLevel.js'

/**
 * Opt-in switch for all external analytics/telemetry phone-home.
 *
 * This open distribution does NOT send analytics anywhere by default — there is
 * no first-party backend to receive it, so the upstream hardcoded endpoints
 * (api.openai.com etc.) would only produce failed/404 phone-home traffic that
 * conflicts with the "bring your own provider" identity. Users who run their
 * own collector can re-enable by setting OPEN_CODE_CLI_ENABLE_TELEMETRY=1
 * (same flag the OTLP exporter already uses, see telemetry/instrumentation.ts).
 */
export function isAnalyticsEnabledOptIn(): boolean {
  return isEnvTruthy(getOpenCodeCliEnv('ENABLE_TELEMETRY'))
}

/**
 * Check if analytics operations should be disabled
 *
 * Analytics is disabled in the following cases:
 * - Not explicitly opted in via OPEN_CODE_CLI_ENABLE_TELEMETRY (default)
 * - Test environment (NODE_ENV === 'test')
 * - Third-party cloud providers (OpenAICompatible/OpenAICompatible)
 * - Privacy level is no-telemetry or essential-traffic
 */
export function isAnalyticsDisabled(): boolean {
  return (
    !isAnalyticsEnabledOptIn() ||
    process.env.NODE_ENV === 'test' ||
    isEnvTruthy(process.env.OPEN_CODE_CLI_USE_BEDROCK) ||
    isEnvTruthy(process.env.OPEN_CODE_CLI_USE_VERTEX) ||
    isEnvTruthy(process.env.OPEN_CODE_CLI_USE_FOUNDRY) ||
    isTelemetryDisabled()
  )
}

/**
 * Check if the feedback survey should be suppressed.
 *
 * Unlike isAnalyticsDisabled(), this does NOT block on 3P providers
 * (OpenAICompatible/OpenAICompatible/OpenAICompatible). The survey is a local UI prompt with no
 * transcript data — enterprise customers capture responses via OTEL.
 */
export function isFeedbackSurveyDisabled(): boolean {
  return process.env.NODE_ENV === 'test' || isTelemetryDisabled()
}
