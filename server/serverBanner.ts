import type { ServerConfig } from './types.js'

/**
 * Print the startup banner for a running server, including the connection URL
 * and auth token, to stderr.
 */
export function printBanner(
  config: ServerConfig,
  authToken: string,
  actualPort: number,
): void {
  throw new Error('not implemented')
}
