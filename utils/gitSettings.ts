import { isEnvDefinedFalsy, isEnvTruthy } from './envUtils.js'
import { getInitialSettings } from './settings/settings.js'
export function shouldIncludeGitInstructions(): boolean {
  const envVal = process.env.OPEN_CODE_CLI_DISABLE_GIT_INSTRUCTIONS
  if (isEnvTruthy(envVal)) return false
  if (isEnvDefinedFalsy(envVal)) return true
  return getInitialSettings().includeGitInstructions ?? true
}
