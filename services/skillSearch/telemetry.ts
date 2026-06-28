export type RemoteSkillLoadedEvent = {
  slug: string
  cacheHit: boolean
  latencyMs: number
  urlScheme: string
  error?: string
  fileCount?: number
  totalBytes?: number
  fetchMethod?: string
}
export function logRemoteSkillLoaded(_event: RemoteSkillLoadedEvent): void {
}
