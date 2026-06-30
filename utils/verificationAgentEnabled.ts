import { getFeatureValue_CACHED_MAY_BE_STALE } from '../services/analytics/featureFlags.js'
import { isEnvTruthy } from './envUtils.js'
export function isVerificationAgentRuntimeEnabled(): boolean {
  if (isEnvTruthy(process.env.OPEN_CODE_CLI_VERIFICATION_AGENT)) {
    return true
  }
  return getFeatureValue_CACHED_MAY_BE_STALE('open_code_cli_hive_evidence', false)
}
