export { getCachedMCConfig, type CachedMCConfig } from './cachedMCConfig.js'
export function isCachedMicrocompactEnabled(): boolean {
  return false
}
export function isModelSupportedForCacheEditing(_model: string): boolean {
  return false
}
export type CacheEditsBlock = {
  type: 'cache_edits'
  edits: { type: 'delete'; cache_reference: string }[]
}
export type PinnedCacheEdits = {
  userMessageIndex: number
  block: CacheEditsBlock
}
export type CachedMCState = {
  registeredTools: Set<string>
  toolOrder: string[]
  sentTools: Set<string>
  deletedRefs: Set<string>
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
}
export function getToolResultsToDelete(_state: CachedMCState): string[] {
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
