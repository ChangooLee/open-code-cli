import { feature } from 'bun:bundle'
import { APIError } from 'src/services/api/chatCompletions.js'
import type {
  StopReason,
  TokenUsage as Usage,
} from 'src/services/api/chatCompletions.js'
import {
  addToTotalDurationState,
  consumeAfterContextCompaction,
  getIsNonInteractiveSession,
  getLastApiCompletionTimestamp,
  getTeleportedSessionInfo,
  markFirstTeleportMessageLogged,
  setLastApiCompletionTimestamp,
} from 'src/bootstrap/state.js'
import type { QueryChainTracking } from 'src/Tool.js'
import { isConnectorTextBlock } from 'src/types/connectorText.js'
import type { AssistantMessage } from 'src/types/message.js'
import { logForDebugging } from 'src/utils/debug.js'
import type { EffortLevel } from 'src/utils/effort.js'
import { logError } from 'src/utils/log.js'
import { getAPIProviderForStatsig } from 'src/utils/model/providers.js'
import type { PermissionMode } from 'src/utils/permissions/PermissionMode.js'
import { jsonStringify } from 'src/utils/slowOperations.js'
import { logOTelEvent } from 'src/utils/telemetry/events.js'
import {
  endLLMRequestSpan,
  isPreviewTracingEnabled,
  type Span,
} from 'src/utils/telemetry/sessionTracing.js'
import type { NonNullableUsage } from '../../entrypoints/sdk/sdkUtilityTypes.js'
import { consumeInvokingRequestId } from '../../utils/agentContext.js'
import {
  type AnalyticsScalarMetadata,
  logEvent,
} from '../analytics/index.js'
import { sanitizeToolNameForAnalytics } from '../analytics/metadata.js'
import { EMPTY_USAGE } from './emptyUsage.js'
import { classifyAPIError } from './errors.js'
import { extractConnectionErrorDetails } from './errorUtils.js'
export type { NonNullableUsage }
export { EMPTY_USAGE }
export type GlobalCacheStrategy = 'tool_based' | 'system_prompt' | 'none'
function getErrorMessage(error: unknown): string {
  if (error instanceof APIError) {
    const body = error.error as { error?: { message?: string } } | undefined
    if (body?.error?.message) return body.error.message
  }
  return error instanceof Error ? error.message : String(error)
}
type KnownGateway =
  | 'litellm'
  | 'helicone'
  | 'portkey'
  | 'cloudflare-ai-gateway'
  | 'kong'
  | 'braintrust'
  | 'databricks'
const GATEWAY_FINGERPRINTS: Partial<
  Record<KnownGateway, { prefixes: string[] }>
