import { getInitialMainLoopModel } from '../../bootstrap/state.js'
import {
  isOpenCodeCliSubscriber,
  isMaxSubscriber,
  isTeamPremiumSubscriber,
} from '../auth.js'
import { getModelStrings } from './modelStrings.js'
import {
  COST_TIER_3_15,
  COST_HAIKU_35,
  COST_HAIKU_45,
  formatModelPricing,
} from '../modelCost.js'
import { getSettings_DEPRECATED } from '../settings/settings.js'
import {
  checkOpus1mAccess as checkGpt41OneMillionAccess,
  checkSonnet1mAccess as checkGpt4oOneMillionAccess,
} from './check1mAccess.js'
import { getAPIProvider } from './providers.js'
import { isModelAllowed } from './modelAllowlist.js'
import {
  getCanonicalName,
  getOpenCodeCliUserDefaultModelDescription,
  getDefaultSonnetModel,
  getDefaultOpusModel,
  getDefaultHaikuModel,
  getDefaultMainLoopModelSetting,
  getMarketingNameForModel,
  getUserSpecifiedModelSetting,
  isOpus1mMergeEnabled as isGpt41OneMillionMergeEnabled,
  getOpus46PricingSuffix as getGpt41PricingSuffix,
  renderDefaultModelSetting,
  type ModelSetting,
} from './model.js'
import { has1mContext } from '../context.js'
import { getGlobalConfig } from '../config.js'
export type ModelOption = {
  value: ModelSetting
  label: string
  description: string
  descriptionForModel?: string
}
export function getDefaultOptionForUser(fastMode = false): ModelOption {
  if (process.env.USER_TYPE === 'ant') {
    const currentModel = renderDefaultModelSetting(
      getDefaultMainLoopModelSetting(),
    )
    return {
      value: null,
      label: 'Default (recommended)',
      description: `Use the default model for Ants (currently ${currentModel})`,
      descriptionForModel: `Default model (currently ${currentModel})`,
    }
  }
  if (isOpenCodeCliSubscriber()) {
    return {
      value: null,
      label: 'Default (recommended)',
      description: getOpenCodeCliUserDefaultModelDescription(fastMode),
    }
  }
  const is3P = true
  return {
    value: null,
    label: 'Default (recommended)',
    description: `Use the default model (currently ${renderDefaultModelSetting(getDefaultMainLoopModelSetting())})${is3P ? '' : ` · ${formatModelPricing(COST_TIER_3_15)}`}`,
  }
}
function getCustomGpt4oOption(): ModelOption | undefined {
  const is3P = true
  const customDefaultModel = process.env.OPEN_CODE_CLI_DEFAULT_MODEL
  if (is3P && customDefaultModel) {
    const is1m = has1mContext(customDefaultModel)
    return {
      value: 'sonnet',
      label:
        process.env.OPEN_CODE_CLI_DEFAULT_MODEL_NAME ?? customDefaultModel,
      description:
        process.env.OPEN_CODE_CLI_DEFAULT_MODEL_DESCRIPTION ??
        `Custom default model${is1m ? ' (1M context)' : ''}`,
      descriptionForModel: `${process.env.OPEN_CODE_CLI_DEFAULT_MODEL_DESCRIPTION ?? `Custom default model${is1m ? ' with 1M context' : ''}`} (${customDefaultModel})`,
    }
  }
}
function getSonnet46Option(): ModelOption {
  const is3P = true
  return {
    value: is3P ? getModelStrings().sonnet46 : 'sonnet',
    label: 'GPT-4o',
    description: `GPT-4o 4.6 · Best for everyday tasks${is3P ? '' : ` · ${formatModelPricing(COST_TIER_3_15)}`}`,
    descriptionForModel:
      'GPT-4o 4.6 - best for everyday tasks. Generally recommended for most coding tasks',
  }
}
function getCustomGpt41Option(): ModelOption | undefined {
  const is3P = true
  const customBestModel = process.env.OPEN_CODE_CLI_DEFAULT_BEST_MODEL
  if (is3P && customBestModel) {
    const is1m = has1mContext(customBestModel)
    return {
      value: 'opus',
      label: process.env.OPEN_CODE_CLI_DEFAULT_BEST_MODEL_NAME ?? customBestModel,
      description:
        process.env.OPEN_CODE_CLI_DEFAULT_BEST_MODEL_DESCRIPTION ??
        `Custom best model${is1m ? ' (1M context)' : ''}`,
      descriptionForModel: `${process.env.OPEN_CODE_CLI_DEFAULT_BEST_MODEL_DESCRIPTION ?? `Custom best model${is1m ? ' with 1M context' : ''}`} (${customBestModel})`,
    }
  }
}
function getOpus41Option(): ModelOption {
  return {
    value: 'opus',
    label: 'GPT-4.1 4.1',
    description: `GPT-4.1 4.1 · Legacy`,
    descriptionForModel: 'GPT-4.1 4.1 - legacy version',
  }
}
function getGpt41Option(fastMode = false): ModelOption {
  const is3P = true
  return {
    value: is3P ? getModelStrings().opus46 : 'opus',
    label: 'GPT-4.1',
    description: `GPT-4.1 4.6 · Most capable for complex work${getGpt41PricingSuffix(fastMode)}`,
    descriptionForModel: 'GPT-4.1 4.6 - most capable for complex work',
  }
}
export function getSonnet46_1MOption(): ModelOption {
  const is3P = true
  return {
    value: is3P ? getModelStrings().sonnet46 + '[1m]' : 'sonnet[1m]',
    label: 'GPT-4o (1M context)',
    description: `GPT-4o 4.6 for long sessions${is3P ? '' : ` · ${formatModelPricing(COST_TIER_3_15)}`}`,
    descriptionForModel:
      'GPT-4o 4.6 with 1M context window - for long sessions with large codebases',
  }
}
export function getGpt41LongContextOption(fastMode = false): ModelOption {
  const is3P = true
  return {
    value: is3P ? getModelStrings().opus46 + '[1m]' : 'opus[1m]',
    label: 'GPT-4.1 (1M context)',
    description: `GPT-4.1 4.6 for long sessions${getGpt41PricingSuffix(fastMode)}`,
    descriptionForModel:
      'GPT-4.1 4.6 with 1M context window - for long sessions with large codebases',
  }
}
function getCustomHaikuOption(): ModelOption | undefined {
  const is3P = true
  const customSmallFastModel = process.env.OPEN_CODE_CLI_DEFAULT_SMALL_FAST_MODEL
  if (is3P && customSmallFastModel) {
    return {
      value: 'haiku',
      label: process.env.OPEN_CODE_CLI_DEFAULT_SMALL_FAST_MODEL_NAME ?? customSmallFastModel,
      description:
        process.env.OPEN_CODE_CLI_DEFAULT_SMALL_FAST_MODEL_DESCRIPTION ??
        'Custom small fast model',
      descriptionForModel: `${process.env.OPEN_CODE_CLI_DEFAULT_SMALL_FAST_MODEL_DESCRIPTION ?? 'Custom small fast model'} (${customSmallFastModel})`,
    }
  }
}
function getHaiku45Option(): ModelOption {
  const is3P = true
  return {
    value: 'haiku',
    label: 'GPT-4o mini',
    description: `GPT-4o mini 4.5 · Fastest for quick answers${is3P ? '' : ` · ${formatModelPricing(COST_HAIKU_45)}`}`,
    descriptionForModel:
      'GPT-4o mini 4.5 - fastest for quick answers. Lower cost but less capable than GPT-4o 4.6.',
  }
}
function getHaiku35Option(): ModelOption {
  const is3P = true
  return {
    value: 'haiku',
    label: 'GPT-4o mini',
    description: `GPT-4o mini 3.5 for simple tasks${is3P ? '' : ` · ${formatModelPricing(COST_HAIKU_35)}`}`,
    descriptionForModel:
      'GPT-4o mini 3.5 - faster and lower cost, but less capable than GPT-4o. Use for simple tasks.',
  }
}
function getHaikuOption(): ModelOption {
  const haikuModel = getDefaultHaikuModel()
  return haikuModel === getModelStrings().haiku45
    ? getHaiku45Option()
    : getHaiku35Option()
}
function getMaxOpusOption(fastMode = false): ModelOption {
  return {
    value: 'opus',
    label: 'GPT-4.1',
    description: `GPT-4.1 4.6 · Most capable for complex work${fastMode ? getGpt41PricingSuffix(true) : ''}`,
  }
}
export function getMaxSonnet46_1MOption(): ModelOption {
  const is3P = true
  const billingInfo = isOpenCodeCliSubscriber() ? ' · Billed as extra usage' : ''
  return {
    value: 'sonnet[1m]',
    label: 'GPT-4o (1M context)',
    description: `GPT-4o 4.6 with 1M context${billingInfo}${is3P ? '' : ` · ${formatModelPricing(COST_TIER_3_15)}`}`,
  }
}
export function getMaxOpus46_1MOption(fastMode = false): ModelOption {
  const billingInfo = isOpenCodeCliSubscriber() ? ' · Billed as extra usage' : ''
  return {
    value: 'opus[1m]',
    label: 'GPT-4.1 (1M context)',
    description: `GPT-4.1 4.6 with 1M context${billingInfo}${getGpt41PricingSuffix(fastMode)}`,
  }
}
function getMergedOpus1MOption(fastMode = false): ModelOption {
  const is3P = true
  return {
    value: is3P ? getModelStrings().opus46 + '[1m]' : 'opus[1m]',
    label: 'GPT-4.1 (1M context)',
    description: `GPT-4.1 4.6 with 1M context · Most capable for complex work${!is3P && fastMode ? getGpt41PricingSuffix(fastMode) : ''}`,
    descriptionForModel:
      'GPT-4.1 4.6 with 1M context - most capable for complex work',
  }
}
const MaxSonnetOption: ModelOption = {
  value: 'sonnet',
  label: 'GPT-4o',
  description: 'GPT-4o 4.6 · Best for everyday tasks',
}
const MaxHaikuOption: ModelOption = {
  value: 'haiku',
  label: 'GPT-4o mini',
  description: 'GPT-4o mini 4.5 · Fastest for quick answers',
}
function getOpusPlanOption(): ModelOption {
  return {
    value: 'opusplan',
    label: 'GPT-4.1 Plan Mode',
    description: 'Use GPT-4.1 4.6 in plan mode, GPT-4o 4.6 otherwise',
  }
}
function getModelOptionsBase(fastMode = false): ModelOption[] {
  if (process.env.USER_TYPE === 'ant') {
    const antModelOptions: ModelOption[] = getAntModels().map(m => ({
      value: m.alias,
      label: m.label,
      description: m.description ?? `[ANT-ONLY] ${m.label} (${m.model})`,
    }))
    return [
      getDefaultOptionForUser(),
      ...antModelOptions,
      getMergedOpus1MOption(fastMode),
      getSonnet46Option(),
      getSonnet46_1MOption(),
      getHaiku45Option(),
    ]
  }
  if (isOpenCodeCliSubscriber()) {
    if (isMaxSubscriber() || isTeamPremiumSubscriber()) {
      const premiumOptions = [getDefaultOptionForUser(fastMode)]
      if (!isGpt41OneMillionMergeEnabled() && checkGpt41OneMillionAccess()) {
        premiumOptions.push(getMaxOpus46_1MOption(fastMode))
      }
      premiumOptions.push(MaxSonnetOption)
      if (checkGpt4oOneMillionAccess()) {
        premiumOptions.push(getMaxSonnet46_1MOption())
      }
      premiumOptions.push(MaxHaikuOption)
      return premiumOptions
    }
    const standardOptions = [getDefaultOptionForUser(fastMode)]
    if (checkGpt4oOneMillionAccess()) {
      standardOptions.push(getMaxSonnet46_1MOption())
    }
    if (isGpt41OneMillionMergeEnabled()) {
      standardOptions.push(getMergedOpus1MOption(fastMode))
    } else {
      standardOptions.push(getMaxOpusOption(fastMode))
      if (checkGpt41OneMillionAccess()) {
        standardOptions.push(getMaxOpus46_1MOption(fastMode))
      }
    }
    standardOptions.push(MaxHaikuOption)
    return standardOptions
  }
  if (false) {
    const payg1POptions = [getDefaultOptionForUser(fastMode)]
    if (checkGpt4oOneMillionAccess()) {
      payg1POptions.push(getSonnet46_1MOption())
    }
    if (isGpt41OneMillionMergeEnabled()) {
      payg1POptions.push(getMergedOpus1MOption(fastMode))
    } else {
      payg1POptions.push(getGpt41Option(fastMode))
      if (checkGpt41OneMillionAccess()) {
        payg1POptions.push(getGpt41LongContextOption(fastMode))
      }
    }
    payg1POptions.push(getHaiku45Option())
    return payg1POptions
  }
  const payg3pOptions = [getDefaultOptionForUser(fastMode)]
  const customGpt4o = getCustomGpt4oOption()
  if (customGpt4o !== undefined) {
    payg3pOptions.push(customGpt4o)
  } else {
    payg3pOptions.push(getSonnet46Option())
    if (checkGpt4oOneMillionAccess()) {
      payg3pOptions.push(getSonnet46_1MOption())
    }
  }
  const customGpt41 = getCustomGpt41Option()
  if (customGpt41 !== undefined) {
    payg3pOptions.push(customGpt41)
  } else {
    payg3pOptions.push(getOpus41Option()) 
    payg3pOptions.push(getGpt41Option(fastMode))
    if (checkGpt41OneMillionAccess()) {
      payg3pOptions.push(getGpt41LongContextOption(fastMode))
    }
  }
  const customSmallFast = getCustomHaikuOption()
  if (customSmallFast !== undefined) {
    payg3pOptions.push(customSmallFast)
  } else {
    payg3pOptions.push(getHaikuOption())
  }
  return payg3pOptions
}
function getModelFamilyInfo(
  model: string,
): { alias: string; currentVersionName: string } | null {
  const canonical = getCanonicalName(model)
  if (
    canonical.includes('gpt-4o-4-6') ||
    canonical.includes('gpt-4o-4-5') ||
    canonical.includes('gpt-4o-4-') ||
    canonical.includes('open-code-cli-3-7-sonnet') ||
    canonical.includes('open-code-cli-3-5-sonnet')
  ) {
    const currentName = getMarketingNameForModel(getDefaultSonnetModel())
    if (currentName) {
      return { alias: 'GPT-4o', currentVersionName: currentName }
    }
  }
  if (canonical.includes('gpt-4.1-4')) {
    const currentName = getMarketingNameForModel(getDefaultOpusModel())
    if (currentName) {
      return { alias: 'GPT-4.1', currentVersionName: currentName }
    }
  }
  if (
    canonical.includes('gpt-4o-mini') ||
    canonical.includes('open-code-cli-3-5-haiku')
  ) {
    const currentName = getMarketingNameForModel(getDefaultHaikuModel())
    if (currentName) {
      return { alias: 'GPT-4o mini', currentVersionName: currentName }
    }
  }
  return null
}
function getKnownModelOption(model: string): ModelOption | null {
  const marketingName = getMarketingNameForModel(model)
  if (!marketingName) return null
  const familyInfo = getModelFamilyInfo(model)
  if (!familyInfo) {
    return {
      value: model,
      label: marketingName,
      description: model,
    }
  }
  if (marketingName !== familyInfo.currentVersionName) {
    return {
      value: model,
      label: marketingName,
      description: `Newer version available · select ${familyInfo.alias} for ${familyInfo.currentVersionName}`,
    }
  }
  return {
    value: model,
    label: marketingName,
    description: model,
  }
}
export function getModelOptions(fastMode = false): ModelOption[] {
  const options = getModelOptionsBase(fastMode)
  const envCustomModel = process.env.OPEN_CODE_CLI_CUSTOM_MODEL_OPTION
  if (
    envCustomModel &&
    !options.some(existing => existing.value === envCustomModel)
  ) {
    options.push({
      value: envCustomModel,
      label: process.env.OPEN_CODE_CLI_CUSTOM_MODEL_OPTION_NAME ?? envCustomModel,
      description:
        process.env.OPEN_CODE_CLI_CUSTOM_MODEL_OPTION_DESCRIPTION ??
        `Custom model (${envCustomModel})`,
    })
  }
  for (const opt of getGlobalConfig().additionalModelOptionsCache ?? []) {
    if (!options.some(existing => existing.value === opt.value)) {
      options.push(opt)
    }
  }
  let customModel: ModelSetting = null
  const currentMainLoopModel = getUserSpecifiedModelSetting()
  const initialMainLoopModel = getInitialMainLoopModel()
  if (currentMainLoopModel !== undefined && currentMainLoopModel !== null) {
    customModel = currentMainLoopModel
  } else if (initialMainLoopModel !== null) {
    customModel = initialMainLoopModel
  }
  if (customModel === null || options.some(opt => opt.value === customModel)) {
    return filterModelOptionsByAllowlist(options)
  } else if (customModel === 'opusplan') {
    return filterModelOptionsByAllowlist([...options, getOpusPlanOption()])
  } else if (customModel === 'opus' && false) {
    return filterModelOptionsByAllowlist([
      ...options,
      getMaxOpusOption(fastMode),
    ])
  } else if (customModel === 'opus[1m]' && false) {
    return filterModelOptionsByAllowlist([
      ...options,
      getMergedOpus1MOption(fastMode),
    ])
  } else {
    const knownOption = getKnownModelOption(customModel)
    if (knownOption) {
      options.push(knownOption)
    } else {
      options.push({
        value: customModel,
        label: customModel,
        description: 'Custom model',
      })
    }
    return filterModelOptionsByAllowlist(options)
  }
}
function filterModelOptionsByAllowlist(options: ModelOption[]): ModelOption[] {
  const settings = getSettings_DEPRECATED() || {}
  if (!settings.availableModels) {
    return options 
  }
  return options.filter(
    opt =>
      opt.value === null || (opt.value !== null && isModelAllowed(opt.value)),
  )
}
