/**
 * Runtime feature gate for assistant (KAIROS) mode. Separated from index.ts so
 * the gate check can run before the heavier assistant module loads.
 */
export async function isKairosEnabled(): Promise<boolean> {
  throw new Error('not implemented')
}
