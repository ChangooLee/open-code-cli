/**
 * Discovery of remote assistant sessions reachable through the bridge. Used by
 * `open-code-cli assistant` to list and pick a session to attach to.
 */
export type AssistantSession = {
  /** Stable session identifier used to connect. */
  id: string
  /** Human-readable session title, if available. */
  title?: string
  /** Name of the machine hosting the session. */
  machineName?: string
  /** Working directory of the remote session. */
  cwd?: string
  /** Epoch millis of the session's last activity. */
  lastActiveAt?: number
}

/**
 * Discover assistant sessions across the user's bridge environments.
 */
export async function discoverAssistantSessions(): Promise<AssistantSession[]> {
  throw new Error('not implemented')
}
