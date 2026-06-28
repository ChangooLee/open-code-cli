import type { Message } from 'src/types/message.js'
export type SnipCompactResult = {
  messages: Message[]
  tokensFreed: number
  executed: boolean
  boundaryMessage?: Message
}
export const SNIP_NUDGE_TEXT: string =
  'Consider snipping stale context you no longer need to free up space.'
export function isSnipRuntimeEnabled(): boolean {
  return false
}
export function shouldNudgeForSnips(_messages: Message[]): boolean {
  throw new Error('not implemented')
}
export function isSnipMarkerMessage(_message: Message): boolean {
  throw new Error('not implemented')
}
export function snipCompactIfNeeded(
  _messages: Message[],
  _options?: { force?: boolean },
): SnipCompactResult {
  throw new Error('not implemented')
}
