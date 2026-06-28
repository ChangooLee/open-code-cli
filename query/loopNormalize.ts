// Input normalizer for loop-detection generalization. Gated behind the
// AGENT_LOOP_DETECTION_NORMALIZE flag and loaded via require() from
// loopDetection.ts so it is fully dead-stripped from the default build.
//
// The identical-run check in detectNoProgress keys tool calls on a verbatim
// JSON.stringify(input). A tool call that is semantically the same on every
// retry but carries a volatile field (a timestamp, a fresh request id, a
// nonce, a cache-buster) never forms an identical run, so a genuine
// no-progress loop escapes detection. normalizeInput strips a fixed set of
// well-known volatile keys (recursively) before the signature is built, so
// such retries collapse to one signature and the existing identical-run
// threshold catches them.

// Lower-cased exact key names that are considered volatile and dropped.
const VOLATILE_KEYS = new Set([
  'timestamp',
  'time',
  'ts',
  'now',
  'date',
  'datetime',
  'requestid',
  'request_id',
  'reqid',
  'req_id',
  'correlationid',
  'correlation_id',
  'traceid',
  'trace_id',
  'spanid',
  'span_id',
  'nonce',
  'uuid',
  'guid',
  'random',
  'rand',
  'cachebuster',
  'cache_buster',
  'cb',
  'seq',
  'sequence',
  'attempt',
  'retry',
  'retrycount',
  'retry_count',
])

function isVolatileKey(key: string): boolean {
  return VOLATILE_KEYS.has(key.toLowerCase())
}

// Recursively returns a copy of `value` with volatile object keys removed.
// Arrays are mapped element-wise. Non-plain values pass through unchanged.
// Guards against cycles via a seen-set so a self-referential input can never
// hang the detector.
function strip(value: unknown, seen: Set<object>): unknown {
  if (value === null || typeof value !== 'object') {
    return value
  }
  if (seen.has(value as object)) {
    return null
  }
  seen.add(value as object)
  if (Array.isArray(value)) {
    return value.map(v => strip(v, seen))
  }
  const out: Record<string, unknown> = {}
  for (const key of Object.keys(value as Record<string, unknown>)) {
    if (isVolatileKey(key)) {
      continue
    }
    out[key] = strip((value as Record<string, unknown>)[key], seen)
  }
  return out
}

// Returns a stable signature string for a tool input with volatile fields
// removed. Object keys are sorted so that key-ordering differences between two
// otherwise-identical calls do not defeat the identical-run check. Falls back
// to a String() coercion if the input is not JSON-serializable.
export function normalizeInput(input: unknown): string {
  let stripped: unknown
  try {
    stripped = strip(input, new Set())
  } catch {
    return safeStringify(input)
  }
  return stableStringify(stripped)
}

function safeStringify(input: unknown): string {
  try {
    return JSON.stringify(input)
  } catch {
    return String(input)
  }
}

// Deterministic JSON with sorted object keys (recursive). Cycles are already
// broken by strip(); this only sees the cleaned copy.
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value) ?? 'null'
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`
  }
  const keys = Object.keys(value as Record<string, unknown>).sort()
  const parts = keys.map(
    k =>
      `${JSON.stringify(k)}:${stableStringify(
        (value as Record<string, unknown>)[k],
      )}`,
  )
  return `{${parts.join(',')}}`
}
