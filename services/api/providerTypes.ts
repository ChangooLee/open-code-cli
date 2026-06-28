export type JsonObject = Record<string, unknown>

export class APIError extends Error {
  status?: number
  headers?: Headers
  error?: unknown
  requestID?: string

  constructor(
    statusOrMessage?: number | string,
    message?: string,
    headers?: Headers,
    error?: unknown,
  ) {
    super(
      typeof statusOrMessage === 'string'
        ? statusOrMessage
        : (message ?? `API error${statusOrMessage ? ` ${statusOrMessage}` : ''}`),
    )
    this.name = 'APIError'
    if (typeof statusOrMessage === 'number') {
      this.status = statusOrMessage
    }
    this.headers = headers
    this.error = error
  }
}

export class APIConnectionError extends Error {
  constructor(message = 'API connection error') {
    super(message)
    this.name = 'APIConnectionError'
  }
}

export class APIConnectionTimeoutError extends APIConnectionError {
  constructor(message = 'API connection timeout') {
    super(message)
    this.name = 'APIConnectionTimeoutError'
  }
}

export class APIUserAbortError extends Error {
  constructor(message = 'Request aborted') {
    super(message)
    this.name = 'APIUserAbortError'
  }
}

export class AuthenticationError extends APIError {
  constructor(message = 'Authentication failed', headers?: Headers, error?: unknown) {
    super(401, message, headers, error)
    this.name = 'AuthenticationError'
  }
}

export class NotFoundError extends APIError {
  constructor(message = 'Not found', headers?: Headers, error?: unknown) {
    super(404, message, headers, error)
    this.name = 'NotFoundError'
  }
}

export type ClientOptions = {
  fetch?: typeof fetch
  fetchOptions?: RequestInit
  defaultHeaders?: Record<string, string>
  maxRetries?: number
  timeout?: number
  dangerouslyAllowBrowser?: boolean
  logger?: {
    error?: (msg: string, ...args: unknown[]) => void
    warn?: (msg: string, ...args: unknown[]) => void
    info?: (msg: string, ...args: unknown[]) => void
    debug?: (msg: string, ...args: unknown[]) => void
  }
}

export type BetaUsage = {
  input_tokens?: number | null
  output_tokens?: number | null
  cache_creation_input_tokens?: number | null
  cache_read_input_tokens?: number | null
  server_tool_use?: {
    web_search_requests?: number
    web_fetch_requests?: number
  }
  cache_creation?: {
    ephemeral_1h_input_tokens?: number
    ephemeral_5m_input_tokens?: number
  }
  service_tier?: string | null
  inference_geo?: string | null
  iterations?: Array<{
    input_tokens?: number
    output_tokens?: number
    type?: string
  }> | null
  speed?: string | null
}

export type BetaMessageDeltaUsage = BetaUsage
export type BetaStopReason =
  | 'end_turn'
  | 'max_tokens'
  | 'stop_sequence'
  | 'tool_use'
  | 'model_context_window_exceeded'
  | 'refusal'
  | null

