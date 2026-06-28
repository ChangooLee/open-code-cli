// Cached microcompaction: clears old tool results from context using the
// provider's cache-editing beta when the active model supports it.
export { getCachedMCConfig, type CachedMCConfig } from './cachedMCConfig.js'

/** Whether cached microcompaction is enabled (feature gate + override). */
export function isCachedMicrocompactEnabled(): boolean {
  return false
}

/** Whether the given model supports the cache-editing beta. */
export function isModelSupportedForCacheEditing(_model: string): boolean {
  return false
}

// ---------------------------------------------------------------------------
// Cached-microcompaction state (ant-only; only exercised behind
// feature('CACHED_MICROCOMPACT')). Shapes mirror how services/compact/
// microCompact.ts and services/api/provider.ts consume them.
// ---------------------------------------------------------------------------

/** A queued cache_edits block describing tool results to delete server-side. */
export type CacheEditsBlock = {
  type: 'cache_edits'
  edits: { type: 'delete'; cache_reference: string }[]
}

/** A cache_edits block pinned to a specific user message position. */
export type PinnedCacheEdits = {
  userMessageIndex: number
  block: CacheEditsBlock
}

/** Mutable per-session state tracking tool results and queued cache edits. */
export type CachedMCState = {
  /** Tool-use IDs that have a registered (compactable) result. */
  registeredTools: Set<string>
  /** Tool-use IDs in registration order (oldest first). */
  toolOrder: string[]
  /** Tool-use IDs already sent to the API (eligible for deletion). */
  sentTools: Set<string>
  /** Cache references already deleted. */
  deletedRefs: Set<string>
  /** Cache edits pinned for re-send at their original positions. */
  pinnedEdits: PinnedCacheEdits[]
}

export function createCachedMCState(): CachedMCState {
  return {
    registeredTools: new Set(),
    toolOrder: [],
    sentTools: new Set(),
    deletedRefs: new Set(),
    pinnedEdits: [],
  }
}

export function resetCachedMCState(state: CachedMCState): void {
  state.registeredTools.clear()
  state.toolOrder.length = 0
  state.sentTools.clear()
  state.deletedRefs.clear()
  state.pinnedEdits.length = 0
}

export function markToolsSentToAPI(state: CachedMCState): void {
  for (const id of state.registeredTools) {
    state.sentTools.add(id)
  }
}

export function registerToolResult(
  state: CachedMCState,
  toolUseId: string,
): void {
  if (!state.registeredTools.has(toolUseId)) {
    state.registeredTools.add(toolUseId)
    state.toolOrder.push(toolUseId)
  }
}

export function registerToolMessage(
  _state: CachedMCState,
  _groupIds: string[],
): void {
  // Grouping is tracked implicitly via toolOrder; no-op placeholder kept so
  // callers can record message boundaries when the feature is built out.
}

export function getToolResultsToDelete(_state: CachedMCState): string[] {
  // Disabled path: never deletes. Real selection logic lives behind the
  // ant-only feature build.
  return []
}

export function createCacheEditsBlock(
  state: CachedMCState,
  toolsToDelete: string[],
): CacheEditsBlock | null {
  const edits = toolsToDelete
    .filter(ref => !state.deletedRefs.has(ref))
    .map(ref => {
      state.deletedRefs.add(ref)
      return { type: 'delete' as const, cache_reference: ref }
    })
  if (edits.length === 0) {
    return null
  }
  return { type: 'cache_edits', edits }
}
