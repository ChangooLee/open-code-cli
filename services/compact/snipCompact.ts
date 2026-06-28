import type { Message } from 'src/types/message.js'

// History-snip compaction: lets the model drop ("snip") stale spans of its own
// history via the Snip tool, freeing context without a full compaction.

/** Result of a snip-compaction pass over the message history. */
export type SnipCompactResult = {
  messages: Message[]
  tokensFreed: number
  /** Whether a snip actually executed (vs. a no-op pass). */
  executed: boolean
  /** Boundary system message to surface to the stream, when a snip executed. */
  boundaryMessage?: Message
}

/** Nudge text injected to steer the model toward snipping stale context. */
export const SNIP_NUDGE_TEXT: string =
  'Consider snipping stale context you no longer need to free up space.'

/** Whether history-snip is enabled at runtime (feature gate + override). */
export function isSnipRuntimeEnabled(): boolean {
  return false
}

/** Whether enough growth has accrued since the last snip to nudge again. */
export function shouldNudgeForSnips(_messages: Message[]): boolean {
  throw new Error('not implemented')
}

/** Whether the given message is a snip marker (user-issued [id:] snip). */
export function isSnipMarkerMessage(_message: Message): boolean {
  throw new Error('not implemented')
}

/** Execute pending snips against the message list if any are due. */
export function snipCompactIfNeeded(
  _messages: Message[],
  _options?: { force?: boolean },
): SnipCompactResult {
  throw new Error('not implemented')
}
