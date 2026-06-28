import type { DirectConnectConfig } from './directConnectManager.js'

/**
 * Run a direct-connect session in headless (print) mode against an already
 * established server session.
 */
export async function runConnectHeadless(
  config: DirectConnectConfig,
  prompt: string,
  outputFormat: string,
  interactive: boolean,
): Promise<void> {
  throw new Error('not implemented')
}
