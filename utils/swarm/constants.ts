export const TEAM_LEAD_NAME = 'team-lead'
export const SWARM_SESSION_NAME = 'open-code-cli-swarm'
export const SWARM_VIEW_WINDOW_NAME = 'swarm-view'
export const TMUX_COMMAND = 'tmux'
export const HIDDEN_SESSION_NAME = 'open-code-cli-hidden'
export function getSwarmSocketName(): string {
  return `open-code-cli-swarm-${process.pid}`
}
export const TEAMMATE_COMMAND_ENV_VAR = 'OPEN_CODE_CLI_TEAMMATE_COMMAND'
export const TEAMMATE_COLOR_ENV_VAR = 'OPEN_CODE_CLI_AGENT_COLOR'
export const PLAN_MODE_REQUIRED_ENV_VAR = 'OPEN_CODE_CLI_PLAN_MODE_REQUIRED'
