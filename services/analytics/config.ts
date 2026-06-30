import { getOpenCodeCliEnv, isEnvTruthy } from '../../utils/envUtils.js'
import { isTelemetryDisabled } from '../../utils/privacyLevel.js'
export function isAnalyticsEnabledOptIn(): boolean {
  return isEnvTruthy(getOpenCodeCliEnv('ENABLE_TELEMETRY'))
}
export function isAnalyticsDisabled(): boolean {
  return (
    !isAnalyticsEnabledOptIn() ||
    process.env.NODE_ENV === 'test' ||
    isTelemetryDisabled()
  )
}
export function isFeedbackSurveyDisabled(): boolean {
  return process.env.NODE_ENV === 'test' || isTelemetryDisabled()
}
