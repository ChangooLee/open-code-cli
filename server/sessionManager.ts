import type { SessionInfo } from './types.js'
export interface Backend {
  readonly name: string
  createSession(options: {
    cwd: string
    sessionKey?: string
    dangerouslySkipPermissions?: boolean
  }): Promise<SessionInfo>
  stopSession(id: string): Promise<void>
}
export interface SessionManagerOptions {
  idleTimeoutMs?: number
  maxSessions?: number
}
export class SessionManager {
  constructor(
    private readonly backend: Backend,
    private readonly options: SessionManagerOptions = {},
  ) {}
  async destroyAll(): Promise<void> {
    throw new Error('not implemented')
  }
}
