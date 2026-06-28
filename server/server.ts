import type { SessionManager } from './sessionManager.js'
import type { ServerLogger } from './serverLog.js'
import type { ServerConfig } from './types.js'

/**
 * Handle to a running server instance.
 */
export interface RunningServer {
  /** The port the server is actually listening on. */
  readonly port?: number
  /** Stop the server, optionally closing existing connections gracefully. */
  stop(closeActiveConnections?: boolean): void
}

/**
 * Start the Open Code CLI HTTP server backed by the given session manager.
 */
export function startServer(
  config: ServerConfig,
  sessionManager: SessionManager,
  logger: ServerLogger,
): RunningServer {
  throw new Error('not implemented')
}
