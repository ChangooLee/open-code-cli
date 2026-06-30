import { getOpenCodeCliEnv, isEnvTruthy } from './envUtils.js'
export function hasEmbeddedSearchTools(): boolean {
  if (!isEnvTruthy(process.env.EMBEDDED_SEARCH_TOOLS)) return false
  const e = getOpenCodeCliEnv('LAUNCH_MODE')
  return (
    e !== 'sdk-ts' && e !== 'sdk-py' && e !== 'sdk-cli' && e !== 'local-agent'
  )
}
export function embeddedSearchToolsBinaryPath(): string {
  return process.execPath
}
