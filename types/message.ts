// Reconstructed from consumer usage (utils/messages.ts constructors,
// utils/messages/mappers.ts, collapse*/group* renderers, query.ts stream loop,
// Tool.ts). These are the CLI's internal message/event representation. Field
// shapes mirror the literals produced by the createX message factories.
//
// NOTE: This module was reverse-engineered from how the codebase reads/writes
// these values; runtime semantics should match upstream but exact optionality
// of rarely-used fields is inferred.

import type { UUID } from 'crypto'
import type {
  APIError,
  BetaContentBlock,
  BetaMessage,
  BetaRawMessageStreamEvent,
  BetaUsage,
  ContentBlockParam,
  ToolResultBlockParam,
} from 'src/services/api/openaiCompatible.js'
import type { SDKAssistantMessageError } from 'src/entrypoints/agentSdkTypes.js'
import type { Attachment } from 'src/utils/attachments.js'
import type { PermissionMode } from './permissions.js'
import type { ToolProgressData } from './tools.js'
import type {
  BranchAction,
  CommitKind,
  PrAction,
} from 'src/tools/shared/gitOperationTracking.js'

export type SystemMessageLevel = 'info' | 'warning' | 'error' | 'suggestion'

/** Direction a partial/auto compaction summarized from. */
export type PartialCompactDirection = 'from' | 'up_to'

/** Provenance of a user message. `undefined`/`human` = typed by the user. */
export type MessageOrigin =
  | { kind: 'human' }
  | { kind: 'task-notification' }
  | { kind: 'coordinator' }
  | { kind: 'channel'; server: string }

// ---------------------------------------------------------------------------
// Assistant / User
// ---------------------------------------------------------------------------

/** The provider message envelope carried inside an AssistantMessage. */
export type APIAssistantMessage = BetaMessage & {
  container?: unknown
  context_management?: unknown
}

export type AssistantMessage<C extends BetaContentBlock = BetaContentBlock> = {
  type: 'assistant'
  uuid: UUID
  timestamp: string
  message: Omit<APIAssistantMessage, 'content'> & { content: C[] }
  requestId?: string
  costUSD?: number
  durationMs?: number
  apiError?: SDKAssistantMessageError
  error?: SDKAssistantMessageError
  errorDetails?: string
  isApiErrorMessage?: boolean
  isVirtual?: true
  isMeta?: boolean
  advisorModel?: string
  // ant-only: research payload captured from message_delta.
  research?: unknown
}

export type UserMessageContent = {
  role: 'user'
  content: string | ContentBlockParam[]
}

export type UserMessage = {
  type: 'user'
  message: UserMessageContent
  uuid: UUID
  timestamp: string
  isMeta?: boolean
  isVisibleInTranscriptOnly?: true
  isVirtual?: true
  isCompactSummary?: true
  toolUseResult?: unknown
  mcpMeta?: {
    _meta?: Record<string, unknown>
    structuredContent?: Record<string, unknown>
  }
  imagePasteIds?: number[]
  sourceToolUseID?: string
  sourceToolAssistantUUID?: UUID
  permissionMode?: PermissionMode
  summarizeMetadata?: {
    messagesSummarized: number
    userContext?: string
    direction?: PartialCompactDirection
  }
  origin?: MessageOrigin
  /** Plan text carried by plan-mode submissions for rendering/verification. */
  planContent?: string
}

/** A UserMessage whose content has been normalized to a block array. */
export type NormalizedUserMessage = UserMessage & {
  message: { role: 'user'; content: ContentBlockParam[] }
}

export type NormalizedAssistantMessage<
  C extends BetaContentBlock = BetaContentBlock,
> = AssistantMessage<C>

// ---------------------------------------------------------------------------
// Attachment
// ---------------------------------------------------------------------------

export type AttachmentMessage<A extends Attachment = Attachment> = {
  type: 'attachment'
  attachment: A
  uuid: UUID
  timestamp: string
}

// ---------------------------------------------------------------------------
// Progress
// ---------------------------------------------------------------------------

