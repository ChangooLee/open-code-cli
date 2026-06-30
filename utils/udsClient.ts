export type LiveSessionInfo = {
  sessionId?: string
  kind?: string
  socketPath?: string
}
export async function sendToUdsSocket(
  _target: string,
  _message: string,
): Promise<void> {
  throw new Error('not implemented')
}
export async function listAllLiveSessions(): Promise<LiveSessionInfo[]> {
  throw new Error('not implemented')
}
