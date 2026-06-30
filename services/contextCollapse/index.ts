import type {
  AssistantMessage,
  Message,
  StreamEvent,
  SystemAPIErrorMessage,
} from 'src/types/message.js'
import type { ToolUseContext } from 'src/Tool.js'
import type { QuerySource } from 'src/constants/querySource.js'
type StreamedMessage = StreamEvent | AssistantMessage | SystemAPIErrorMessage
export type ContextCollapseHealth = {
  totalSpawns: number
  totalErrors: number
  totalEmptySpawns: number
  emptySpawnWarningEmitted: boolean
  lastError?: string
}
export type ContextCollapseStats = {
  collapsedSpans: number
  collapsedMessages: number
  stagedSpans: number
  health: ContextCollapseHealth
}
export type ApplyCollapsesResult = {
  messages: Message[]
}
export type RecoverFromOverflowResult = {
  committed: number
  messages: Message[]
}
export function isContextCollapseEnabled(): boolean {
  return false
}
export function initContextCollapse(): void {
  throw new Error('not implemented')
}
export function resetContextCollapse(): void {
  throw new Error('not implemented')
}
export function getStats(): ContextCollapseStats {
  throw new Error('not implemented')
}
export function subscribe(_onStoreChange: () => void): () => void {
  throw new Error('not implemented')
}
export async function applyCollapsesIfNeeded(
  _messages: Message[],
  _toolUseContext: ToolUseContext,
  _querySource: QuerySource,
): Promise<ApplyCollapsesResult> {
  throw new Error('not implemented')
}
export function isWithheldPromptTooLong(
  _message: StreamedMessage,
  _isPromptTooLongMessage: (msg: AssistantMessage) => boolean,
  _querySource: QuerySource,
): boolean {
  throw new Error('not implemented')
}
export function recoverFromOverflow(
  _messages: Message[],
  _querySource: QuerySource,
): RecoverFromOverflowResult {
  throw new Error('not implemented')
}
