import type {
  ContextCollapseCommitEntry,
  ContextCollapseSnapshotEntry,
} from 'src/types/logs.js'

// Persistence for context-collapse state: restoring the commit log and staged
// snapshot from a resumed session's transcript entries.

/**
 * Reset context-collapse state and rebuild it from the given commit log and
 * optional staged snapshot. Called unconditionally on resume so a stale
 * in-memory log from a prior session is always cleared first.
 */
export function restoreFromEntries(
  _commits: ContextCollapseCommitEntry[],
  _snapshot: ContextCollapseSnapshotEntry | undefined,
): void {
  throw new Error('not implemented')
}
