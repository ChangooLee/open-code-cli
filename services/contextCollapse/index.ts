import type {
  AssistantMessage,
  Message,
  StreamEvent,
  SystemAPIErrorMessage,
} from 'src/types/message.js'
import type { ToolUseContext } from 'src/Tool.js'
import type { QuerySource } from 'src/constants/querySource.js'

/** Messages yielded by the streaming model call (see queryModelWithStreaming). */
type StreamedMessage = StreamEvent | AssistantMessage | SystemAPIErrorMessage

// Context-collapse runtime: an experimental strategy that archives older
// message spans into summaries, projecting a collapsed "view" of the
// conversation for the model while preserving the raw REPL history.

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

/** Whether context collapse is active (gate + env override). */
export function isContextCollapseEnabled(): boolean {
  return false
}

/** Initialize the context-collapse subsystem (hooks, agent, state). */
export function initContextCollapse(): void {
  throw new Error('not implemented')
}

/** Reset all context-collapse state (commit log, staged queue, id maps). */
export function resetContextCollapse(): void {
  throw new Error('not implemented')
}

/** Snapshot of current collapse statistics for UI display. */
export function getStats(): ContextCollapseStats {
  throw new Error('not implemented')
}

/** Subscribe to stats changes (useSyncExternalStore-compatible). */
export function subscribe(_onStoreChange: () => void): () => void {
  throw new Error('not implemented')
}

/** Apply any staged collapses to the outgoing message list before a query. */
export async function applyCollapsesIfNeeded(
  _messages: Message[],
  _toolUseContext: ToolUseContext,
  _querySource: QuerySource,
): Promise<ApplyCollapsesResult> {
  throw new Error('not implemented')
}

/** Whether a prompt-too-long assistant message should be withheld pending collapse. */
export function isWithheldPromptTooLong(
  _message: StreamedMessage,
  _isPromptTooLongMessage: (msg: AssistantMessage) => boolean,
  _querySource: QuerySource,
): boolean {
  throw new Error('not implemented')
}

/** Drain staged collapses in response to a context-overflow (413) error. */
export function recoverFromOverflow(
  _messages: Message[],
  _querySource: QuerySource,
): RecoverFromOverflowResult {
  throw new Error('not implemented')
}
