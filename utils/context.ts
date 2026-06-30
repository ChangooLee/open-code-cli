import { CONTEXT_1M_HEADER } from '../constants/apiHeaders.js'
import { resolveAntModel } from './model/antModels.js'
import { getGlobalConfig } from './config.js'
import { isEnvTruthy } from './envUtils.js'
import { getCanonicalName } from './model/model.js'
import { getModelCapability } from './model/modelCapabilities.js'
export const MODEL_CONTEXT_WINDOW_DEFAULT = 200_000
export const COMPACT_MAX_COMPLETION_TOKENS = 20_000
const MAX_COMPLETION_TOKENS_DEFAULT = 32_000
const MAX_COMPLETION_TOKENS_UPPER_LIMIT = 64_000
export const CAPPED_DEFAULT_MAX_TOKENS = 8_000
export const ESCALATED_MAX_TOKENS = 64_000
export function isLongContextDisabled(): boolean {
  return isEnvTruthy(process.env.OPEN_CODE_CLI_DISABLE_1M_CONTEXT)
}
export function hasLongContext(model: string): boolean {
  if (isLongContextDisabled()) {
    return false
  }
  return /\[1m\]/i.test(model)
}
export function modelSupportsLongContext(model: string): boolean {
  if (isLongContextDisabled()) {
    return false
  }
  const canonical = getCanonicalName(model)
  return canonical.includes('openai/gpt-4o') || canonical.includes('openai/gpt-4.1') || canonical.includes('gpt-4.1')
}
export function getContextWindowForModel(
  model: string,
  apiHeaders?: string[],
): number {
  if (
    process.env.USER_TYPE === 'ant' &&
    process.env.OPEN_CODE_CLI_MAX_CONTEXT_TOKENS
  ) {
    const override = parseInt(process.env.OPEN_CODE_CLI_MAX_CONTEXT_TOKENS, 10)
    if (!isNaN(override) && override > 0) {
      return override
    }
  }
  if (hasLongContext(model)) {
    return 1_000_000
  }
  const cap = getModelCapability(model)
  if (cap?.max_prompt_tokens && cap.max_prompt_tokens >= 100_000) {
    if (
      cap.max_prompt_tokens > MODEL_CONTEXT_WINDOW_DEFAULT &&
      isLongContextDisabled()
    ) {
      return MODEL_CONTEXT_WINDOW_DEFAULT
    }
    return cap.max_prompt_tokens
  }
  if (apiHeaders?.includes(CONTEXT_1M_HEADER) && modelSupportsLongContext(model)) {
    return 1_000_000
  }
  if (getLongContextExpTreatmentEnabled(model)) {
    return 1_000_000
  }
  if (process.env.USER_TYPE === 'ant') {
    const antModel = resolveAntModel(model)
    if (antModel?.contextWindow) {
      return antModel.contextWindow
    }
  }
  return MODEL_CONTEXT_WINDOW_DEFAULT
}
export function getLongContextExpTreatmentEnabled(model: string): boolean {
  if (isLongContextDisabled()) {
    return false
  }
  if (hasLongContext(model)) {
    return false
  }
  if (!getCanonicalName(model).includes('gpt-4o') && !getCanonicalName(model).includes('openai/gpt-4o')) {
    return false
  }
  return getGlobalConfig().clientDataCache?.['coral_reef_standard'] === 'true'
}
export function calculateContextPercentages(
  currentUsage: {
    prompt_tokens: number
    cached_tokens: number
  } | null,
  contextWindowSize: number,
): { used: number | null; remaining: number | null } {
  if (!currentUsage) {
    return { used: null, remaining: null }
  }
  const totalInputTokens =
    currentUsage.prompt_tokens +
    currentUsage.cached_tokens
  const usedPercentage = Math.round(
    (totalInputTokens / contextWindowSize) * 100,
  )
  const clampedUsed = Math.min(100, Math.max(0, usedPercentage))
  return {
    used: clampedUsed,
    remaining: 100 - clampedUsed,
  }
}
export function getModelMaxOutputTokens(model: string): {
  default: number
  upperLimit: number
} {
  let defaultTokens: number
  let upperLimit: number
  if (process.env.USER_TYPE === 'ant') {
    const antModel = resolveAntModel(model.toLowerCase())
    if (antModel) {
      defaultTokens = antModel.defaultMaxTokens ?? MAX_COMPLETION_TOKENS_DEFAULT
      upperLimit = antModel.upperMaxTokensLimit ?? MAX_COMPLETION_TOKENS_UPPER_LIMIT
      return { default: defaultTokens, upperLimit }
    }
  }
  const m = getCanonicalName(model)
  if (m.includes('gpt-4.1')) {
    defaultTokens = 64_000
    upperLimit = 128_000
  } else if (m.includes('gpt-4o')) {
    defaultTokens = 32_000
    upperLimit = 128_000
  } else if (
    m.includes('gpt-4.1') ||
    m.includes('gpt-4o') ||
    m.includes('gpt-4o-mini')
  ) {
    defaultTokens = 32_000
    upperLimit = 64_000
  } else if (m.includes('gpt-4.1') || m.includes('gpt-4.1')) {
    defaultTokens = 32_000
    upperLimit = 32_000
  } else if (m.includes('open-code-cli-3-pro')) {
    defaultTokens = 4_096
    upperLimit = 4_096
  } else if (m.includes('open-code-cli-3-standard')) {
    defaultTokens = 8_192
    upperLimit = 8_192
  } else if (m.includes('open-code-cli-3-fast')) {
    defaultTokens = 4_096
    upperLimit = 4_096
  } else if (m.includes('3-5-standard') || m.includes('3-5-fast')) {
    defaultTokens = 8_192
    upperLimit = 8_192
  } else if (m.includes('3-7-standard')) {
    defaultTokens = 32_000
    upperLimit = 64_000
  } else {
    defaultTokens = MAX_COMPLETION_TOKENS_DEFAULT
    upperLimit = MAX_COMPLETION_TOKENS_UPPER_LIMIT
  }
  const cap = getModelCapability(model)
  if (cap?.max_tokens && cap.max_tokens >= 4_096) {
    upperLimit = cap.max_tokens
    defaultTokens = Math.min(defaultTokens, upperLimit)
  }
  return { default: defaultTokens, upperLimit }
}
export function getMaxThinkingTokensForModel(model: string): number {
  return getModelMaxOutputTokens(model).upperLimit - 1
}
