export const SEND_USER_FILE_TOOL_NAME = 'SendUserFile'

export function getSendUserFilePrompt(): string {
  return `Sends a file from the local filesystem to the user.

- Use this tool to deliver a generated or requested file directly to the user.
- Provide the absolute path of the file to send.`
}
