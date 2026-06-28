export type CachedMCConfig = {
  enabled: boolean
  supportedModels: string[]
  systemPromptSuggestSummaries: boolean
  keepRecent: number
  triggerThreshold: number
}
export function getCachedMCConfig(): CachedMCConfig {
  throw new Error('not implemented')
}
