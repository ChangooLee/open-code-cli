import type { SessionInfo } from './types.js'

/**
 * Backend abstraction the SessionManager uses to spawn and tear down the
 * per-session subprocesses. Implemented by DangerousBackend.
 */
export interface Backend {
  /** Human-readable backend name (e.g. "dangerous"). */
  readonly name: string
  /** Spawn a new session for the given working directory. */
  createSession(options: {
    cwd: string
    sessionKey?: string
    dangerouslySkipPermissions?: boolean
  }): Promise<SessionInfo>
  /** Stop a running session and release its resources. */
  stopSession(id: string): Promise<void>
}

export interface SessionManagerOptions {
  /** Idle timeout for detached sessions (ms). 0 = never expire. */
  idleTimeoutMs?: number
  /** Maximum number of concurrent sessions. */
  maxSessions?: number
}

/**
 * Tracks the lifecycle of server-managed sessions on top of a Backend.
 */
export class SessionManager {
  constructor(
    private readonly backend: Backend,
    private readonly options: SessionManagerOptions = {},
  ) {}

  async destroyAll(): Promise<void> {
    throw new Error('not implemented')
  }
}
