import type { Message } from 'src/types/message.js'

// Projection helpers for history-snip: derive the model-visible view by
// applying snip markers, without mutating the raw message history.

/** Apply snip markers to produce the projected (snipped) view of the history. */
export function projectSnippedView(_messages: Message[]): Message[] {
  throw new Error('not implemented')
}

/** Whether the given message is a snip boundary system message. */
export function isSnipBoundaryMessage(_message: Message): boolean {
  throw new Error('not implemented')
}
