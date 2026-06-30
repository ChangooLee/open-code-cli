export type SdkToolName = string
export type SdkToolInput = Record<string, unknown>
export type SdkToolResult = {
  content: Array<{ type: string; text?: string; [key: string]: unknown }>
  isError?: boolean
}
