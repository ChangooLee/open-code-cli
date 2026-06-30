import type { SessionInfo } from '../types.js'
import type { Backend } from '../sessionManager.js'
export class DangerousBackend implements Backend {
  readonly name = 'dangerous'
  async createSession(_options: {
    cwd: string
    sessionKey?: string
    dangerouslySkipPermissions?: boolean
  }): Promise<SessionInfo> {
    throw new Error('not implemented')
  }
  async stopSession(_id: string): Promise<void> {
    throw new Error('not implemented')
  }
}
