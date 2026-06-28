import type { HookProgress } from './hooks.js'
import type { Message, NormalizedMessage } from './message.js'
export type ShellProgress = {
  fullOutput: string
  output: string
  elapsedTimeSeconds: number
  totalLines: number
  totalBytes: number
  timeoutMs?: number
  taskId?: string
}
export type BashProgress = ShellProgress & { type: 'bash_progress' }
export type PowerShellProgress = ShellProgress & { type: 'powershell_progress' }
export type AgentToolProgress = {
  type: 'agent_progress'
  message: NormalizedMessage
  normalizedMessages?: NormalizedMessage[]
  toolUseID?: string
  prompt?: string
  agentId?: string
}
export type SkillToolProgress = {
  type: 'skill_progress'
  message: NormalizedMessage | Message
}
export type MCPProgress = {
  type: 'mcp_progress'
  message?: string
  chunk?: string
  [key: string]: unknown
}
export type WebSearchProgress =
  | { type: 'query_update'; query: string }
  | { type: 'search_results_received'; query: string; resultCount: number }
export type TaskOutputProgress = {
  type?: 'task_output_progress'
  retrieval_status: string
  task?: {
    task_id: string
    task_type: string
    status: string
    exitCode?: number | null
    output?: string
    error?: string
  }
}
export type REPLToolProgress = {
  type: 'repl_tool_call'
  phase?: 'start' | 'end' | string
  toolName?: string
  toolInput?: unknown
  message?: NormalizedMessage
}
export type SdkWorkflowProgress = {
  type: 'sdk_workflow_progress'
  status?: string
  message?: string
  [key: string]: unknown
}
export type ToolProgressData =
  | BashProgress
  | PowerShellProgress
  | AgentToolProgress
  | SkillToolProgress
  | MCPProgress
  | WebSearchProgress
  | TaskOutputProgress
  | REPLToolProgress
  | SdkWorkflowProgress
  | HookProgress
