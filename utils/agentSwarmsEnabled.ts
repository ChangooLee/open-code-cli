import { getFeatureValue_CACHED_MAY_BE_STALE } from '../services/analytics/featureFlags.js'
import { isEnvTruthy } from './envUtils.js'
function isAgentTeamsFlagSet(): boolean {
  return process.argv.includes('--agent-teams')
}
export function isAgentSwarmsEnabled(): boolean {
  if (process.env.USER_TYPE === 'ant') {
    return true
  }
  if (
    !isEnvTruthy(process.env.OPEN_CODE_CLI_EXPERIMENTAL_AGENT_TEAMS) &&
    !isAgentTeamsFlagSet()
  ) {
    return false
  }
  if (!getFeatureValue_CACHED_MAY_BE_STALE('open_code_cli_amber_flint', true)) {
    return false
  }
  return true
}
