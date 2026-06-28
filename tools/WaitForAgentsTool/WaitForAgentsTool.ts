import { z } from 'zod/v4'
import { feature } from 'bun:bundle'
import { buildTool, type Tool, type ToolDef } from '../../Tool.js'
import type { TaskState } from '../../tasks/types.js'
import type { LocalAgentTaskState } from '../../tasks/LocalAgentTask/LocalAgentTask.js'
import { lazySchema } from '../../utils/lazySchema.js'
import { sleep } from '../../utils/sleep.js'
import { extractTextContent } from '../../utils/messages.js'
import { AbortError } from '../../utils/errors.js'
import { WAIT_FOR_AGENTS_TOOL_NAME } from './constants.js'

const inputSchema = lazySchema(() =>
  z.strictObject({
    agent_ids: z
      .array(z.string())
      .min(1)
      .describe('Agent/task IDs to block on until all reach a terminal state'),
    timeout: z
      .number()
      .min(0)
      .max(1_800_000)
      .default(300_000)
      .describe('Max wait time in ms (default 5 minutes)'),
  }),
)
type InputSchema = ReturnType<typeof inputSchema>
type Input = z.infer<InputSchema>
type AgentResult = {
  agent_id: string
  found: boolean
  status: string
  result?: string
  error?: string
}
type Output = {
  all_terminal: boolean
  timed_out: boolean
  agents: AgentResult[]
}

function isPending(t: TaskState | undefined): boolean {
  return !!t && (t.status === 'running' || t.status === 'pending')
}

export const WaitForAgentsTool: Tool<InputSchema, Output> = buildTool({
  name: WAIT_FOR_AGENTS_TOOL_NAME,
  searchHint: 'block until background agents finish (deterministic join)',
  maxResultSizeChars: 50_000,
  get inputSchema(): InputSchema {
    return inputSchema()
  },
  isEnabled() {
    return feature('ASYNC_AGENT_JOIN')
  },
  isConcurrencySafe() {
    return true
  },
  isReadOnly() {
    return true
  },
  userFacingName() {
    return 'Wait For Agents'
  },
  toAutoClassifierInput(input) {
    return input.agent_ids
  },
  async description() {
    return 'Block until all listed background agents reach a terminal state (completed/failed/killed) or a timeout elapses, then return each agent’s status and result. Use this to deterministically join parallel agents you spawned instead of guessing in prose whether they finished.'
  },
  async prompt() {
    return `Deterministically wait for one or more background/async agents to finish before continuing.
- agent_ids: IDs of agents you previously spawned asynchronously.
- Blocks until every listed agent is terminal (completed/failed/killed) or the timeout elapses.
- Returns per-agent status, result text, and error.
- Use this when you must have all parallel results before synthesizing, instead of re-reading task notifications by hand.`
  },
  async call(input: Input, toolUseContext) {
    const { agent_ids, timeout } = input
    const start = Date.now()
    while (Date.now() - start < timeout) {
      if (toolUseContext.abortController?.signal.aborted) {
        throw new AbortError()
      }
      const tasks = toolUseContext.getAppState().tasks ?? {}
      // Keep waiting while any listed agent is still running/pending OR not yet
      // observable (handles spawn races). A missing id is NEVER treated as done:
      // conflating "lost track of a task" with "task completed" would be a
      // false-positive join.
      const stillWaiting = agent_ids.some(id => {
        const t = tasks[id] as TaskState | undefined
        return t === undefined || isPending(t)
      })
      if (!stillWaiting) {
        break
      }
      await sleep(100)
    }
    const tasks = toolUseContext.getAppState().tasks ?? {}
    const agents: AgentResult[] = agent_ids.map(id => {
      const t = tasks[id] as TaskState | undefined
      if (!t) {
        return { agent_id: id, found: false, status: 'not_found' }
      }
      const base: AgentResult = { agent_id: id, found: true, status: t.status }
      if (t.type === 'local_agent') {
        const at = t as LocalAgentTaskState
        if (at.result) {
          base.result = extractTextContent(at.result.content, '\n')
        }
        if (at.error) {
          base.error = at.error
        }
      }
      return base
    })
    // all_terminal ONLY when every agent was found AND reached a terminal state.
    const anyUnfinished = agents.some(
      a => !a.found || a.status === 'running' || a.status === 'pending',
    )
    return {
      data: { all_terminal: !anyUnfinished, timed_out: anyUnfinished, agents },
    }
  },
  mapToolResultToToolResultBlockParam(data, toolUseID) {
    const parts: string[] = []
    parts.push(`<all_terminal>${data.all_terminal}</all_terminal>`)
    if (data.timed_out) {
      parts.push('<timed_out>true</timed_out>')
    }
    for (const a of data.agents) {
      const attrs = [`agent_id=${a.agent_id}`, `status=${a.status}`]
      if (a.error) {
        attrs.push(`error=${a.error}`)
      }
      parts.push(`<agent ${attrs.join(' ')}>`)
      if (a.result) {
        parts.push(a.result)
      }
      parts.push('</agent>')
    }
    return {
      tool_use_id: toolUseID,
      type: 'tool_result' as const,
      content: parts.join('\n'),
    }
  },
  renderToolUseMessage(input) {
    return Array.isArray(input.agent_ids) ? input.agent_ids.join(', ') : ''
  },
} satisfies ToolDef<InputSchema, Output>)

export default WaitForAgentsTool
