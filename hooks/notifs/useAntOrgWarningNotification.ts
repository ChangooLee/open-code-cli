/**
 * REPL hook (ant-only) that surfaces a notification when the user's org has an
 * outstanding warning. No-op in external builds, where it's swapped for a no-op module.
 */
export function useAntOrgWarningNotification(): void {
  throw new Error('not implemented')
}
