import type { Message } from 'src/types/message.js'

// Pure projection operations over the collapse commit log.

/**
 * Replay the collapse commit log over the given messages to produce the
 * collapsed view the model actually sees. No-ops when nothing is collapsed.
 */
export function projectView(_messages: Message[]): Message[] {
  throw new Error('not implemented')
}
