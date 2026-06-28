import type { ChildProcess } from 'child_process'
import type {
  SSHSessionCallbacks,
  SSHSessionManager,
} from './SSHSessionManager.js'

/**
 * Error thrown when an SSH session fails to connect or deploy.
 */
export class SSHSessionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SSHSessionError'
  }
}

/**
 * A live `open-code-cli ssh` session: a remote (or local test) child process
 * whose tools run remotely while the REPL UI renders locally.
 */
export interface SSHSession {
  /** Working directory on the remote host. */
  remoteCwd: string
  /** The underlying ssh (or local) child process. */
  proc: ChildProcess
  /** Local auth proxy tunneled to the remote. */
  proxy: { stop(): void }
  /** Create a protocol manager wired to the given REPL callbacks. */
  createManager(callbacks: SSHSessionCallbacks): SSHSessionManager
  /** Recent remote stderr output, for surfacing connection failures. */
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

/**
 * Connect to a remote host over SSH, deploy the binary, and start a session.
 */
export async function createSSHSession(
  options: CreateSSHSessionOptions,
  progress: CreateSSHSessionProgress = {},
): Promise<SSHSession> {
  throw new Error('not implemented')
}

/**
 * Spawn a local child process as an SSH-style session — exercises the auth
 * proxy and unix-socket plumbing without a remote host (e2e test mode).
 */
export function createLocalSSHSession(
  options: CreateLocalSSHSessionOptions,
): SSHSession {
  throw new Error('not implemented')
}
