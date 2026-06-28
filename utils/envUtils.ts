import memoize from 'lodash-es/memoize.js'
import { homedir } from 'os'
import { join } from 'path'
const OPEN_CODE_CLI_ENV_PREFIX = 'OPEN_CODE_CLI_'
export function getOpenCodeCliEnv(name: string): string | undefined {
  return process.env[`${OPEN_CODE_CLI_ENV_PREFIX}${name}`]
}
export function setOpenCodeCliEnv(name: string, value: string): void {
  process.env[`${OPEN_CODE_CLI_ENV_PREFIX}${name}`] = value
}
export function deleteOpenCodeCliEnv(name: string): void {
  delete process.env[`${OPEN_CODE_CLI_ENV_PREFIX}${name}`]
}
export const getOpenCodeCliConfigHomeDir = memoize(
  (): string => {
    const openCodeConfigDir = process.env.OPEN_CODE_CLI_CONFIG_DIR
    if (openCodeConfigDir) return openCodeConfigDir.normalize('NFC')
    return join(homedir(), '.open-code-cli').normalize('NFC')
  },
  () => process.env.OPEN_CODE_CLI_CONFIG_DIR ?? '',
)
export function getTeamsDir(): string {
  return join(getOpenCodeCliConfigHomeDir(), 'teams')
}
export function hasNodeOption(flag: string): boolean {
  const nodeOptions = process.env.NODE_OPTIONS
  if (!nodeOptions) {
    return false
  }
  return nodeOptions.split(/\s+/).includes(flag)
}
export function isEnvTruthy(envVar: string | boolean | undefined): boolean {
  if (!envVar) return false
  if (typeof envVar === 'boolean') return envVar
  const normalizedValue = envVar.toLowerCase().trim()
  return ['1', 'true', 'yes', 'on'].includes(normalizedValue)
}
export function isEnvDefinedFalsy(
  envVar: string | boolean | undefined,
): boolean {
  if (envVar === undefined) return false
  if (typeof envVar === 'boolean') return !envVar
  if (!envVar) return false
  const normalizedValue = envVar.toLowerCase().trim()
  return ['0', 'false', 'no', 'off'].includes(normalizedValue)
}
export function isBareMode(): boolean {
  return (
    isEnvTruthy(getOpenCodeCliEnv('SIMPLE')) ||
    process.argv.includes('--bare')
  )
}
export function parseEnvVars(
  rawEnvArgs: string[] | undefined,
): Record<string, string> {
  const parsedEnv: Record<string, string> = {}
  if (rawEnvArgs) {
    for (const envStr of rawEnvArgs) {
      const [key, ...valueParts] = envStr.split('=')
      if (!key || valueParts.length === 0) {
        throw new Error(
          `Invalid environment variable format: ${envStr}, environment variables should be added as: -e KEY1=value1 -e KEY2=value2`,
        )
      }
      parsedEnv[key] = valueParts.join('=')
    }
  }
  return parsedEnv
}
export function getAWSRegion(): string {
  return process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1'
}
export function getDefaultOpenAICompatibleRegion(): string {
  return process.env.CLOUD_ML_REGION || 'us-east5'
}
export function shouldMaintainProjectWorkingDir(): boolean {
  return isEnvTruthy(process.env.OPEN_CODE_BASH_MAINTAIN_PROJECT_WORKING_DIR)
}
export function isRunningOnHomespace(): boolean {
  return (
    process.env.USER_TYPE === 'ant' &&
    isEnvTruthy(process.env.COO_RUNNING_ON_HOMESPACE)
  )
}
export function isInProtectedNamespace(): boolean {
  if (process.env.USER_TYPE === 'ant') {
    return (
      require('./protectedNamespace.js') as typeof import('./protectedNamespace.js')
    ).checkProtectedNamespace()
  }
  return false
}
const VERTEX_REGION_OVERRIDES: ReadonlyArray<[string, string]> = [
  ['openai/gpt-4o-mini', 'VERTEX_REGION_OPEN_CODE_HAIKU_4_5'],
  ['open-code-cli-3-5-haiku', 'VERTEX_REGION_OPEN_CODE_3_5_HAIKU'],
  ['open-code-cli-3-5-sonnet', 'VERTEX_REGION_OPEN_CODE_3_5_SONNET'],
  ['open-code-cli-3-7-sonnet', 'VERTEX_REGION_OPEN_CODE_3_7_SONNET'],
  ['openai/gpt-4.1', 'VERTEX_REGION_OPEN_CODE_4_1_OPUS'],
  ['openai/gpt-4.1', 'VERTEX_REGION_OPEN_CODE_4_0_OPUS'],
  ['openai/gpt-4o', 'VERTEX_REGION_OPEN_CODE_4_6_SONNET'],
  ['openai/gpt-4o', 'VERTEX_REGION_OPEN_CODE_4_5_SONNET'],
  ['openai/gpt-4o', 'VERTEX_REGION_OPEN_CODE_4_0_SONNET'],
]
export function getOpenAICompatibleRegionForModel(
  model: string | undefined,
): string | undefined {
  if (model) {
    const match = VERTEX_REGION_OVERRIDES.find(([prefix]) =>
      model.startsWith(prefix),
    )
    if (match) {
      return process.env[match[1]] || getDefaultOpenAICompatibleRegion()
    }
  }
  return getDefaultOpenAICompatibleRegion()
}
