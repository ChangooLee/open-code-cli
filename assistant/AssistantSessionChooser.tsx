import React from 'react'
import { Box, Text } from '../ink.js'
import type { AssistantSession } from './sessionDiscovery.js'

export interface AssistantSessionChooserProps {
  sessions: AssistantSession[]
  onSelect: (id: string) => void
  onCancel: () => void
}

/**
 * Interactive chooser for selecting one of several discovered assistant
 * sessions to attach to.
 */
export function AssistantSessionChooser({
  sessions,
}: AssistantSessionChooserProps): React.ReactElement {
  return (
    <Box flexDirection="column" gap={1}>
      <Text bold>Select an assistant session to attach to:</Text>
      {sessions.map((session, index) => (
        <Text key={session.id}>
          {index + 1}. {session.title ?? session.id}
          {session.machineName ? ` (${session.machineName})` : ''}
        </Text>
      ))}
    </Box>
  )
}

export default AssistantSessionChooser
