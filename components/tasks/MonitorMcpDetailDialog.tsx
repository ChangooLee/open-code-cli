import type { ReactNode } from 'react'
import type { MonitorMcpTaskState } from '../../tasks/MonitorMcpTask/MonitorMcpTask.js'

type Props = {
  task: MonitorMcpTaskState
  onKill?: () => void
  onBack: () => void
}

export function MonitorMcpDetailDialog(_props: Props): ReactNode {
  return null
}
