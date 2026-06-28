import type { AgentDefinition } from '../tools/AgentTool/loadAgentsDir.js'

/**
 * Coordinator-mode worker agents. Returned in place of the default built-in
 * agent set when COORDINATOR_MODE is enabled.
 */
export function getCoordinatorAgents(): AgentDefinition[] {
  throw new Error('not implemented')
}
