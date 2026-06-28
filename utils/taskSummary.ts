import type { ToolUseContext } from '../Tool.js'
import type { Message } from '../types/message.js'
import type { SystemPrompt } from './systemPromptType.js'

/** Parameters required to (maybe) generate a background task summary. */
export type TaskSummaryParams = {
  systemPrompt: SystemPrompt
  userContext: { [k: string]: string }
  systemContext: { [k: string]: string }
  toolUseContext: ToolUseContext
  forkContextMessages: Message[]
}

/** Whether the current session is eligible to generate a task summary. */
export function shouldGenerateTaskSummary(): boolean {
  throw new Error('not implemented')
}

/**
 * Generate a task summary in the background if heuristics warrant it. Fire and
 * forget — the caller ignores the result.
 */
export function maybeGenerateTaskSummary(_params: TaskSummaryParams): void {
  throw new Error('not implemented')
}
