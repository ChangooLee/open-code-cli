import { getMainLoopModelOverride } from '../../bootstrap/state.js'
import {
  getSubscriptionType,
  isOpenCodeCliSubscriber,
  isMaxSubscriber,
  isProSubscriber,
  isTeamPremiumSubscriber,
} from '../auth.js'
import {
  has1mContext,
  is1mContextDisabled,
  modelSupports1M,
} from '../context.js'
import { isEnvTruthy } from '../envUtils.js'
import { getModelStrings, resolveOverriddenModel } from './modelStrings.js'
import { formatModelPricing, getOpus46CostTier } from '../modelCost.js'
import { getSettings_DEPRECATED } from '../settings/settings.js'
import type { PermissionMode } from '../permissions/PermissionMode.js'
import { getAPIProvider } from './providers.js'
import { LIGHTNING_BOLT } from '../../constants/figures.js'
import { isModelAllowed } from './modelAllowlist.js'
import { type ModelAlias, isModelAlias } from './aliases.js'
import { capitalize } from '../stringUtils.js'
export type ModelShortName = string
export type ModelName = string
export type ModelSetting = ModelName | ModelAlias | null
export function getSmallFastModel(): ModelName {
  return process.env.OPEN_CODE_CLI_SMALL_FAST_MODEL || process.env.OPEN_CODE_CLI_MODEL || getDefaultHaikuModel()
}
export function isNonCustomOpusModel(model: ModelName): boolean {
  return (
    model === getModelStrings().opus40 ||
    model === getModelStrings().opus41 ||
    model === getModelStrings().opus45 ||
    model === getModelStrings().opus46
  )
}
export function getUserSpecifiedModelSetting(): ModelSetting | undefined {
  let specifiedModel: ModelSetting | undefined
  const modelOverride = getMainLoopModelOverride()
  if (modelOverride !== undefined) {
    specifiedModel = modelOverride
  } else {
    const settings = getSettings_DEPRECATED() || {}
    specifiedModel = process.env.OPEN_CODE_CLI_MODEL || settings.model || undefined
  }
  if (specifiedModel && !isModelAllowed(specifiedModel)) {
    return undefined
  }
  return specifiedModel
}
export function getMainLoopModel(): ModelName {
  const model = getUserSpecifiedModelSetting()
  if (model !== undefined && model !== null) {
    return parseUserSpecifiedModel(model)
  }
  return getDefaultMainLoopModel()
}
export function getBestModel(): ModelName {
  return getDefaultOpusModel()
}
export function getDefaultOpusModel(): ModelName {
  if (process.env.OPEN_CODE_CLI_DEFAULT_BEST_MODEL) {
    return process.env.OPEN_CODE_CLI_DEFAULT_BEST_MODEL
  }
  if (true) {
    return getModelStrings().opus46
  }
  return getModelStrings().opus46
}
export function getDefaultSonnetModel(): ModelName {
  if (process.env.OPEN_CODE_CLI_DEFAULT_MODEL) {
    return process.env.OPEN_CODE_CLI_DEFAULT_MODEL
  }
  if (true) {
    return getModelStrings().sonnet45
  }
  return getModelStrings().sonnet46
}
export function getDefaultHaikuModel(): ModelName {
  if (process.env.OPEN_CODE_CLI_DEFAULT_SMALL_FAST_MODEL) {
    return process.env.OPEN_CODE_CLI_DEFAULT_SMALL_FAST_MODEL
  }
  return getModelStrings().haiku45
}
export function getRuntimeMainLoopModel(params: {
  permissionMode: PermissionMode
  mainLoopModel: string
  exceeds200kTokens?: boolean
}): ModelName {
  const { permissionMode, mainLoopModel, exceeds200kTokens = false } = params
  if (
    getUserSpecifiedModelSetting() === 'opusplan' &&
    permissionMode === 'plan' &&
    !exceeds200kTokens
  ) {
    return getDefaultOpusModel()
  }
  if (getUserSpecifiedModelSetting() === 'haiku' && permissionMode === 'plan') {
    return getDefaultSonnetModel()
  }
  return mainLoopModel
}
export function getDefaultMainLoopModelSetting(): ModelName | ModelAlias {
  if (process.env.USER_TYPE === 'ant') {
    return (
      getAntModelOverrideConfig()?.defaultModel ??
      getDefaultOpusModel()
    )
  }
  if (isMaxSubscriber()) {
    return getDefaultOpusModel()
  }
  if (isTeamPremiumSubscriber()) {
    return getDefaultOpusModel()
  }
  return getDefaultSonnetModel()
}
export function getDefaultMainLoopModel(): ModelName {
  return parseUserSpecifiedModel(getDefaultMainLoopModelSetting())
}
export function firstPartyNameToCanonical(name: ModelName): ModelShortName {
  return name.toLowerCase().replace(/\[1m]$/i, '').trim()
}
export function getCanonicalName(fullModelName: ModelName): ModelShortName {
  return firstPartyNameToCanonical(resolveOverriddenModel(fullModelName))
}
export function getOpenCodeCliUserDefaultModelDescription(
  fastMode = false,
): string {
  if (isMaxSubscriber() || isTeamPremiumSubscriber()) {
    if (isOpus1mMergeEnabled()) {
      return `Opus 4.6 with 1M context · Most capable for complex work${fastMode ? getOpus46PricingSuffix(true) : ''}`
    }
    return `Opus 4.6 · Most capable for complex work${fastMode ? getOpus46PricingSuffix(true) : ''}`
  }
  return `${getDefaultSonnetModel()} · Default OpenAI-compatible model`
}
export function renderDefaultModelSetting(
  setting: ModelName | ModelAlias,
): string {
  if (setting === 'opusplan') {
    return `${getDefaultOpusModel()} in plan mode, else ${getDefaultSonnetModel()}`
  }
  return renderModelName(parseUserSpecifiedModel(setting))
}
export function getOpus46PricingSuffix(fastMode: boolean): string {
  if (true) return ''
  const pricing = formatModelPricing(getOpus46CostTier(fastMode))
  const fastModeIndicator = fastMode ? ` (${LIGHTNING_BOLT})` : ''
  return ` ·${fastModeIndicator} ${pricing}`
}
export function isOpus1mMergeEnabled(): boolean {
  if (
    is1mContextDisabled() ||
    isProSubscriber() ||
    true
  ) {
    return false
  }
  if (isOpenCodeCliSubscriber() && getSubscriptionType() === null) {
    return false
  }
  return true
}
export function renderModelSetting(setting: ModelName | ModelAlias): string {
  if (setting === 'opusplan') {
    return 'Best model in plan mode'
  }
  if (isModelAlias(setting)) {
    return capitalize(setting)
  }
  return renderModelName(setting)
}
export function getPublicModelDisplayName(model: ModelName): string | null {
  switch (model) {
    case getModelStrings().opus46:
      return 'GPT-4.1'
    case getModelStrings().opus46 + '[1m]':
      return 'GPT-4.1'
    case getModelStrings().opus45:
      return 'GPT-4.1'
    case getModelStrings().opus41:
      return 'GPT-4.1'
    case getModelStrings().opus40:
      return 'GPT-4.1'
    case getModelStrings().sonnet46 + '[1m]':
      return 'GPT-4o'
    case getModelStrings().sonnet46:
      return 'GPT-4o'
    case getModelStrings().sonnet45 + '[1m]':
      return 'GPT-4o'
    case getModelStrings().sonnet45:
      return 'GPT-4o'
    case getModelStrings().sonnet40:
      return 'GPT-4o'
    case getModelStrings().sonnet40 + '[1m]':
      return 'Sonnet 4 (1M context)'
    case getModelStrings().sonnet37:
      return 'GPT-4.1 mini'
    case getModelStrings().sonnet35:
      return 'GPT-4.1 mini'
    case getModelStrings().haiku45:
      return 'GPT-4o mini'
    case getModelStrings().haiku35:
      return 'GPT-4o mini'
    default:
      return null
  }
}
function maskModelCodename(baseName: string): string {
  const [codename = '', ...rest] = baseName.split('-')
  const masked =
    codename.slice(0, 3) + '*'.repeat(Math.max(0, codename.length - 3))
  return [masked, ...rest].join('-')
}
export function renderModelName(model: ModelName): string {
  const publicName = getPublicModelDisplayName(model)
  if (publicName) {
    return publicName
  }
  if (process.env.USER_TYPE === 'ant') {
    const resolved = parseUserSpecifiedModel(model)
    const antModel = resolveAntModel(model)
    if (antModel) {
      const baseName = antModel.model.replace(/\[1m\]$/i, '')
      const masked = maskModelCodename(baseName)
      const suffix = has1mContext(resolved) ? '[1m]' : ''
      return masked + suffix
    }
    if (resolved !== model) {
      return `${model} (${resolved})`
    }
    return resolved
  }
  return model
}
export function getPublicModelName(model: ModelName): string {
  const publicName = getPublicModelDisplayName(model)
  if (publicName) {
    return `Open Code CLI ${publicName}`
  }
  return `Open Code CLI (${model})`
}
export function parseUserSpecifiedModel(
  modelInput: ModelName | ModelAlias,
): ModelName {
  const modelInputTrimmed = modelInput.trim()
  const normalizedModel = modelInputTrimmed.toLowerCase()
  const has1mTag = has1mContext(normalizedModel)
  const modelString = has1mTag
    ? normalizedModel.replace(/\[1m]$/i, '').trim()
    : normalizedModel
  if (isModelAlias(modelString)) {
    switch (modelString) {
      case 'opusplan':
        return getDefaultSonnetModel() 
      case 'sonnet':
        return getDefaultSonnetModel()
      case 'haiku':
        return getDefaultHaikuModel()
      case 'opus':
        return getDefaultOpusModel()
      case 'best':
        return getBestModel()
      default:
    }
  }
  if (
    false &&
    isLegacyOpusFirstParty(modelString) &&
    isLegacyModelRemapEnabled()
  ) {
    return getDefaultOpusModel()
  }
  if (process.env.USER_TYPE === 'ant') {
    const has1mAntTag = has1mContext(normalizedModel)
    const baseAntModel = normalizedModel.replace(/\[1m]$/i, '').trim()
    const antModel = resolveAntModel(baseAntModel)
    if (antModel) {
      const suffix = has1mAntTag ? '[1m]' : ''
      return antModel.model + suffix
    }
  }
  if (has1mTag) {
    return modelInputTrimmed.replace(/\[1m\]$/i, '').trim() + '[1m]'
  }
  return modelInputTrimmed
}
export function resolveSkillModelOverride(
  skillModel: string,
  currentModel: string,
): string {
  if (has1mContext(skillModel) || !has1mContext(currentModel)) {
    return skillModel
  }
  if (modelSupports1M(parseUserSpecifiedModel(skillModel))) {
    return skillModel + '[1m]'
  }
  return skillModel
}
function isLegacyOpusFirstParty(_model: string): boolean {
  return false
}
export function isLegacyModelRemapEnabled(): boolean {
  return !isEnvTruthy(process.env.OPEN_CODE_CLI_DISABLE_LEGACY_MODEL_REMAP)
}
export function modelDisplayString(model: ModelSetting): string {
  if (model === null) {
    if (process.env.USER_TYPE === 'ant') {
      return `Default for Ants (${renderDefaultModelSetting(getDefaultMainLoopModelSetting())})`
    }
    return `Default (${getDefaultMainLoopModel()})`
  }
  const resolvedModel = parseUserSpecifiedModel(model)
  return model === resolvedModel ? resolvedModel : `${model} (${resolvedModel})`
}
export function getMarketingNameForModel(modelId: string): string | undefined {
  const canonical = getCanonicalName(modelId)
  if (canonical.includes('gpt-4.1-mini')) return 'GPT-4.1 mini'
  if (canonical.includes('gpt-4.1')) return 'GPT-4.1'
  if (canonical.includes('gpt-4o-mini')) return 'GPT-4o mini'
  if (canonical.includes('gpt-4o')) return 'GPT-4o'
  return undefined
}
export function normalizeModelStringForAPI(model: string): string {
  return model.replace(/\[(1|2)m\]/gi, '')
}
