export const TERMINAL_CAPTURE_TOOL_NAME = 'TerminalCapture'

export function getTerminalCapturePrompt(): string {
  return `Captures the current contents of the terminal panel.

- Use this tool to read what is currently displayed in the user's terminal.
- Returns the visible terminal buffer as text.`
}
