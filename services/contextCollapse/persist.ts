import type {
  ContextCollapseCommitEntry,
  ContextCollapseSnapshotEntry,
} from 'src/types/logs.js'
export function restoreFromEntries(
  _commits: ContextCollapseCommitEntry[],
  _snapshot: ContextCollapseSnapshotEntry | undefined,
): void {
  throw new Error('not implemented')
}