export type ProgressMessage<P = ToolProgressData> = {
  type: 'progress'
  data: P
  toolUseID: string
  parentToolUseID: string
  uuid: UUID
  timestamp: string
}

// ---------------------------------------------------------------------------
// Compaction metadata
// ---------------------------------------------------------------------------

export type CompactMetadata = {
  trigger: 'manual' | 'auto'
  preTokens: number
  userContext?: string
  messagesSummarized?: number
  preservedSegment?: {
    headUuid: UUID
    anchorUuid: UUID
    tailUuid: UUID
  }
  /** Tool names already discovered before compaction (preserve deferred schemas). */
  preCompactDiscoveredTools?: string[]
}

// ---------------------------------------------------------------------------
// System messages (discriminated on `subtype`)
// ---------------------------------------------------------------------------

type SystemBase = {
  type: 'system'
  uuid: UUID
  timestamp: string
  isMeta?: boolean
  level?: SystemMessageLevel
  toolUseID?: string
  logicalParentUuid?: UUID
}

export type SystemInformationalMessage = SystemBase & {
  subtype: 'informational'
  content: string
  level: SystemMessageLevel
  preventContinuation?: boolean
}

export type SystemLocalCommandMessage = SystemBase & {
  subtype: 'local_command'
  content: string
}

export type SystemPermissionRetryMessage = SystemBase & {
  subtype: 'permission_retry'
  content: string
  commands: string[]
}

export type SystemBridgeStatusMessage = SystemBase & {
  subtype: 'bridge_status'
  content: string
  url: string
  upgradeNudge?: boolean
}

export type SystemScheduledTaskFireMessage = SystemBase & {
  subtype: 'scheduled_task_fire'
  content: string
}

export type StopHookInfo = {
  hookName?: string
  hookLabel?: string
  command?: string
  durationMs?: number
  output?: string
  error?: string
  preventedContinuation?: boolean
}

export type SystemStopHookSummaryMessage = SystemBase & {
  subtype: 'stop_hook_summary'
  hookCount: number
  hookInfos: StopHookInfo[]
  hookErrors: string[]
  preventedContinuation: boolean
  stopReason?: string
  hasOutput?: boolean
  hookLabel?: string
  totalDurationMs?: number
}

export type SystemTurnDurationMessage = SystemBase & {
  subtype: 'turn_duration'
  durationMs: number
  budgetTokens?: number
  budgetLimit?: number
  budgetNudges?: number
  messageCount?: number
}

export type SystemAwaySummaryMessage = SystemBase & {
  subtype: 'away_summary'
  content: string
}

export type SystemMemorySavedMessage = SystemBase & {
  subtype: 'memory_saved'
  writtenPaths: string[]
}

export type SystemAgentsKilledMessage = SystemBase & {
  subtype: 'agents_killed'
}

export type SystemApiMetricsMessage = SystemBase & {
  subtype: 'api_metrics'
  ttftMs: number
  otps: number
  isP50?: boolean
  hookDurationMs?: number
  turnDurationMs?: number
  toolDurationMs?: number
  classifierDurationMs?: number
  toolCount?: number
  hookCount?: number
  classifierCount?: number
}

export type SystemCompactBoundaryMessage = SystemBase & {
  subtype: 'compact_boundary'
  content: string
  compactMetadata: CompactMetadata
}

export type SystemMicrocompactBoundaryMessage = SystemBase & {
  subtype: 'microcompact_boundary'
  content: string
  microcompactMetadata: {
    trigger: 'auto'
    preTokens: number
    tokensSaved: number
    compactedToolIds: string[]
    clearedAttachmentUUIDs: string[]
  }
}

export type SystemAPIErrorMessage = SystemBase & {
  subtype: 'api_error'
  level: 'error'
  error: APIError
  cause?: Error
  retryInMs: number
  retryAttempt: number
  maxRetries: number
}

export type SystemThinkingMessage = SystemBase & {
  subtype: 'thinking'
  content: string
}

export type SystemFileSnapshotMessage = SystemBase & {
  subtype: 'file_snapshot'
  content: string
  snapshotFiles: { key: string; path: string; content: string }[]
}