export type TextBlockParam = { type: 'text'; text: string; cache_control?: unknown }
export type TextBlock = TextBlockParam
export type ThinkingBlock = {
  type: 'thinking'
  thinking: string
  signature?: string
}
export type ThinkingBlockParam = ThinkingBlock
export type RedactedThinkingBlock = {
  type: 'redacted_thinking'
  data: string
}
export type RedactedThinkingBlockParam = RedactedThinkingBlock
export type Base64ImageSource = {
  type: 'base64'
  media_type: string
  data: string
}
export type ImageBlockParam = {
  type: 'image'
  source: Base64ImageSource | { type: 'url'; url: string }
  cache_control?: unknown
}
export type BetaImageBlockParam = ImageBlockParam
export type BetaRequestDocumentBlock = {
  type: 'document'
  source?: unknown
  cache_control?: unknown
}
export type ToolUseBlock = {
  type: 'tool_use'
  id: string
  name: string
  input: unknown
}
export type ToolUseBlockParam = ToolUseBlock
export type BetaToolUseBlock = ToolUseBlock
export type ToolResultBlockParam = {
  type: 'tool_result'
  tool_use_id: string
  content?: string | ContentBlockParam[]
  is_error?: boolean
  cache_control?: unknown
}
export type BetaToolResultBlockParam = ToolResultBlockParam
// Additional beta/server content blocks the CLI enumerates but mostly passes
// through. Each keeps a literal `type` discriminant (so narrowing the named
// blocks above still works) plus an open shape for forward-compatible fields.
export type BetaExtraContentBlock = {
  type:
    | 'server_tool_use'
    | 'web_search_tool_result'
    | 'search_result'
    | 'code_execution_tool_result'
    | 'mcp_tool_use'
    | 'mcp_tool_result'
    | 'container_upload'
    | 'web_fetch_tool_result'
    | 'bash_code_execution_tool_result'
    | 'text_editor_code_execution_tool_result'
    | 'tool_search_tool_result'
    | 'compaction'
  id?: string
  name?: string
  input?: unknown
  content?: unknown
  [key: string]: unknown
}

export type ContentBlockParam =
  | TextBlockParam
  | ImageBlockParam
  | BetaRequestDocumentBlock
  | ToolUseBlockParam
  | ToolResultBlockParam
  | ThinkingBlockParam
  | RedactedThinkingBlockParam
  | BetaExtraContentBlock
export type ContentBlock = ContentBlockParam
export type BetaContentBlockParam = ContentBlockParam
export type BetaContentBlock = ContentBlock
export type BetaThinkingBlock = ThinkingBlock
export type BetaRedactedThinkingBlock = RedactedThinkingBlock

export type MessageParam = {
  role: 'user' | 'assistant'
  content: string | ContentBlockParam[]
}
export type BetaMessageParam = MessageParam
export type Message = BetaMessage
export type BetaMessage = {
  id: string
  type: 'message'
  role: 'assistant'
  content: BetaContentBlock[]
  model: string
  stop_reason: BetaStopReason
  stop_sequence?: string | null
  usage: BetaUsage
}

export type BetaJSONOutputFormat = JsonObject
export type BetaOutputConfig = JsonObject
export type BetaToolChoiceAuto = { type: 'auto' }
export type BetaToolChoiceTool = { type: 'tool'; name: string }
export type BetaTool = {
  name: string
  description?: string
  input_schema?: JsonObject
  strict?: boolean
}
export type BetaWebSearchTool20250305 = {
  type: 'web_search_20250305'
  name: 'web_search'
  allowed_domains?: string[]
  blocked_domains?: string[]
  max_uses?: number
}
export type BetaToolUnion = BetaTool
export type Tool = BetaTool

export type BetaMessageStreamParams = {
  model: string
  messages: MessageParam[]
  system?: string | TextBlockParam[]
  tools?: BetaToolUnion[]
  tool_choice?: BetaToolChoiceAuto | BetaToolChoiceTool
  max_tokens: number
  temperature?: number
  stream?: boolean
  thinking?: JsonObject
  metadata?: JsonObject
  betas?: string[]
  output_config?: BetaOutputConfig
  [key: string]: unknown
}

export type BetaRawMessageStreamEvent =
  | { type: 'message_start'; message: BetaMessage }
  | {
      type: 'content_block_start'
      index: number
      content_block: BetaContentBlock
    }
  | {
      type: 'content_block_delta'
      index: number
      delta:
        | { type: 'text_delta'; text: string }
        | { type: 'input_json_delta'; partial_json: string }
        | { type: 'thinking_delta'; thinking: string }
        | { type: 'signature_delta'; signature: string }
        | { type: 'citations_delta'; citation?: unknown }
    }
  | { type: 'content_block_stop'; index: number }
  | {
      type: 'message_delta'
      delta: { stop_reason: BetaStopReason; stop_sequence?: string | null }
      usage?: BetaMessageDeltaUsage
    }
  | { type: 'message_stop' }

export type Stream<T> = AsyncIterable<T> & { controller: AbortController }
