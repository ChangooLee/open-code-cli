import type { AttributionData, AttributionState } from './commitAttribution.js'

/**
 * Build git trailer lines describing Open Code CLI's contribution, appended to PR
 * bodies so they survive squash-merge as proper git trailers. Split out from
 * commitAttribution.ts for tree-shaking (contains excluded strings).
 */
export function buildPRTrailers(
  _attributionData: AttributionData,
  _attribution: AttributionState,
): string[] {
  throw new Error('not implemented')
}
