import type { Message } from '../types/message.js'

/**
 * Callback invoked when a turn completes, uploading the turn's messages for
 * internal session-data collection (ant-only; stubbed in external builds).
 */
export type SessionTurnUploader = (messages: Message[]) => void | Promise<void>

/**
 * Create a per-session uploader. Auth and enablement are re-checked on each
 * turn so the uploader degrades gracefully when unauthenticated.
 */
export function createSessionTurnUploader(): SessionTurnUploader {
  throw new Error('not implemented')
}
