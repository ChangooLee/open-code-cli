/**
 * `open-code-cli rollback [target]` — roll back to a previous release. Ant-only.
 */
export async function rollback(
  target?: string,
  options?: { list?: boolean; dryRun?: boolean; safe?: boolean },
): Promise<void> {
  throw new Error('not implemented')
}
