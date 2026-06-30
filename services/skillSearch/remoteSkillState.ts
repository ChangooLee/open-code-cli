export type DiscoveredRemoteSkill = {
  slug: string
  url: string
  name?: string
  description?: string
}
export function stripCanonicalPrefix(_commandName: string): string | null {
  throw new Error('not implemented')
}
export function getDiscoveredRemoteSkill(
  _slug: string,
): DiscoveredRemoteSkill | undefined {
  throw new Error('not implemented')
}
