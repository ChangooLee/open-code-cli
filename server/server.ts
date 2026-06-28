import type { SessionManager } from './sessionManager.js'
import type { ServerLogger } from './serverLog.js'
import type { ServerConfig } from './types.js'
export interface RunningServer {
  readonly port?: number
  stop(closeActiveConnections?: boolean): void
}
export function startServer(
  config: ServerConfig,
  sessionManager: SessionManager,
  logger: ServerLogger,
): RunningServer {
  throw new Error('not implemented')
}
