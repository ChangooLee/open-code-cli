// Session state for remote skills discovered via skill search. Tracks which
// remote skills the model surfaced this session so the SkillTool can validate
// and load them by their canonical slug.

export type DiscoveredRemoteSkill = {
  slug: string
  url: string
  name?: string
  description?: string
}

/**
 * Strip the `_canonical_<slug>` prefix used to namespace remote skills in the
 * command registry. Returns the bare slug, or null if the name is not a
 * canonical remote-skill reference.
 */
export function stripCanonicalPrefix(_commandName: string): string | null {
  throw new Error('not implemented')
}

/** Look up a remote skill discovered earlier in this session by its slug. */
export function getDiscoveredRemoteSkill(
  _slug: string,
): DiscoveredRemoteSkill | undefined {
  throw new Error('not implemented')
}
