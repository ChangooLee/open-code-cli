// Configuration for cached microcompaction ("function result clearing").

export type CachedMCConfig = {
  enabled: boolean
  /** Model name substrings this strategy is supported on. */
  supportedModels: string[]
  /** Whether the system prompt should instruct the model to summarize results. */
  systemPromptSuggestSummaries: boolean
  /** Number of most-recent tool results always kept in context. */
  keepRecent: number
  /** Active tool-result count at which compaction is triggered. */
  triggerThreshold: number
}

/** Resolve the effective cached-microcompaction config (feature gates + overrides). */
export function getCachedMCConfig(): CachedMCConfig {
  throw new Error('not implemented')
}
