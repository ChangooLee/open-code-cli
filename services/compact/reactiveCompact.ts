import type {
  AssistantMessage,
  Message,
  StreamEvent,
  SystemAPIErrorMessage,
} from 'src/types/message.js'
import type { ToolUseContext } from 'src/Tool.js'
import type { QuerySource } from 'src/constants/querySource.js'
import type { SystemPrompt } from 'src/utils/systemPromptType.js'
import type { CompactionResult } from './compact.js'

// Reactive compaction: triggered by recoverable API errors (prompt-too-long,
// oversized media) to summarize/strip context and retry the failed turn.

/** Messages yielded by the streaming model call (see queryModelWithStreaming). */
type StreamedMessage = StreamEvent | AssistantMessage | SystemAPIErrorMessage

export type TryReactiveCompactParams = {
  hasAttempted: boolean
  querySource: QuerySource
  aborted: boolean
  messages: Message[]
  cacheSafeParams: {
    systemPrompt: SystemPrompt
    userContext: { [k: string]: string }
    systemContext: { [k: string]: string }
    toolUseContext: ToolUseContext
    forkContextMessages: Message[]
  }
}

/** Whether reactive compaction is enabled (feature gate + override). */
export function isReactiveCompactEnabled(): boolean {
  return false
}

/** Whether reactive compaction is the sole compaction strategy in effect. */
export function isReactiveOnlyMode(): boolean {
  return false
}

/** Whether a prompt-too-long error should be withheld pending reactive recovery. */
export function isWithheldPromptTooLong(_message: StreamedMessage): boolean {
  throw new Error('not implemented')
}

/** Whether an oversized-media error should be withheld pending reactive recovery. */
export function isWithheldMediaSizeError(
  _message: StreamedMessage | undefined,
): boolean {
  throw new Error('not implemented')
}

/** Attempt a reactive compaction; returns the result to retry with, or null. */
export async function tryReactiveCompact(
  _params: TryReactiveCompactParams,
): Promise<CompactionResult | null> {
  throw new Error('not implemented')
}
