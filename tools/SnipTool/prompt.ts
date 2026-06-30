export const SNIP_TOOL_NAME = 'Snip'

export function getSnipPrompt(): string {
  return `Removes earlier portions of the conversation history to free up context.

- Use this tool to drop stale tool output or superseded content from the transcript.
- Snipped content remains available on disk but is no longer sent to the model.`
}
