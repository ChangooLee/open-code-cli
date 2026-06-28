import { getOpenCodeCliEnv, isEnvTruthy } from '../../utils/envUtils.js'
import { isTelemetryDisabled } from '../../utils/privacyLevel.js'
export function isAnalyticsEnabledOptIn(): boolean {
  return isEnvTruthy(getOpenCodeCliEnv('ENABLE_TELEMETRY'))
}
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
export function isFeedbackSurveyDisabled(): boolean {
  return process.env.NODE_ENV === 'test' || isTelemetryDisabled()
}
