/**
 * Server lockfile management. Records the running server's connection details
 * in ~/.open-code-cli so other invocations can detect and reach it.
 */
export interface ServerLockInfo {
  pid: number
  port: number
  host: string
  httpUrl: string
  startedAt: number
}

export async function writeServerLock(info: ServerLockInfo): Promise<void> {
  throw new Error('not implemented')
}

export async function removeServerLock(): Promise<void> {
  throw new Error('not implemented')
}

/**
 * Return lock info for a server that is currently running, or null if none.
 */
export async function probeRunningServer(): Promise<ServerLockInfo | null> {
  throw new Error('not implemented')
}
