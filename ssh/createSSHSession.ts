import type { ChildProcess } from 'child_process'
import type {
  SSHSessionCallbacks,
  SSHSessionManager,
} from './SSHSessionManager.js'
export class SSHSessionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SSHSessionError'
  }
}
export interface SSHSession {
  remoteCwd: string
  proc: ChildProcess
  proxy: { stop(): void }
  createManager(callbacks: SSHSessionCallbacks): SSHSessionManager
  getStderrTail(): string
}
export interface CreateSSHSessionOptions {
  host: string
  cwd: string
  localVersion: string
  permissionMode?: string
  dangerouslySkipPermissions?: boolean
  extraCliArgs?: string[]
}
export interface CreateSSHSessionProgress {
  onProgress?: (message: string) => void
}
export interface CreateLocalSSHSessionOptions {
  cwd: string
  permissionMode?: string
  dangerouslySkipPermissions?: boolean
}
export async function createSSHSession(
  options: CreateSSHSessionOptions,
  progress: CreateSSHSessionProgress = {},
): Promise<SSHSession> {
  throw new Error('not implemented')
}
export function createLocalSSHSession(
  options: CreateLocalSSHSessionOptions,
): SSHSession {
  throw new Error('not implemented')
}