export type SystemMessage =
  | SystemInformationalMessage
  | SystemLocalCommandMessage
  | SystemPermissionRetryMessage
  | SystemBridgeStatusMessage
  | SystemScheduledTaskFireMessage
  | SystemStopHookSummaryMessage
  | SystemTurnDurationMessage
  | SystemAwaySummaryMessage
  | SystemMemorySavedMessage
  | SystemAgentsKilledMessage
  | SystemApiMetricsMessage
  | SystemCompactBoundaryMessage
  | SystemMicrocompactBoundaryMessage
  | SystemAPIErrorMessage
  | SystemThinkingMessage
  | SystemFileSnapshotMessage

// ---------------------------------------------------------------------------
// Hook results
// ---------------------------------------------------------------------------

export type HookResultMessage =
  | UserMessage
  | AttachmentMessage
  | ProgressMessage

// ---------------------------------------------------------------------------
// Core message union
// ---------------------------------------------------------------------------

export type Message =
  | UserMessage
  | AssistantMessage
  | ProgressMessage
  | AttachmentMessage
  | SystemMessage

export type NormalizedMessage =
  | NormalizedUserMessage
  | NormalizedAssistantMessage
  | ProgressMessage
  | AttachmentMessage
  | SystemMessage

// ---------------------------------------------------------------------------
// Stream events (yielded by query()/provider)
// ---------------------------------------------------------------------------

export type StreamEvent = {
  type: 'stream_event'
  event: BetaRawMessageStreamEvent
  uuid?: UUID
  timestamp?: string
  // Time-to-first-token, attached on the message_start stream event.
  ttftMs?: number
}

export type RequestStartEvent = {
  type: 'stream_request_start'
}

// ---------------------------------------------------------------------------
// Tombstone / summaries
// ---------------------------------------------------------------------------

export type TombstoneMessage = {
  type: 'tombstone'
  uuid?: UUID
  timestamp?: string
  reason?: string
  // The orphaned message this tombstone removes from UI/transcript.
  message: Message
}

export type ToolUseSummaryMessage = {
  type: 'tool_use_summary'
  summary: string
  precedingToolUseIds: string[]
  uuid: UUID
  timestamp: string
}

// ---------------------------------------------------------------------------
// Collapsed / grouped renderable messages
// ---------------------------------------------------------------------------

export type GroupedToolUseMessage = {
  type: 'grouped_tool_use'
  toolName: string
  messages: NormalizedAssistantMessage[]
  results: NormalizedUserMessage[]
  displayMessage: NormalizedAssistantMessage
  messageId: string
  uuid: UUID
  timestamp: string
}

export type CollapsibleMessage =
  | NormalizedAssistantMessage
  | NormalizedUserMessage
  | GroupedToolUseMessage

export type CollapsedReadSearchGroup = {
  type: 'collapsed_read_search'
  searchCount: number
  readCount: number
  listCount: number
  replCount: number
  memorySearchCount: number
  memoryReadCount: number
  memoryWriteCount: number
  readFilePaths: string[]
  searchArgs: string[]
  latestDisplayHint?: string
  messages: CollapsibleMessage[]
  displayMessage: CollapsibleMessage
  uuid: UUID
  timestamp: string
  teamMemorySearchCount?: number
  teamMemoryReadCount?: number
  teamMemoryWriteCount?: number
  mcpCallCount?: number
  mcpServerNames?: string[]
  bashCount?: number
  gitOpBashCount?: number
  commits?: { sha: string; kind: CommitKind }[]
  pushes?: { branch: string }[]
  branches?: { ref: string; action: BranchAction }[]
  prs?: { number: number; url?: string; action: PrAction }[]
  hookTotalMs?: number
  hookCount?: number
  hookInfos?: StopHookInfo[]
  relevantMemories?: { path: string; content: string; mtimeMs: number }[]
}

export type RenderableMessage =
  | NormalizedMessage
  | GroupedToolUseMessage
  | CollapsedReadSearchGroup
  | TombstoneMessage
  | ToolUseSummaryMessage
