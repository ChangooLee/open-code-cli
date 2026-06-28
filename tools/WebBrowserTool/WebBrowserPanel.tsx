import React from 'react'
import { Box } from '../../ink.js'

/**
 * Side panel that surfaces the state of the in-session web browser. Rendered in
 * the REPL when the WEB_BROWSER_TOOL feature is enabled. Renders nothing until
 * there is browser activity to display.
 */
export function WebBrowserPanel(): React.ReactNode {
  return <Box flexDirection="column" />
}
