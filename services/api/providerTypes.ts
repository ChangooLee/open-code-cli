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
export type TokenUsage = {
  prompt_tokens?: number | null
  completion_tokens?: number | null
  cached_tokens?: number | null
  server_tool_use?: {
    web_search_requests?: number
    web_fetch_requests?: number
  }
  service_tier?: string | null
  inference_geo?: string | null
  iterations?: Array<{
    prompt_tokens?: number
    completion_tokens?: number
    type?: string
  }> | null
  speed?: string | null
}
export type MessageDeltaUsage = TokenUsage
export type StopReason =
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
export type RequestDocumentBlock = {
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
export type ToolResultBlockParam = {
  type: 'tool_result'
  tool_use_id: string
  content?: string | ContentBlockParam[]
  is_error?: boolean
  cache_control?: unknown
}
export type ExtraContentBlock = {
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
  | RequestDocumentBlock
  | ToolUseBlockParam
  | ToolResultBlockParam
  | ThinkingBlockParam
  | RedactedThinkingBlockParam
  | ExtraContentBlock
export type ContentBlock = ContentBlockParam
export type MessageContentBlock = ContentBlock
export type MessageParam = {
  role: 'user' | 'assistant'
  content: string | ContentBlockParam[]
}
export type Message = AgentMessage
export type AgentMessage = {
  id: string
  type: 'message'
  role: 'assistant'
  content: MessageContentBlock[]
  model: string
  stop_reason: StopReason
  stop_sequence?: string | null
  usage: TokenUsage
}
export type JSONOutputFormat = JsonObject
export type OutputConfig = JsonObject
export type ToolChoiceAuto = { type: 'auto' }
export type ToolChoiceTool = { type: 'tool'; name: string }
export type ApiTool = {
  name: string
  description?: string
  input_schema?: JsonObject
  strict?: boolean
}
export type WebSearchTool20250305 = {
  type: 'web_search_20250305'
  name: 'web_search'
  allowed_domains?: string[]
  blocked_domains?: string[]
  max_uses?: number
}
export type ToolUnion = ApiTool
export type Tool = ApiTool
export type MessageStreamParams = {
  model: string
  messages: MessageParam[]
  system?: string | TextBlockParam[]
  tools?: ToolUnion[]
  tool_choice?: ToolChoiceAuto | ToolChoiceTool
  max_tokens: number
  temperature?: number
  stream?: boolean
  thinking?: JsonObject
  metadata?: JsonObject
  apiHeaders?: string[]
  output_config?: OutputConfig
  [key: string]: unknown
}
export type AgentStreamEvent =
  | { type: 'message_start'; message: AgentMessage }
  | {
      type: 'content_block_start'
      index: number
      content_block: MessageContentBlock
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
      delta: { stop_reason: StopReason; stop_sequence?: string | null }
      usage?: MessageDeltaUsage
    }
  | { type: 'message_stop' }
export type Stream<T> = AsyncIterable<T> & { controller: AbortController }
