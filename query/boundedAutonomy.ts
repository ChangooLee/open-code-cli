import { feature } from 'bun:bundle'
export const DEFAULT_MAX_TURNS = 100
export function resolveEffectiveMaxTurns(
  maxTurns: number | undefined,
): number | undefined {
  if (maxTurns !== undefined) {
    return maxTurns
  }
  if (feature('BOUNDED_AUTONOMY')) {
    return DEFAULT_MAX_TURNS
  }
  return undefined
}
