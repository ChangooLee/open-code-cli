/**
 * Client helpers for talking to other Open Code CLI sessions over their unix
 * domain sockets (ant-only, gated behind UDS_INBOX / BG_SESSIONS).
 */

/** Summary of a peer session discovered via its live UDS socket. */
export type LiveSessionInfo = {
  sessionId?: string
  kind?: string
  socketPath?: string
}

/** Send a message to the session listening on the given socket target. */
export async function sendToUdsSocket(
  _target: string,
  _message: string,
): Promise<void> {
  throw new Error('not implemented')
}

/** Enumerate all sessions currently advertising a live UDS socket. */
export async function listAllLiveSessions(): Promise<LiveSessionInfo[]> {
  throw new Error('not implemented')
}
