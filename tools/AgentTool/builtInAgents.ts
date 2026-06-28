import { feature } from 'bun:bundle'
import { getIsNonInteractiveSession } from '../../bootstrap/state.js'
import { getFeatureValue_CACHED_MAY_BE_STALE } from '../../services/analytics/growthbook.js'
import { getOpenCodeCliEnv, isEnvTruthy } from '../../utils/envUtils.js'
import { OPEN_CODE_GUIDE_AGENT } from './built-in/openCodeGuideAgent.js'
import { EXPLORE_AGENT } from './built-in/exploreAgent.js'
import { GENERAL_PURPOSE_AGENT } from './built-in/generalPurposeAgent.js'
import { PLAN_AGENT } from './built-in/planAgent.js'
import { STATUSLINE_SETUP_AGENT } from './built-in/statuslineSetup.js'
import { VERIFICATION_AGENT } from './built-in/verificationAgent.js'
import type { AgentDefinition } from './loadAgentsDir.js'
export function areExplorePlanAgentsEnabled(): boolean {
  if (feature('BUILTIN_EXPLORE_PLAN_AGENTS')) {
    return getFeatureValue_CACHED_MAY_BE_STALE('open_code_cli_amber_stoat', true)
  }
  return false
}
export function getBuiltInAgents(): AgentDefinition[] {
  if (
    isEnvTruthy(process.env.OPEN_CODE_AGENT_SDK_DISABLE_BUILTIN_AGENTS) &&
    getIsNonInteractiveSession()
  ) {
    return []
  }
  if (feature('COORDINATOR_MODE')) {
    if (isEnvTruthy(getOpenCodeCliEnv('COORDINATOR_MODE'))) {
      const { getCoordinatorAgents } =
        require('../../coordinator/workerAgent.js') as typeof import('../../coordinator/workerAgent.js')
      return getCoordinatorAgents()
    }
  }
  const agents: AgentDefinition[] = [
    GENERAL_PURPOSE_AGENT,
    STATUSLINE_SETUP_AGENT,
  ]
  if (areExplorePlanAgentsEnabled()) {
    agents.push(EXPLORE_AGENT, PLAN_AGENT)
  }
  const isNonSdkEntrypoint =
    getOpenCodeCliEnv('ENTRYPOINT') !== 'sdk-ts' &&
    getOpenCodeCliEnv('ENTRYPOINT') !== 'sdk-py' &&
    getOpenCodeCliEnv('ENTRYPOINT') !== 'sdk-cli'
  if (isNonSdkEntrypoint) {
    agents.push(OPEN_CODE_GUIDE_AGENT)
  }
  if (
    feature('VERIFICATION_AGENT') &&
    getFeatureValue_CACHED_MAY_BE_STALE('open_code_cli_hive_evidence', false)
  ) {
    agents.push(VERIFICATION_AGENT)
  }
  return agents
}
