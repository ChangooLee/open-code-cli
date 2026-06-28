import { getFeatureValue_CACHED_MAY_BE_STALE } from '../services/analytics/growthbook.js'
export function shouldInferenceConfigCommandBeImmediate(): boolean {
  return (
    process.env.USER_TYPE === 'ant' ||
    getFeatureValue_CACHED_MAY_BE_STALE('open_code_cli_immediate_model_command', false)
  )
}
