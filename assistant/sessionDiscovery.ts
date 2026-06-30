export type AssistantSession = {
  id: string
  title?: string
  machineName?: string
  cwd?: string
  lastActiveAt?: number
}
export async function discoverAssistantSessions(): Promise<AssistantSession[]> {
  throw new Error('not implemented')
}
