// SDK runtime types (callbacks, interfaces with methods).
// Referenced by entrypoints/agentSdkTypes.ts function signatures.

import type { z, ZodRawShape } from 'zod/v4'
import type {
  AgentDefinition,
  ModelInfo,
  PermissionMode,
  PermissionResult,
  PermissionUpdate,
  SDKMessage,
  SDKResultMessage,
  SDKSessionInfo,
  SDKUserMessage,
} from './coreTypes.js'
import type { Settings } from './settingsTypes.generated.js'

export type AnyZodRawShape = ZodRawShape
export type InferShape<Schema extends AnyZodRawShape> = z.infer<
  z.ZodObject<Schema>
>

export type EffortLevel = 'low' | 'medium' | 'high'

export type SdkMcpToolDefinition<Schema extends AnyZodRawShape = AnyZodRawShape> =
  {
    name: string
    description: string
    inputSchema: Schema
    handler: (args: InferShape<Schema>, extra: unknown) => Promise<unknown>
    annotations?: unknown
    searchHint?: string
    alwaysLoad?: boolean
  }

export type McpSdkServerConfigWithInstance = {
  type: 'sdk'
  name: string
  instance: unknown
}

export type CanUseTool = (
  toolName: string,
  input: Record<string, unknown>,
  options: { signal: AbortSignal; suggestions?: PermissionUpdate[] },
) => Promise<PermissionResult>

export type Options = {
  abortController?: AbortController
  allowedTools?: string[]
  appendSystemPrompt?: string
  customSystemPrompt?: string
  cwd?: string
  disallowedTools?: string[]
  executable?: string
  executableArgs?: string[]
  maxThinkingTokens?: number
  maxTurns?: number
  mcpServers?: Record<string, unknown>
  model?: string
  permissionMode?: PermissionMode
  permissionPromptToolName?: string
  continue?: boolean
  resume?: string
  canUseTool?: CanUseTool
  settings?: Settings
  agents?: Record<string, AgentDefinition>
  env?: Record<string, string>
  [key: string]: unknown
}

export type InternalOptions = Options & {
  [key: string]: unknown
}

export type Query = AsyncGenerator<SDKMessage, void> & {
  interrupt(): Promise<void>
  setPermissionMode(mode: PermissionMode): Promise<void>
  setModel(model?: string): Promise<void>
  supportedModels(): Promise<ModelInfo[]>
  supportedCommands(): Promise<unknown[]>
}

export type InternalQuery = Query & {
  [key: string]: unknown
}

export type SessionMessage = SDKMessage

export type SDKSessionOptions = Options & {
  model?: string
}

export type SDKSession = {
  sessionId: string
  prompt(message: string | AsyncIterable<SDKUserMessage>): Query
  result(): Promise<SDKResultMessage>
  interrupt(): Promise<void>
  info(): Promise<SDKSessionInfo | undefined>
}

export type ListSessionsOptions = {
  dir?: string
  limit?: number
  offset?: number
}

export type GetSessionInfoOptions = {
  dir?: string
}

export type GetSessionMessagesOptions = {
  dir?: string
  limit?: number
  offset?: number
  includeSystemMessages?: boolean
}

export type SessionMutationOptions = {
  dir?: string
}

export type ForkSessionOptions = {
  dir?: string
  upToMessageId?: string
  title?: string
}

export type ForkSessionResult = {
  sessionId: string
}
