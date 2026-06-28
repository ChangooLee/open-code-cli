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
export function isReactiveCompactEnabled(): boolean {
  return false
}
export function isReactiveOnlyMode(): boolean {
  return false
}
export function isWithheldPromptTooLong(_message: StreamedMessage): boolean {
  throw new Error('not implemented')
}
export function isWithheldMediaSizeError(
  _message: StreamedMessage | undefined,
): boolean {
  throw new Error('not implemented')
}
export async function tryReactiveCompact(
  _params: TryReactiveCompactParams,
): Promise<CompactionResult | null> {
  throw new Error('not implemented')
}
