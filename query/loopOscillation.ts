// Oscillation detector for loop-detection generalization. Gated behind the
// AGENT_LOOP_DETECTION_OSCILLATION flag and loaded via require() from
// loopDetection.ts so it is fully tree-shaken from the default build.

const OSCILLATION_CYCLE_THRESHOLD = 3
const OSCILLATION_WINDOW = 12

// Detects a trailing period-2 oscillation A,B,A,B,... where A !== B. Counts the
// number of full A,B cycles at the tail of the (windowed) signature list and
// fires once that meets OSCILLATION_CYCLE_THRESHOLD. A pure A,A,A run is left to
// the identical-run check in detectNoProgress.
export function detectOscillation(sigs: string[]): {
  stop: boolean
  toolName?: string
  count?: number
} {
  const window =
    sigs.length > OSCILLATION_WINDOW ? sigs.slice(-OSCILLATION_WINDOW) : sigs
  const n = window.length
  if (n < OSCILLATION_CYCLE_THRESHOLD * 2) {
    return { stop: false }
  }
  const a = window[n - 2]
  const b = window[n - 1]
  if (a === b) {
    return { stop: false }
  }
  let matched = 0
  for (let i = n - 1; i >= 0; i--) {
    const expected = (n - 1 - i) % 2 === 0 ? b : a
    if (window[i] !== expected) {
      break
    }
    matched++
  }
  const cycles = Math.floor(matched / 2)
  if (cycles >= OSCILLATION_CYCLE_THRESHOLD) {
    const nameA = a.split(':')[0]
    const nameB = b.split(':')[0]
    const toolName = nameA === nameB ? nameA : `${nameA},${nameB}`
    return { stop: true, toolName, count: matched }
  }
  return { stop: false }
}