> = {
  litellm: {
    prefixes: ['x-litellm-'],
  },
  helicone: {
    prefixes: ['helicone-'],
  },
  portkey: {
    prefixes: ['x-portkey-'],
  },
  'cloudflare-ai-gateway': {
    prefixes: ['cf-aig-'],
  },
  kong: {
    prefixes: ['x-kong-'],
  },
  braintrust: {
    prefixes: ['x-bt-'],
  },
}
const GATEWAY_HOST_SUFFIXES: Partial<Record<KnownGateway, string[]>> = {
  databricks: [
    '.cloud.databricks.com',
    '.azuredatabricks.net',
    '.gcp.databricks.com',
  ],
}
function detectGateway({
  headers,
  baseUrl,
}: {
  headers?: globalThis.Headers
  baseUrl?: string
}): KnownGateway | undefined {
  if (headers) {
    const headerNames: string[] = []
    headers.forEach((_, key) => headerNames.push(key))
    for (const [gw, { prefixes }] of Object.entries(GATEWAY_FINGERPRINTS)) {
      if (prefixes.some(p => headerNames.some(h => h.startsWith(p)))) {
        return gw as KnownGateway
      }
    }
  }
  if (baseUrl) {
    try {
      const host = new URL(baseUrl).hostname.toLowerCase()
      for (const [gw, suffixes] of Object.entries(GATEWAY_HOST_SUFFIXES)) {
        if (suffixes.some(s => host.endsWith(s))) {
          return gw as KnownGateway
        }
      }
    } catch {
    }
  }
  return undefined
}
function getProviderEnvMetadata() {
  return {
    ...(process.env.OPEN_CODE_CLI_BASE_URL
      ? {
          baseUrl: process.env
            .OPEN_CODE_CLI_BASE_URL as AnalyticsScalarMetadata,
        }
      : {}),
    ...(process.env.OPEN_CODE_CLI_MODEL
      ? {
          envModel: process.env
            .OPEN_CODE_CLI_MODEL as AnalyticsScalarMetadata,
        }
      : {}),
    ...(process.env.OPEN_CODE_CLI_SMALL_FAST_MODEL
      ? {
          envSmallFastModel: process.env
            .OPEN_CODE_CLI_SMALL_FAST_MODEL as AnalyticsScalarMetadata,
        }
      : {}),
  }
}
function getBuildAgeMinutes(): number | undefined {
  if (!MACRO.BUILD_TIME) return undefined
  const buildTime = new Date(MACRO.BUILD_TIME).getTime()
  if (isNaN(buildTime)) return undefined
  return Math.floor((Date.now() - buildTime) / 60000)
}
export function logAPIQuery({
  model,
  messagesLength,
  temperature,
  apiHeaders,
  permissionMode,
  querySource,
  queryTracking,
  thinkingType,
  effortValue,
  fastMode,
  previousRequestId,
}: {
  model: string
  messagesLength: number
  temperature: number
  apiHeaders?: string[]
  permissionMode?: PermissionMode
  querySource: string
  queryTracking?: QueryChainTracking
  thinkingType?: 'adaptive' | 'enabled' | 'disabled'
  effortValue?: EffortLevel | null
  fastMode?: boolean
  previousRequestId?: string | null
}): void {
  logEvent('open_code_cli_api_query', {
    model: model as AnalyticsScalarMetadata,
    messagesLength,
    temperature: temperature,
    provider: getAPIProviderForStatsig(),
    buildAgeMins: getBuildAgeMinutes(),
    ...(apiHeaders?.length
      ? {
          apiHeaders: apiHeaders.join(
            ',',
          ) as AnalyticsScalarMetadata,
        }
      : {}),
    permissionMode:
      permissionMode as AnalyticsScalarMetadata,
    querySource:
      querySource as AnalyticsScalarMetadata,
    ...(queryTracking
      ? {
          queryChainId:
            queryTracking.chainId as AnalyticsScalarMetadata,
          queryDepth: queryTracking.depth,
        }
      : {}),
    thinkingType:
      thinkingType as AnalyticsScalarMetadata,
    effortValue:
      effortValue as AnalyticsScalarMetadata,
    fastMode,
    ...(previousRequestId
      ? {
          previousRequestId:
            previousRequestId as AnalyticsScalarMetadata,
        }
      : {}),
    ...getProviderEnvMetadata(),
  })
}
export function logAPIError({
  error,
  model,
  messageCount,
  messageTokens,
  durationMs,
  durationMsIncludingRetries,
  attempt,
  requestId,
  clientRequestId,
  didFallBackToNonStreaming,
  promptCategory,
  headers,
  queryTracking,
  querySource,
  llmSpan,
  fastMode,
  previousRequestId,
}: {
  error: unknown
  model: string
  messageCount: number
  messageTokens?: number
  durationMs: number
  durationMsIncludingRetries: number
  attempt: number
  requestId?: string | null
  clientRequestId?: string
  didFallBackToNonStreaming?: boolean
  promptCategory?: string
  headers?: globalThis.Headers
  queryTracking?: QueryChainTracking
  querySource?: string
  llmSpan?: Span
  fastMode?: boolean
  previousRequestId?: string | null
}): void {
  const gateway = detectGateway({
    headers:
      error instanceof APIError && error.headers ? error.headers : headers,
    baseUrl: process.env.OPEN_CODE_CLI_BASE_URL,
  })
  const errStr = getErrorMessage(error)
  const status = error instanceof APIError ? String(error.status) : undefined
  const errorType = classifyAPIError(error)
  const connectionDetails = extractConnectionErrorDetails(error)
  if (connectionDetails) {
    const sslLabel = connectionDetails.isSSLError ? ' (SSL error)' : ''
    logForDebugging(
      `Connection error details: code=${connectionDetails.code}${sslLabel}, message=${connectionDetails.message}`,
      { level: 'error' },
    )
  }
  const invocation = consumeInvokingRequestId()
  if (clientRequestId) {
    logForDebugging(
      `API error x-client-request-id=${clientRequestId} (give this to the API team for server-log lookup)`,
      { level: 'error' },
    )
  }
  logError(error as Error)
  logEvent('open_code_cli_api_error', {
    model: model as AnalyticsScalarMetadata,
    error: errStr as AnalyticsScalarMetadata,
    status:
      status as AnalyticsScalarMetadata,
    errorType:
      errorType as AnalyticsScalarMetadata,
    messageCount,
    messageTokens,
    durationMs,
    durationMsIncludingRetries,
    attempt,
    provider: getAPIProviderForStatsig(),
    requestId:
      (requestId as AnalyticsScalarMetadata) ||
      undefined,
    ...(invocation
      ? {
          invokingRequestId:
            invocation.invokingRequestId as AnalyticsScalarMetadata,
          invocationKind:
            invocation.invocationKind as AnalyticsScalarMetadata,
        }
      : {}),
    clientRequestId:
      (clientRequestId as AnalyticsScalarMetadata) ||
      undefined,
    didFallBackToNonStreaming,
    ...(promptCategory
      ? {
          promptCategory:
            promptCategory as AnalyticsScalarMetadata,
        }
      : {}),
    ...(gateway
      ? {
          gateway:
            gateway as AnalyticsScalarMetadata,
        }
      : {}),
    ...(queryTracking
      ? {
          queryChainId:
            queryTracking.chainId as AnalyticsScalarMetadata,
          queryDepth: queryTracking.depth,
        }
      : {}),
    ...(querySource
      ? {
          querySource:
            querySource as AnalyticsScalarMetadata,
        }
      : {}),
    fastMode,
    ...(previousRequestId
      ? {
          previousRequestId:
            previousRequestId as AnalyticsScalarMetadata,
        }
      : {}),
    ...getProviderEnvMetadata(),
  })
  void logOTelEvent('api_error', {
    model: model,
    error: errStr,
    status_code: String(status),
    duration_ms: String(durationMs),
    attempt: String(attempt),
    speed: fastMode ? 'fast' : 'normal',
  })
  endLLMRequestSpan(llmSpan, {
    success: false,
    statusCode: status ? parseInt(status) : undefined,
    error: errStr,
    attempt,
  })
  const teleportInfo = getTeleportedSessionInfo()
  if (teleportInfo?.isTeleported && !teleportInfo.hasLoggedFirstMessage) {
    logEvent('open_code_cli_teleport_first_message_error', {
      session_id:
        teleportInfo.sessionId as AnalyticsScalarMetadata,
      error_type:
        errorType as AnalyticsScalarMetadata,
    })
    markFirstTeleportMessageLogged()
  }
}
function logAPISuccess({
  model,
  preNormalizedModel,
  messageCount,
  messageTokens,
  usage,
  durationMs,
  durationMsIncludingRetries,
  attempt,
  ttftMs,
  requestId,
  stopReason,
  costUSD,
  didFallBackToNonStreaming,
  querySource,
  gateway,
  queryTracking,
  permissionMode,
  globalCacheStrategy,
  textContentLength,
  thinkingContentLength,
  toolUseContentLengths,
  connectorTextBlockCount,
  fastMode,
  previousRequestId,
  apiHeaders,
}: {
  model: string
  preNormalizedModel: string
  messageCount: number
  messageTokens: number
  usage: Usage
  durationMs: number
  durationMsIncludingRetries: number
  attempt: number
  ttftMs: number | null
  requestId: string | null
  stopReason: StopReason | null
  costUSD: number
  didFallBackToNonStreaming: boolean
  querySource: string
  gateway?: KnownGateway
  queryTracking?: QueryChainTracking
  permissionMode?: PermissionMode
  globalCacheStrategy?: GlobalCacheStrategy
  textContentLength?: number
  thinkingContentLength?: number
  toolUseContentLengths?: Record<string, number>
  connectorTextBlockCount?: number
  fastMode?: boolean
  previousRequestId?: string | null
  apiHeaders?: string[]
}): void {
  const isNonInteractiveSession = getIsNonInteractiveSession()
  const isAfterContextCompaction = consumeAfterContextCompaction()
  const hasPrintFlag =
    process.argv.includes('-p') || process.argv.includes('--print')
  const now = Date.now()
  const lastCompletion = getLastApiCompletionTimestamp()
  const timeSinceLastApiCallMs =
    lastCompletion !== null ? now - lastCompletion : undefined
  const invocation = consumeInvokingRequestId()
  logEvent('open_code_cli_api_success', {
    model: model as AnalyticsScalarMetadata,
    ...(preNormalizedModel !== model
      ? {
          preNormalizedModel:
            preNormalizedModel as AnalyticsScalarMetadata,
        }
      : {}),
    ...(apiHeaders?.length
      ? {
          apiHeaders: apiHeaders.join(
            ',',
          ) as AnalyticsScalarMetadata,
        }
      : {}),
    messageCount,
    messageTokens,
    inputTokens: usage.prompt_tokens as any,
    outputTokens: usage.completion_tokens as any,
    cachedInputTokens: usage.cached_tokens ?? 0,
    uncachedInputTokens: 0 ?? 0,
    durationMs: durationMs,
    durationMsIncludingRetries: durationMsIncludingRetries,
    attempt: attempt,
    ttftMs: ttftMs ?? undefined,
    buildAgeMins: getBuildAgeMinutes(),
    provider: getAPIProviderForStatsig(),
    requestId:
      (requestId as AnalyticsScalarMetadata) ??
      undefined,
    ...(invocation
      ? {
          invokingRequestId:
            invocation.invokingRequestId as AnalyticsScalarMetadata,
          invocationKind:
            invocation.invocationKind as AnalyticsScalarMetadata,
        }
      : {}),
    stop_reason:
      (stopReason as AnalyticsScalarMetadata) ??
      undefined,
    costUSD,
    didFallBackToNonStreaming,
    isNonInteractiveSession,
    print: hasPrintFlag,
    isTTY: process.stdout.isTTY ?? false,
    querySource:
      querySource as AnalyticsScalarMetadata,
    ...(gateway
      ? {
          gateway:
            gateway as AnalyticsScalarMetadata,
        }
      : {}),
    ...(queryTracking
      ? {
          queryChainId:
            queryTracking.chainId as AnalyticsScalarMetadata,
          queryDepth: queryTracking.depth,
        }
      : {}),
    permissionMode:
      permissionMode as AnalyticsScalarMetadata,
    ...(globalCacheStrategy
      ? {
          globalCacheStrategy:
            globalCacheStrategy as AnalyticsScalarMetadata,
        }
      : {}),
    ...(textContentLength !== undefined
      ? ({
          textContentLength,
        } as AnalyticsScalarMetadata)
      : {}),
    ...(thinkingContentLength !== undefined
      ? ({
          thinkingContentLength,
        } as AnalyticsScalarMetadata)
      : {}),
    ...(toolUseContentLengths !== undefined
      ? ({
          toolUseContentLengths: jsonStringify(
            toolUseContentLengths,
          ) as AnalyticsScalarMetadata,
        } as AnalyticsScalarMetadata)
      : {}),
    ...(connectorTextBlockCount !== undefined
      ? ({
          connectorTextBlockCount,
        } as AnalyticsScalarMetadata)
      : {}),
    fastMode,
    ...(feature('CACHED_MICROCOMPACT') &&
    ((usage as unknown as { cache_deleted_prompt_tokens?: number })
      .cache_deleted_prompt_tokens ?? 0) > 0
      ? {
          cacheDeletedInputTokens: (
            usage as unknown as { cache_deleted_prompt_tokens: number }
          ).cache_deleted_prompt_tokens,
        }
      : {}),
    ...(previousRequestId
      ? {
          previousRequestId:
            previousRequestId as AnalyticsScalarMetadata,
        }
      : {}),
    ...(isAfterContextCompaction ? { isAfterContextCompaction } : {}),
    ...getProviderEnvMetadata(),
    timeSinceLastApiCallMs,
  })
  setLastApiCompletionTimestamp(now)
}
export function logAPISuccessAndDuration({
  model,
  preNormalizedModel,
  start,
  startIncludingRetries,
  ttftMs,
  usage,
  attempt,
  messageCount,
  messageTokens,
  requestId,
  stopReason,
  didFallBackToNonStreaming,
  querySource,
  headers,
  costUSD,
  queryTracking,
  permissionMode,
  newMessages,
  llmSpan,
  globalCacheStrategy,
  requestSetupMs,
  attemptStartTimes,
  fastMode,
  previousRequestId,
  apiHeaders,
}: {
  model: string
  preNormalizedModel: string
  start: number
  startIncludingRetries: number
  ttftMs: number | null
  usage: NonNullableUsage
  attempt: number
  messageCount: number
  messageTokens: number
  requestId: string | null
  stopReason: StopReason | null
  didFallBackToNonStreaming: boolean
  querySource: string
  headers?: globalThis.Headers
  costUSD: number
  queryTracking?: QueryChainTracking
  permissionMode?: PermissionMode
  newMessages?: AssistantMessage[]
  llmSpan?: Span
  globalCacheStrategy?: GlobalCacheStrategy
  requestSetupMs?: number
  attemptStartTimes?: number[]
  fastMode?: boolean
  previousRequestId?: string | null
  apiHeaders?: string[]
}): void {
  const gateway = detectGateway({
    headers,
    baseUrl: process.env.OPEN_CODE_CLI_BASE_URL,
  })
  let textContentLength: number | undefined
  let thinkingContentLength: number | undefined
  let toolUseContentLengths: Record<string, number> | undefined
  let connectorTextBlockCount: number | undefined
  if (newMessages) {
    let textLen = 0
    let thinkingLen = 0
    let hasToolUse = false
    const toolLengths: Record<string, number> = {}
    let connectorCount = 0
    for (const msg of newMessages) {
      for (const block of msg.message.content) {
        if (block.type === 'text') {
          textLen += block.text.length
        } else if (feature('CONNECTOR_TEXT') && isConnectorTextBlock(block)) {
          connectorCount++
        } else if (block.type === 'thinking') {
          thinkingLen += block.thinking.length
        } else if (
          block.type === 'tool_use' ||
          block.type === 'server_tool_use' ||
          block.type === 'mcp_tool_use'
        ) {
          const inputLen = jsonStringify(block.input).length
          const sanitizedName = sanitizeToolNameForAnalytics(block.name as string)
          toolLengths[sanitizedName] =
            (toolLengths[sanitizedName] ?? 0) + inputLen
          hasToolUse = true
        }
      }
    }
    textContentLength = textLen
    thinkingContentLength = thinkingLen > 0 ? thinkingLen : undefined
    toolUseContentLengths = hasToolUse ? toolLengths : undefined
    connectorTextBlockCount = connectorCount > 0 ? connectorCount : undefined
  }
  const durationMs = Date.now() - start
  const durationMsIncludingRetries = Date.now() - startIncludingRetries
  addToTotalDurationState(durationMsIncludingRetries, durationMs)
  logAPISuccess({
    model,
    preNormalizedModel,
    messageCount,
    messageTokens,
    usage,
    durationMs,
    durationMsIncludingRetries,
    attempt,
    ttftMs,
    requestId,
    stopReason,
    costUSD,
    didFallBackToNonStreaming,
    querySource,
    gateway,
    queryTracking,
    permissionMode,
    globalCacheStrategy,
    textContentLength,
    thinkingContentLength,
    toolUseContentLengths,
    connectorTextBlockCount,
    fastMode,
    previousRequestId,
    apiHeaders,
  })
  void logOTelEvent('api_request', {
    model,
    prompt_tokens: String(usage.prompt_tokens),
    completion_tokens: String(usage.completion_tokens),
    cache_read_tokens: String(usage.cached_tokens),
    cache_creation_tokens: '0',
    cost_usd: String(costUSD),
    duration_ms: String(durationMs),
    speed: fastMode ? 'fast' : 'normal',
  })
  let modelOutput: string | undefined
  let thinkingOutput: string | undefined
  let hasToolCall: boolean | undefined
  if (isPreviewTracingEnabled() && newMessages) {
    modelOutput =
      newMessages
        .flatMap(m =>
          m.message.content
            .filter(c => c.type === 'text')
            .map(c => (c as { type: 'text'; text: string }).text),
        )
        .join('\n') || undefined
    if (process.env.USER_TYPE === 'ant') {
      thinkingOutput =
        newMessages
          .flatMap(m =>
            m.message.content
              .filter(c => c.type === 'thinking')
              .map(c => (c as { type: 'thinking'; thinking: string }).thinking),
          )
          .join('\n') || undefined
    }
    hasToolCall = newMessages.some(m =>
      m.message.content.some(c => c.type === 'tool_use'),
    )
  }
  endLLMRequestSpan(llmSpan, {
    success: true,
    inputTokens: usage.prompt_tokens,
    outputTokens: usage.completion_tokens,
    cacheReadTokens: usage.cached_tokens,
    cacheCreationTokens: 0,
    attempt,
    modelOutput,
    thinkingOutput,
    hasToolCall,
    ttftMs: ttftMs ?? undefined,
    requestSetupMs,
    attemptStartTimes,
  })
  const teleportInfo = getTeleportedSessionInfo()
  if (teleportInfo?.isTeleported && !teleportInfo.hasLoggedFirstMessage) {
    logEvent('open_code_cli_teleport_first_message_success', {
      session_id:
        teleportInfo.sessionId as AnalyticsScalarMetadata,
    })
    markFirstTeleportMessageLogged()
  }
}
