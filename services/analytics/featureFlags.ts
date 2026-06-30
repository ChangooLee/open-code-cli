import { isEqual, memoize } from 'lodash-es'
import {
  getIsNonInteractiveSession,
  getSessionTrustAccepted,
} from '../../bootstrap/state.js'
import { getFeatureFlagsClientKey } from '../../constants/keys.js'
import {
  checkHasTrustDialogAccepted,
  getGlobalConfig,
  saveGlobalConfig,
} from '../../utils/config.js'
import { logForDebugging } from '../../utils/debug.js'
import { toError } from '../../utils/errors.js'
import { logError } from '../../utils/log.js'
import { createSignal } from '../../utils/signal.js'
import { jsonStringify } from '../../utils/slowOperations.js'
import {
  type GitHubActionsMetadata,
  getUserForFeatureFlags,
} from '../../utils/user.js'
import { is1PEventLoggingEnabled, logFeatureFlagsExperimentTo1P } from './firstPartyEventLogger.js'

export type FeatureFlagsUserAttributes = {
  id: string
  sessionId: string
  deviceID: string
  platform: 'win32' | 'darwin' | 'linux'
  apiBaseUrlHost?: string
  organizationUUID?: string
  accountUUID?: string
  userType?: string
  subscriptionType?: string
  rateLimitTier?: string
  firstTokenTime?: number
  email?: string
  appVersion?: string
  github?: GitHubActionsMetadata
}

type FeatureFlagsRefreshListener = () => void | Promise<void>
const refreshed = createSignal()

function callSafe(listener: FeatureFlagsRefreshListener): void {
  try {
    void Promise.resolve(listener()).catch(e => {
      logError(e)
    })
  } catch (e) {
    logError(e)
  }
}

export function onFeatureFlagsRefresh(listener: FeatureFlagsRefreshListener): () => void {
  return refreshed.subscribe(() => callSafe(listener))
}

let envOverrides: Record<string, unknown> | null = null
let envOverridesParsed = false

function getEnvOverrides(): Record<string, unknown> | null {
  if (!envOverridesParsed) {
    envOverridesParsed = true
    if (process.env.USER_TYPE === 'ant') {
      const raw = process.env.OPEN_CODE_INTERNAL_FC_OVERRIDES
      if (raw) {
        try {
          envOverrides = JSON.parse(raw) as Record<string, unknown>
          logForDebugging(
            `FeatureFlags: Using env var overrides for ${Object.keys(envOverrides!).length} features: ${Object.keys(envOverrides!).join(', ')}`,
          )
        } catch {
          logError(new Error(`FeatureFlags: Failed to parse OPEN_CODE_INTERNAL_FC_OVERRIDES: ${raw}`))
        }
      }
    }
  }
  return envOverrides
}

export function hasFeatureFlagsEnvOverride(feature: string): boolean {
  const overrides = getEnvOverrides()
  return overrides !== null && feature in overrides
}

function getConfigOverrides(): Record<string, unknown> | undefined {
  if (process.env.USER_TYPE !== 'ant') return undefined
  try {
    return getGlobalConfig().featureFlagsOverrides
  } catch {
    return undefined
  }
}

export function getAllFeatureFlagsFeatures(): Record<string, unknown> {
  return getGlobalConfig().cachedFeatureFlagsFeatures ?? {}
}

export function getFeatureFlagsConfigOverrides(): Record<string, unknown> {
  return getConfigOverrides() ?? {}
}

export function setFeatureFlagsConfigOverride(feature: string, value: unknown): void {
  if (process.env.USER_TYPE !== 'ant') return
  try {
    saveGlobalConfig(c => {
      const current = c.featureFlagsOverrides ?? {}
      if (value === undefined) {
        if (!(feature in current)) return c
        const { [feature]: _, ...rest } = current
        if (Object.keys(rest).length === 0) {
          const { featureFlagsOverrides: __, ...configWithout } = c
          return configWithout
        }
        return { ...c, featureFlagsOverrides: rest }
      }
      if (isEqual(current[feature], value)) return c
      return { ...c, featureFlagsOverrides: { ...current, [feature]: value } }
    })
    refreshed.emit()
  } catch (e) {
    logError(e)
  }
}

