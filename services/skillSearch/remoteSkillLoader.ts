// Fetches and caches remote skill content (SKILL.md + bundled files) on demand.

export type RemoteSkillLoadResult = {
  cacheHit: boolean
  latencyMs: number
  skillPath: string
  content: string
  fileCount: number
  totalBytes: number
  fetchMethod: string
}

/** Load a remote skill's content, using the on-disk cache when available. */
export async function loadRemoteSkill(
  _slug: string,
  _url: string,
): Promise<RemoteSkillLoadResult> {
  throw new Error('not implemented')
}
