import type { ReactNode } from 'react'
import type { CommandResultDisplay } from '../../commands.js'
import type { LocalWorkflowTaskState } from '../../tasks/LocalWorkflowTask/LocalWorkflowTask.js'

type Props = {
  workflow: LocalWorkflowTaskState
  onDone: (
    result?: string,
    options?: { display?: CommandResultDisplay },
  ) => void
  onKill?: () => void
  onSkipAgent?: (agentId: string) => void
  onRetryAgent?: (agentId: string) => void
  onBack: () => void
}

export function WorkflowDetailDialog(_props: Props): ReactNode {
  return null
}
