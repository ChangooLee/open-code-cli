import type { AppState } from '../state/AppStateStore.js'

/**
 * Assistant (KAIROS) mode integration. Stripped from external builds via the
 * KAIROS feature gate. Consumers access this module through dynamic
 * require/import so it never loads outside assistant builds.
 */

/** Force assistant mode on for this process (set by the daemon supervisor). */
export function markAssistantForced(): void {
  throw new Error('not implemented')
}

/** Whether assistant mode was forced on via markAssistantForced(). */
export function isAssistantForced(): boolean {
  throw new Error('not implemented')
}

/** Whether the current process is running as an assistant. */
export function isAssistantMode(): boolean {
  throw new Error('not implemented')
}

/** System prompt addendum injected for assistant sessions. */
export function getAssistantSystemPromptAddendum(): string {
  throw new Error('not implemented')
}

/** Path to the assistant activation file, if any (analytics metadata). */
export function getAssistantActivationPath(): string | undefined {
  throw new Error('not implemented')
}

/**
 * Initialize the assistant team context, returning the initial teamContext to
 * seed into AppState (or undefined when not part of a team).
 */
export function initializeAssistantTeam(): Promise<AppState['teamContext']> {
  throw new Error('not implemented')
}
