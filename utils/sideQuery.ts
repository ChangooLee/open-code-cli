import type {
  JSONOutputFormat,
  AgentMessage,
  BetaTool,
  ToolChoiceAuto,
  ToolChoiceTool,
  ToolUnion,
  JsonObject,
  MessageParam,
  TextBlockParam,
} from 'src/services/api/chatCompletions.js'
import {
  getLastApiCompletionTimestamp,
  setLastApiCompletionTimestamp,
} from '../bootstrap/state.js'
import { STRUCTURED_OUTPUTS_HEADER } from '../constants/apiHeaders.js'
import type { QuerySource } from '../constants/querySource.js'
import {
  getAttributionHeader,
  getCLISyspromptPrefix,
} from '../constants/system.js'
import { logEvent } from '../services/analytics/index.js'
import type { AnalyticsScalarMetadata } from '../services/analytics/metadata.js'
import { getAPIMetadata } from '../services/api/provider.js'
import { getProviderClient } from '../services/api/client.js'
import { getModelApiHeaders, modelSupportsStructuredOutputs } from './modelApiHeaders.js'
import { computeFingerprint } from './fingerprint.js'
import { normalizeModelStringForAPI } from './model/model.js'
type Tool = BetaTool
type ToolChoice = ToolChoiceAuto | ToolChoiceTool
type BetaThinkingConfigParam = JsonObject
export type SideQueryOptions = {
  model: string
  system?: string | TextBlockParam[]
  messages: MessageParam[]
  tools?: Tool[] | ToolUnion[]
  tool_choice?: ToolChoice
  output_format?: JSONOutputFormat
  max_tokens?: number
  maxRetries?: number
  signal?: AbortSignal
  skipSystemPromptPrefix?: boolean
  temperature?: number
  thinking?: number | false
  stop_sequences?: string[]
  querySource: QuerySource
}
function extractFirstUserMessageText(messages: MessageParam[]): string {
  const firstUserMessage = messages.find(m => m.role === 'user')
  if (!firstUserMessage) return ''
  const content = firstUserMessage.content
  if (typeof content === 'string') return content
  const textBlock = content.find(block => block.type === 'text')
  return textBlock?.type === 'text' ? textBlock.text : ''
}
export async function sideQuery(opts: SideQueryOptions): Promise<AgentMessage> {
  const {
    model,
    system,
    messages,
    tools,
    tool_choice,
    output_format,
    max_tokens = 1024,
    maxRetries = 2,
    signal,
    skipSystemPromptPrefix,
    temperature,
    thinking,
    stop_sequences,
  } = opts
  const client = await getProviderClient({
    maxRetries,
    model,
    source: 'side_query',
  })
  const apiHeaders = [...getModelApiHeaders(model)]
  if (
    output_format &&
    modelSupportsStructuredOutputs(model) &&
    !apiHeaders.includes(STRUCTURED_OUTPUTS_HEADER)
  ) {
    apiHeaders.push(STRUCTURED_OUTPUTS_HEADER)
  }
  const messageText = extractFirstUserMessageText(messages)
  const fingerprint = computeFingerprint(messageText, MACRO.VERSION)
  const attributionHeader = getAttributionHeader(fingerprint)
  const systemBlocks: TextBlockParam[] = [
    attributionHeader ? { type: 'text', text: attributionHeader } : null,
    ...(skipSystemPromptPrefix
      ? []
      : [
          {
            type: 'text' as const,
            text: getCLISyspromptPrefix({
              isNonInteractive: false,
              hasAppendSystemPrompt: false,
            }),
          },
        ]),
    ...(Array.isArray(system)
      ? system
      : system
        ? [{ type: 'text' as const, text: system }]
        : []),
  ].filter((block): block is TextBlockParam => block !== null)
  let thinkingConfig: BetaThinkingConfigParam | undefined
  if (thinking === false) {
    thinkingConfig = { type: 'disabled' }
  } else if (thinking !== undefined) {
    thinkingConfig = {
      type: 'enabled',
      budget_tokens: Math.min(thinking, max_tokens - 1),
    }
  }
  const normalizedModel = normalizeModelStringForAPI(model)
  const start = Date.now()
  const response = (await client.messages.create(
    {
      model: normalizedModel,
      max_tokens,
      system: systemBlocks,
      messages,
      ...(tools && { tools }),
      ...(tool_choice && { tool_choice }),
      ...(output_format && { output_config: { format: output_format } }),
      ...(temperature !== undefined && { temperature }),
      ...(stop_sequences && { stop_sequences }),
      ...(thinkingConfig && { thinking: thinkingConfig }),
      ...(apiHeaders.length > 0 && { apiHeaders }),
      metadata: getAPIMetadata(),
    },
    { signal },
  )) as AgentMessage
  const requestId =
    (response as { _request_id?: string | null })._request_id ?? undefined
  const now = Date.now()
  const lastCompletion = getLastApiCompletionTimestamp()
  logEvent('open_code_cli_api_success', {
    requestId:
      requestId as AnalyticsScalarMetadata,
    querySource:
      opts.querySource as AnalyticsScalarMetadata,
    model:
      normalizedModel as AnalyticsScalarMetadata,
    inputTokens: response.usage.prompt_tokens ?? 0,
    outputTokens: response.usage.completion_tokens ?? 0,
    cachedInputTokens: response.usage.cached_tokens ?? 0,
    uncachedInputTokens: response.usage.prompt_tokens ?? 0,
    durationMsIncludingRetries: now - start,
    timeSinceLastApiCallMs:
      lastCompletion !== null ? now - lastCompletion : undefined,
  })
  setLastApiCompletionTimestamp(now)
  return response
}
