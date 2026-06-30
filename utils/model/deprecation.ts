import { type APIProvider, getAPIProvider } from './providers.js'
type DeprecatedModelInfo = {
  isDeprecated: true
  modelName: string
  retirementDate: string
}
type NotDeprecatedInfo = {
  isDeprecated: false
}
type DeprecationInfo = DeprecatedModelInfo | NotDeprecatedInfo
type DeprecationEntry = {
  modelName: string
  retirementDates: Record<APIProvider, string | null>
}
const DEPRECATED_MODELS: Record<string, DeprecationEntry> = {
  'open-code-cli-3-pro': {
    modelName: 'Open Code CLI 3 Pro',
    retirementDates: {
      chatCompletions: 'January 5, 2026',
    },
  },
  'open-code-cli-3-7-standard': {
    modelName: 'Open Code CLI 3.7 Standard',
    retirementDates: {
      chatCompletions: 'February 19, 2026',
    },
  },
  'open-code-cli-3-5-fast': {
    modelName: 'Open Code CLI 3.5 Fast',
    retirementDates: {
      chatCompletions: null,
    },
  },
}
function getDeprecatedModelInfo(modelId: string): DeprecationInfo {
  const lowercaseModelId = modelId.toLowerCase()
  const provider = getAPIProvider()
  for (const [key, value] of Object.entries(DEPRECATED_MODELS)) {
    const retirementDate = value.retirementDates[provider]
    if (!lowercaseModelId.includes(key) || !retirementDate) {
      continue
    }
    return {
      isDeprecated: true,
      modelName: value.modelName,
      retirementDate,
    }
  }
  return { isDeprecated: false }
}
export function getModelDeprecationWarning(
  modelId: string | null,
): string | null {
  if (!modelId) {
    return null
  }
  const info = getDeprecatedModelInfo(modelId)
  if (!info.isDeprecated) {
    return null
  }
  return `⚠ ${info.modelName} will be retired on ${info.retirementDate}. Consider switching to a newer model.`
}
