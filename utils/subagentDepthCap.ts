export const DEFAULT_MAX_SUBAGENT_DEPTH = 3

export function resolveMaxSubagentDepth(
  envValue: string | undefined,
): number {
  if (envValue === undefined) return DEFAULT_MAX_SUBAGENT_DEPTH
  const trimmed = envValue.trim()
  if (trimmed === '') return DEFAULT_MAX_SUBAGENT_DEPTH
  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed) || parsed < 0) {
    return DEFAULT_MAX_SUBAGENT_DEPTH
  }
  return Math.floor(parsed)
}

export type DepthDecision =
  | { blocked: false }
  | { blocked: true; currentDepth: number; maxDepth: number }

export function checkSubagentDepth(
  currentDepth: number | undefined,
  maxDepth: number,
): DepthDecision {
  if (!Number.isFinite(maxDepth) || maxDepth < 0) {
    return { blocked: false }
  }
  const depth =
    typeof currentDepth === 'number' && Number.isFinite(currentDepth)
      ? currentDepth
  if (depth >= maxDepth) {
    return { blocked: true, currentDepth: depth, maxDepth }
  }
  return { blocked: false }
}

export function formatDepthCapError(
  currentDepth: number,
  maxDepth: number,
): string {
  return `Subagent recursion depth limit reached (current depth ${currentDepth} >= max ${maxDepth}). Refusing to spawn a deeper subagent. Do the remaining work directly in this agent, or restructure the task so it does not require additional nesting.`
}
