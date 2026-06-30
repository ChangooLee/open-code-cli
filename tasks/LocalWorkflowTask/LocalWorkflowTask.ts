import type { SetAppState, Task, TaskStateBase } from '../../Task.js'
import { updateTaskState } from '../../utils/task/framework.js'
export type WorkflowAgentStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped'
export type WorkflowAgentState = {
  agentId: string
  name: string
  status: WorkflowAgentStatus
}
export type LocalWorkflowTaskState = TaskStateBase & {
  type: 'local_workflow'
  workflowName: string
  agents: WorkflowAgentState[]
  isBackgrounded: boolean
  abortController?: AbortController
}
export function isLocalWorkflowTask(
  task: unknown,
): task is LocalWorkflowTaskState {
  return (
    typeof task === 'object' &&
    task !== null &&
    'type' in task &&
    task.type === 'local_workflow'
  )
}
export function killWorkflowTask(
  taskId: string,
  setAppState: SetAppState,
): void {
  updateTaskState<LocalWorkflowTaskState>(taskId, setAppState, task => {
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
export function skipWorkflowAgent(
  taskId: string,
  agentId: string,
  setAppState: SetAppState,
): void {
  updateTaskState<LocalWorkflowTaskState>(taskId, setAppState, task => ({
    ...task,
    agents: task.agents.map(agent =>
      agent.agentId === agentId ? { ...agent, status: 'skipped' } : agent,
    ),
  }))
}
export function retryWorkflowAgent(
  taskId: string,
  agentId: string,
  setAppState: SetAppState,
): void {
  updateTaskState<LocalWorkflowTaskState>(taskId, setAppState, task => ({
    ...task,
    agents: task.agents.map(agent =>
      agent.agentId === agentId ? { ...agent, status: 'pending' } : agent,
    ),
  }))
}
export const LocalWorkflowTask: Task = {
  name: 'LocalWorkflowTask',
  type: 'local_workflow',
  async kill(taskId, setAppState) {
    killWorkflowTask(taskId, setAppState)
  },
}
export default LocalWorkflowTask
