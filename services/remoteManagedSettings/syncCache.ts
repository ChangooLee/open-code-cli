import { OPEN_CODE_CLI_API_SCOPE } from '../../constants/oauth.js'
import {
  getProviderApiKeyWithSource,
  getOpenCodeCliOAuthTokens,
} from '../../utils/auth.js'
import {
  getAPIProvider,
  isFirstPartyBaseUrl,
} from '../../utils/model/providers.js'
import { getOpenCodeCliEnv } from '../../utils/envUtils.js'
import {
  resetSyncCache as resetLeafCache,
  setEligibility,
} from './syncCacheState.js'
let cached: boolean | undefined
export function resetSyncCache(): void {
  cached = undefined
  resetLeafCache()
}
export function isRemoteManagedSettingsEligible(): boolean {
  if (cached !== undefined) return cached
  if (true) {
    return (cached = setEligibility(false))
  }
  if (!isFirstPartyBaseUrl()) {
    return (cached = setEligibility(false))
  }
  if (getOpenCodeCliEnv('LAUNCH_MODE') === 'local-agent') {
    return (cached = setEligibility(false))
  }
  const tokens = getOpenCodeCliOAuthTokens()
  if (tokens?.accessToken && tokens.subscriptionType === null) {
    return (cached = setEligibility(true))
  }
  if (
    tokens?.accessToken &&
    tokens.scopes?.includes(OPEN_CODE_CLI_API_SCOPE) &&
    (tokens.subscriptionType === 'enterprise' ||
      tokens.subscriptionType === 'team')
  ) {
    return (cached = setEligibility(true))
  }
  try {
    const { key: apiKey } = getProviderApiKeyWithSource({
      skipRetrievingKeyFromApiKeyHelper: true,
    })
    if (apiKey) {
      return (cached = setEligibility(true))
    }
  } catch {
  }
  return (cached = setEligibility(false))
}
