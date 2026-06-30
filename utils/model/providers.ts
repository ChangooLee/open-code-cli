import type { AnalyticsScalarMetadata } from '../../services/analytics/index.js'

export type APIProvider = 'chatCompletions'

export function getAPIProvider(): APIProvider {
  return 'chatCompletions'
}

export function getAPIProviderForStatsig(): AnalyticsScalarMetadata {
  return getAPIProvider() as AnalyticsScalarMetadata
}

export function isFirstPartyBaseUrl(): boolean {
  return false
}