export function clearFeatureFlagsConfigOverrides(): void {
  if (process.env.USER_TYPE !== 'ant') return
  try {
    saveGlobalConfig(c => {
      if (!c.featureFlagsOverrides || Object.keys(c.featureFlagsOverrides).length === 0) {
        return c
      }
      const { featureFlagsOverrides: _, ...rest } = c
      return rest
    })
    refreshed.emit()
  } catch (e) {
    logError(e)
  }
}

export function getApiBaseUrlHost(): string | undefined {
  try {
    const base = process.env.OPEN_CODE_CLI_BASE_URL
    if (!base) return undefined
    return new URL(base).host
  } catch {
    return undefined
  }
}

function isFeatureFlagsEnabled(): boolean {
  return Boolean(getFeatureFlagsClientKey())
}

function resolveFeatureValue<T>(feature: string, defaultValue: T): T {
  const overrides = getEnvOverrides()
  if (overrides && feature in overrides) {
    return overrides[feature] as T
  }
  const configOverrides = getConfigOverrides()
  if (configOverrides && feature in configOverrides) {
    return configOverrides[feature] as T
  }
  if (!isFeatureFlagsEnabled()) {
    return defaultValue
  }
  try {
    const cached = getGlobalConfig().cachedFeatureFlagsFeatures?.[feature]
    return cached !== undefined ? (cached as T) : defaultValue
  } catch {
    return defaultValue
  }
}

export const initializeFeatureFlags = memoize(async (): Promise<null> => {
  if (!isFeatureFlagsEnabled()) return null
  if (process.env.USER_TYPE === 'ant') {
    logForDebugging('FeatureFlags: initialized (local cache only)')
  }
  return null
})

export async function getFeatureValue_DEPRECATED<T>(feature: string, defaultValue: T): Promise<T> {
  return resolveFeatureValue(feature, defaultValue)
}

export function getFeatureValue_CACHED_MAY_BE_STALE<T>(feature: string, defaultValue: T): T {
  return resolveFeatureValue(feature, defaultValue)
}

export function getFeatureValue_CACHED_WITH_REFRESH<T>(
  feature: string,
  defaultValue: T,
  _refreshIntervalMs: number,
): T {
  return resolveFeatureValue(feature, defaultValue)
}

export function checkStatsigFeatureGate_CACHED_MAY_BE_STALE(gate: string): boolean {
  const value = resolveFeatureValue(gate, false)
  return Boolean(value)
}

export async function checkSecurityRestrictionGate(gate: string): Promise<boolean> {
  return checkStatsigFeatureGate_CACHED_MAY_BE_STALE(gate)
}

export async function checkGate_CACHED_OR_BLOCKING(gate: string): Promise<boolean> {
  return checkStatsigFeatureGate_CACHED_MAY_BE_STALE(gate)
}

export function refreshFeatureFlagsAfterAuthChange(): void {
  if (!isFeatureFlagsEnabled()) return
  try {
    resetFeatureFlagsClient()
    refreshed.emit()
    void initializeFeatureFlags()
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      throw error
    }
    logError(toError(error))
  }
}

export function resetFeatureFlagsClient(): void {
  initializeFeatureFlags.cache?.clear?.()
  envOverrides = null
  envOverridesParsed = false
}

export async function refreshFeatureFlagsClientFeatures(): Promise<void> {
  if (!isFeatureFlagsEnabled()) return
  refreshed.emit()
}

export function setupPeriodicFeatureFlagsClientRefresh(): void {}

export function stopPeriodicFeatureFlagsClientRefresh(): void {}

export async function getDynamicConfig_BLOCKS_ON_INIT<T>(
  configName: string,
  defaultValue: T,
): Promise<T> {
  return resolveFeatureValue(configName, defaultValue)
}

export function getDynamicConfig_CACHED_MAY_BE_STALE<T>(
  configName: string,
  defaultValue: T,
): T {
  return resolveFeatureValue(configName, defaultValue)
}

export function getUserAttributes(): FeatureFlagsUserAttributes {
  return getUserForFeatureFlags()
}

export function logFeatureFlagsExposure(_feature: string): void {
  if (!is1PEventLoggingEnabled()) return
  logFeatureFlagsExperimentTo1P({
    experimentId: 'local',
    variationId: 0,
    userAttributes: getUserAttributes(),
    experimentMetadata: { feature_id: _feature },
  })
}
