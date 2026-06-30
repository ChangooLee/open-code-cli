import { getMainLoopModelOverride } from '../../bootstrap/state.js'
import { getAntModelOverrideConfig, resolveAntModel } from './antModels.js'
import {
  getSubscriptionType,
  isOpenCodeCliSubscriber,
  isMaxSubscriber,
  isProSubscriber,
  isTeamPremiumSubscriber,
} from '../auth.js'
import {
  hasLongContext,
  isLongContextDisabled,
  modelSupportsLongContext,
} from '../context.js'
import { isEnvTruthy } from '../envUtils.js'
import { getModelStrings, resolveOverriddenModel } from './modelStrings.js'
import { formatModelPricing, getProCostTier } from '../modelCost.js'
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
  return process.env.OPEN_CODE_CLI_SMALL_FAST_MODEL || process.env.OPEN_CODE_CLI_MODEL || getDefaultFastModel()
}
export function isNonCustomProModel(model: ModelName): boolean {
  return (
    model === getModelStrings().pro40 ||
    model === getModelStrings().pro41 ||
    model === getModelStrings().pro45 ||
    model === getModelStrings().pro46
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
  return getDefaultProModel()
}
export function getDefaultProModel(): ModelName {
  if (process.env.OPEN_CODE_CLI_DEFAULT_BEST_MODEL) {
    return process.env.OPEN_CODE_CLI_DEFAULT_BEST_MODEL
  }
  if (true) {
    return getModelStrings().pro46
  }
  return getModelStrings().pro46
}
export function getDefaultStandardModel(): ModelName {
  if (process.env.OPEN_CODE_CLI_DEFAULT_MODEL) {
    return process.env.OPEN_CODE_CLI_DEFAULT_MODEL
  }
  if (true) {
    return getModelStrings().standard45
  }
  return getModelStrings().standard46
}
export function getDefaultFastModel(): ModelName {
  if (process.env.OPEN_CODE_CLI_DEFAULT_SMALL_FAST_MODEL) {
    return process.env.OPEN_CODE_CLI_DEFAULT_SMALL_FAST_MODEL
  }
  return getModelStrings().fast45
}
export function getRuntimeMainLoopModel(params: {
  permissionMode: PermissionMode
  mainLoopModel: string
  exceeds200kTokens?: boolean
}): ModelName {
  const { permissionMode, mainLoopModel, exceeds200kTokens = false } = params
  if (
    getUserSpecifiedModelSetting() === 'planExecute' &&
    permissionMode === 'plan' &&
    !exceeds200kTokens
  ) {
    return getDefaultProModel()
  }
  if (getUserSpecifiedModelSetting() === 'fast' && permissionMode === 'plan') {
    return getDefaultStandardModel()
  }
  return mainLoopModel
}
export function getDefaultMainLoopModelSetting(): ModelName | ModelAlias {
  if (process.env.USER_TYPE === 'ant') {
    return (
      getAntModelOverrideConfig()?.defaultModel ??
      getDefaultProModel()
    )
  }
  if (isMaxSubscriber()) {
    return getDefaultProModel()
  }
  if (isTeamPremiumSubscriber()) {
    return getDefaultProModel()
  }
  return getDefaultStandardModel()
}
export function getDefaultMainLoopModel(): ModelName {
  return parseUserSpecifiedModel(getDefaultMainLoopModelSetting())
}
export function firstPartyNameToCanonical(name: ModelName): ModelShortName {
  return name.toLowerCase().replace(/\-long$/i, '').trim()
}
export function getCanonicalName(fullModelName: ModelName): ModelShortName {
  return firstPartyNameToCanonical(resolveOverriddenModel(fullModelName))
}
export function getOpenCodeCliUserDefaultModelDescription(
  fastMode = false,
): string {
  if (isMaxSubscriber() || isTeamPremiumSubscriber()) {
    if (isLongContextMergeEnabled()) {
      return `GPT-4.1 with long context · Most capable for complex work${fastMode ? getProPricingSuffix(true) : ''}`
    }
    return `GPT-4.1 · Most capable for complex work${fastMode ? getProPricingSuffix(true) : ''}`
  }
  return `${getDefaultStandardModel()} · Default OpenAI-compatible model`
}
export function renderDefaultModelSetting(
  setting: ModelName | ModelAlias,
): string {
  if (setting === 'planExecute') {
    return `${getDefaultProModel()} in plan mode, else ${getDefaultStandardModel()}`
  }
  return renderModelName(parseUserSpecifiedModel(setting))
}
export function getProPricingSuffix(fastMode: boolean): string {
  if (true) return ''
  const pricing = formatModelPricing(getProCostTier(fastMode))
  const fastModeIndicator = fastMode ? ` (${LIGHTNING_BOLT})` : ''
  return ` ·${fastModeIndicator} ${pricing}`
}
export function isLongContextMergeEnabled(): boolean {
  if (
    isLongContextDisabled() ||
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
  if (setting === 'planExecute') {
    return 'Best model in plan mode'
  }
  if (isModelAlias(setting)) {
    return capitalize(setting)
  }
  return renderModelName(setting)
}
export function getPublicModelDisplayName(model: ModelName): string | null {
  switch (model) {
    case getModelStrings().pro46:
      return 'GPT-4.1'
    case getModelStrings().pro46 + '-long':
      return 'GPT-4.1'
    case getModelStrings().pro45:
      return 'GPT-4.1'
    case getModelStrings().pro41:
      return 'GPT-4.1'
    case getModelStrings().pro40:
      return 'GPT-4.1'
    case getModelStrings().standard46 + '-long':
      return 'GPT-4o'
    case getModelStrings().standard46:
      return 'GPT-4o'
    case getModelStrings().standard45 + '-long':
      return 'GPT-4o'
    case getModelStrings().standard45:
      return 'GPT-4o'
    case getModelStrings().standard40:
      return 'GPT-4o'
    case getModelStrings().standard40 + '-long':
      return 'GPT-4o (long context)'
    case getModelStrings().standard37:
      return 'GPT-4.1 mini'
    case getModelStrings().standard35:
      return 'GPT-4.1 mini'
    case getModelStrings().fast45:
      return 'GPT-4o mini'
    case getModelStrings().fast35:
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
      const suffix = hasLongContext(resolved) ? '-long' : ''
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
  const has1mTag = hasLongContext(normalizedModel)
  const modelString = has1mTag
    ? normalizedModel.replace(/\-long$/i, '').trim()
    : normalizedModel
  if (isModelAlias(modelString)) {
    switch (modelString) {
      case 'planExecute':
        return getDefaultStandardModel() 
      case 'standard':
        return getDefaultStandardModel()
      case 'fast':
        return getDefaultFastModel()
      case 'pro':
        return getDefaultProModel()
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
    return getDefaultProModel()
  }
  if (process.env.USER_TYPE === 'ant') {
    const has1mAntTag = hasLongContext(normalizedModel)
    const baseAntModel = normalizedModel.replace(/\-long$/i, '').trim()
    const antModel = resolveAntModel(baseAntModel)
    if (antModel) {
      const suffix = has1mAntTag ? '-long' : ''
      return antModel.model + suffix
    }
  }
  if (has1mTag) {
    return modelInputTrimmed.replace(/\[1m\]$/i, '').trim() + '-long'
  }
  return modelInputTrimmed
}
export function resolveSkillModelOverride(
  skillModel: string,
  currentModel: string,
): string {
  if (hasLongContext(skillModel) || !hasLongContext(currentModel)) {
    return skillModel
  }
  if (modelSupportsLongContext(parseUserSpecifiedModel(skillModel))) {
    return skillModel + '-long'
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
