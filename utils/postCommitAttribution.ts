/**
 * Installs the git `prepare-commit-msg` hook used to attach commit attribution
 * metadata. Loaded dynamically so its excluded strings can be dead-code
 * eliminated from public builds.
 */

/**
 * Install the prepare-commit-msg hook into the given worktree.
 *
 * @param worktreePath - Absolute path to the worktree root.
 * @param worktreeHooksDir - Optional override for the worktree's hooks dir.
 */
export async function installPrepareCommitMsgHook(
  _worktreePath: string,
  _worktreeHooksDir?: string,
): Promise<void> {
  throw new Error('not implemented')
}
