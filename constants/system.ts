import { feature } from 'bun:bundle'
import { getFeatureValue_CACHED_MAY_BE_STALE } from '../services/analytics/featureFlags.js'
import { logForDebugging } from '../utils/debug.js'
import { getOpenCodeCliEnv, isEnvDefinedFalsy } from '../utils/envUtils.js'
import { getWorkload } from '../utils/workloadContext.js'
const DEFAULT_PREFIX = `You are an interactive code agent.`
const AGENT_SDK_OPEN_CODE_PRESET_PREFIX = `You are an interactive code agent running within the Open Code CLI Agent SDK.`
const AGENT_SDK_PREFIX = `You are an Open Code CLI agent built on the Open Code CLI Agent SDK.`
const CLI_SYSPROMPT_PREFIX_VALUES = [
  DEFAULT_PREFIX,
  AGENT_SDK_OPEN_CODE_PRESET_PREFIX,
  AGENT_SDK_PREFIX,
] as const
export type CLISyspromptPrefix = (typeof CLI_SYSPROMPT_PREFIX_VALUES)[number]
export const CLI_SYSPROMPT_PREFIXES: ReadonlySet<string> = new Set(
  CLI_SYSPROMPT_PREFIX_VALUES,
)
export function getCLISyspromptPrefix(options?: {
  isNonInteractive: boolean
  hasAppendSystemPrompt: boolean
}): CLISyspromptPrefix {
  if (options?.isNonInteractive) {
    if (options.hasAppendSystemPrompt) {
      return AGENT_SDK_OPEN_CODE_PRESET_PREFIX
    }
    return AGENT_SDK_PREFIX
  }
  return DEFAULT_PREFIX
}
function isAttributionHeaderEnabled(): boolean {
  if (isEnvDefinedFalsy(getOpenCodeCliEnv('ATTRIBUTION_HEADER'))) {
    return false
  }
  return getFeatureValue_CACHED_MAY_BE_STALE('open_code_cli_attribution_header', true)
}
export function getAttributionHeader(fingerprint: string): string {
  if (!isAttributionHeaderEnabled()) {
    return ''
  }
  const version = `${MACRO.VERSION}.${fingerprint}`
  const entrypoint = getOpenCodeCliEnv('LAUNCH_MODE') ?? 'unknown'
  const cch = feature('NATIVE_CLIENT_ATTESTATION') ? ' cch=00000;' : ''
  const workload = getWorkload()
  const workloadPair = workload ? ` cc_workload=${workload};` : ''
  const header = `x-open-code-cli-billing-header: cc_version=${version}; cc_entrypoint=${entrypoint};${cch}${workloadPair}`
  logForDebugging(`attribution header ${header}`)
  return header
}
