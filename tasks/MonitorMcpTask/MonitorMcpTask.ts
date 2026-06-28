// Background task entry for MCP server monitors started via the Monitor tool.
// Surfaces a long-running MCP monitor in the footer pill and the Shift+Down
// background tasks dialog.

import type { AppState } from '../../state/AppState.js'
import type { SetAppState, Task, TaskStateBase } from '../../Task.js'
import type { AgentId } from '../../types/ids.js'
import { updateTaskState } from '../../utils/task/framework.js'

export type MonitorMcpTaskState = TaskStateBase & {
  type: 'monitor_mcp'
  serverName: string
  isBackgrounded: boolean
  agentId?: AgentId
  abortController?: AbortController
}

export function isMonitorMcpTask(task: unknown): task is MonitorMcpTaskState {
  return (
    typeof task === 'object' &&
    task !== null &&
    'type' in task &&
    task.type === 'monitor_mcp'
  )
}

export function killMonitorMcp(taskId: string, setAppState: SetAppState): void {
  updateTaskState<MonitorMcpTaskState>(taskId, setAppState, task => {
    if (task.status !== 'running') return task
    task.abortController?.abort()
    return {
      ...task,
      status: 'killed',
      endTime: Date.now(),
      notified: true,
      abortController: undefined,
    }
  })
}

/**
 * Kill all running MCP monitor tasks spawned by a given agent. Called from
 * runAgent.ts so monitors don't outlive the agent that started them.
 */
export function killMonitorMcpTasksForAgent(
  agentId: AgentId,
  getAppState: () => AppState,
  setAppState: SetAppState,
): void {
  const tasks = getAppState().tasks ?? {}
  for (const [taskId, task] of Object.entries(tasks)) {
    if (
      isMonitorMcpTask(task) &&
      task.agentId === agentId &&
      task.status === 'running'
    ) {
      killMonitorMcp(taskId, setAppState)
    }
  }
}

export const MonitorMcpTask: Task = {
  name: 'MonitorMcpTask',
  type: 'monitor_mcp',

  async kill(taskId, setAppState) {
    killMonitorMcp(taskId, setAppState)
  },
}

export default MonitorMcpTask
