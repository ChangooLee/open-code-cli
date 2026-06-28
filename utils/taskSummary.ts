import type { ToolUseContext } from '../Tool.js'
import type { Message } from '../types/message.js'
import type { SystemPrompt } from './systemPromptType.js'
export type TaskSummaryParams = {
  systemPrompt: SystemPrompt
  userContext: { [k: string]: string }
  systemContext: { [k: string]: string }
  toolUseContext: ToolUseContext
  forkContextMessages: Message[]
}
export function shouldGenerateTaskSummary(): boolean {
  throw new Error('not implemented')
}
export function maybeGenerateTaskSummary(_params: TaskSummaryParams): void {
  throw new Error('not implemented')
}
