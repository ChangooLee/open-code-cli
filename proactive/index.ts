/**
 * Proactive mode runtime. Gated behind the PROACTIVE/KAIROS feature flags and
 * consumed everywhere through optional namespace access
 * (`proactiveModule?.xxx`), so it is safe for this module to be absent from
 * external builds.
 */

/** Whether proactive mode is currently active. */
export function isProactiveActive(): boolean {
  throw new Error('not implemented')
}

/** Whether proactive mode is active but paused. */
export function isProactivePaused(): boolean {
  throw new Error('not implemented')
}

/** Activate proactive mode, recording how it was triggered. */
export function activateProactive(source: string): void {
  throw new Error('not implemented')
}

/** Deactivate proactive mode entirely. */
export function deactivateProactive(): void {
  throw new Error('not implemented')
}

/** Pause proactive ticks without deactivating. */
export function pauseProactive(): void {
  throw new Error('not implemented')
}

/** Resume proactive ticks after a pause. */
export function resumeProactive(): void {
  throw new Error('not implemented')
}

/**
 * Block/unblock proactive ticks while the context is busy (e.g. a tool is
 * running or the user is typing).
 */
export function setContextBlocked(blocked: boolean): void {
  throw new Error('not implemented')
}

/** Epoch millis of the next scheduled proactive tick, or null when idle. */
export function getNextTickAt(): number | null {
  throw new Error('not implemented')
}

/**
 * Subscribe to proactive state changes (useSyncExternalStore-compatible).
 * Returns an unsubscribe function.
 */
export function subscribeToProactiveChanges(
  onStoreChange: () => void,
): () => void {
  throw new Error('not implemented')
}
