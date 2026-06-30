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
export async function probeRunningServer(): Promise<ServerLockInfo | null> {
  throw new Error('not implemented')
}
