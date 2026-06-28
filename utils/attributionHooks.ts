/**
 * Commit-attribution hook registration and cache management (ant-only feature,
 * gated behind the COMMIT_ATTRIBUTION build flag). Loaded dynamically so the
 * module's excluded strings can be dead-code-eliminated from public builds.
 */

/** Register the hooks that track edits for commit attribution. */
export function registerAttributionHooks(): void {
  throw new Error('not implemented')
}

/** Drop stale entries from the tracked-file content cache. */
export function sweepFileContentCache(): void {
  throw new Error('not implemented')
}

/** Clear all attribution caches (file content cache, pending bash states). */
export function clearAttributionCaches(): void {
  throw new Error('not implemented')
}
