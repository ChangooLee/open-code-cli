import React from 'react'
import { Box } from '../../ink.js'

/**
 * Live monitor panel for the Tungsten tool, rendered in the REPL when running
 * as an internal (ant) user. Renders nothing until there is active Tungsten
 * activity to surface.
 */
export function TungstenLiveMonitor(): React.ReactNode {
  return <Box flexDirection="column" />
}
