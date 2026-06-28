import axios from 'axios'
import { getOauthConfig } from '../../constants/oauth.js'
import {
  getOauthAccountInfo,
  getSubscriptionType,
  isOpenCodeCliSubscriber,
} from '../../utils/auth.js'
import { getGlobalConfig, saveGlobalConfig } from '../../utils/config.js'
import { logForDebugging } from '../../utils/debug.js'
import { logError } from '../../utils/log.js'
import { isEssentialTrafficOnly } from '../../utils/privacyLevel.js'
import { getOAuthHeaders, prepareApiRequest } from '../../utils/teleport/api.js'
import type {
  ReferralCampaign,
  ReferralEligibilityResponse,
  ReferralRedemptionsResponse,
  ReferrerRewardInfo,
} from '../oauth/types.js'
const CACHE_EXPIRATION_MS = 24 * 60 * 60 * 1000
let fetchInProgress: Promise<ReferralEligibilityResponse | null> | null = null
export async function fetchReferralEligibility(
  campaign: ReferralCampaign = 'open_code_cli_guest_pass',
): Promise<ReferralEligibilityResponse> {
  const { accessToken, orgUUID } = await prepareApiRequest()
  const headers = {
    ...getOAuthHeaders(accessToken),
    'x-organization-uuid': orgUUID,
  }
  const url = `${getOauthConfig().BASE_API_URL}/api/oauth/organizations/${orgUUID}/referral/eligibility`
  const response = await axios.get(url, {
    headers,
    params: { campaign },
    timeout: 5000, // 5 second timeout for background fetch
  })
  return response.data
}
export async function fetchReferralRedemptions(
  campaign: string = 'open_code_cli_guest_pass',
): Promise<ReferralRedemptionsResponse> {
  const { accessToken, orgUUID } = await prepareApiRequest()
  const headers = {
    ...getOAuthHeaders(accessToken),
    'x-organization-uuid': orgUUID,
  }
  const url = `${getOauthConfig().BASE_API_URL}/api/oauth/organizations/${orgUUID}/referral/redemptions`
  const response = await axios.get<ReferralRedemptionsResponse>(url, {
    headers,
    params: { campaign },
    timeout: 10000, // 10 second timeout
  })
  return response.data
}
function shouldCheckForPasses(): boolean {
  return !!(
    getOauthAccountInfo()?.organizationUuid &&
    isOpenCodeCliSubscriber() &&
    getSubscriptionType() === 'max'
  )
}
export function checkCachedPassesEligibility(): {
  eligible: boolean
  needsRefresh: boolean
  hasCache: boolean
} {
  if (!shouldCheckForPasses()) {
    return {
      eligible: false,
      needsRefresh: false,
      hasCache: false,
    }
  }
  const orgId = getOauthAccountInfo()?.organizationUuid
  if (!orgId) {
    return {
      eligible: false,
      needsRefresh: false,
      hasCache: false,
    }
  }
  const config = getGlobalConfig()
  const cachedEntry = config.passesEligibilityCache?.[orgId]
  if (!cachedEntry) {
    return {
      eligible: false,
      needsRefresh: true,
      hasCache: false,
    }
  }
  const { eligible, timestamp } = cachedEntry
  const now = Date.now()
  const needsRefresh = now - timestamp > CACHE_EXPIRATION_MS
  return {
    eligible,
    needsRefresh,
    hasCache: true,
  }
}
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  BRL: 'R$',
  CAD: 'CA$',
  AUD: 'A$',
  NZD: 'NZ$',
  SGD: 'S$',
}
export function formatCreditAmount(reward: ReferrerRewardInfo): string {
  const symbol = CURRENCY_SYMBOLS[reward.currency] ?? `${reward.currency} `
  const amount = reward.amount_minor_units / 100
  const formatted = amount % 1 === 0 ? amount.toString() : amount.toFixed(2)
  return `${symbol}${formatted}`
}
export function getCachedReferrerReward(): ReferrerRewardInfo | null {
  const orgId = getOauthAccountInfo()?.organizationUuid
  if (!orgId) return null
  const config = getGlobalConfig()
  const cachedEntry = config.passesEligibilityCache?.[orgId]
  return cachedEntry?.referrer_reward ?? null
}
export function getCachedRemainingPasses(): number | null {
  const orgId = getOauthAccountInfo()?.organizationUuid
  if (!orgId) return null
  const config = getGlobalConfig()
  const cachedEntry = config.passesEligibilityCache?.[orgId]
  return cachedEntry?.remaining_passes ?? null
}
export async function fetchAndStorePassesEligibility(): Promise<ReferralEligibilityResponse | null> {
  if (fetchInProgress) {
    logForDebugging('Passes: Reusing in-flight eligibility fetch')
    return fetchInProgress
  }
  const orgId = getOauthAccountInfo()?.organizationUuid
  if (!orgId) {
    return null
  }
  fetchInProgress = (async () => {
    try {
      const response = await fetchReferralEligibility()
      const cacheEntry = {
        ...response,
        timestamp: Date.now(),
      }
      saveGlobalConfig(current => ({
        ...current,
        passesEligibilityCache: {
          ...current.passesEligibilityCache,
          [orgId]: cacheEntry,
        },
      }))
      logForDebugging(
        `Passes eligibility cached for org ${orgId}: ${response.eligible}`,
      )
      return response
    } catch (error) {
      logForDebugging('Failed to fetch and cache passes eligibility')
      logError(error as Error)
      return null
    } finally {
      fetchInProgress = null
    }
  })()
  return fetchInProgress
}
export async function getCachedOrFetchPassesEligibility(): Promise<ReferralEligibilityResponse | null> {
  if (!shouldCheckForPasses()) {
    return null
  }
  const orgId = getOauthAccountInfo()?.organizationUuid
  if (!orgId) {
    return null
  }
  const config = getGlobalConfig()
  const cachedEntry = config.passesEligibilityCache?.[orgId]
  const now = Date.now()
  if (!cachedEntry) {
    logForDebugging(
      'Passes: No cache, fetching eligibility in background (command unavailable this session)',
    )
    void fetchAndStorePassesEligibility()
    return null
  }
  if (now - cachedEntry.timestamp > CACHE_EXPIRATION_MS) {
    logForDebugging(
      'Passes: Cache stale, returning cached data and refreshing in background',
    )
    void fetchAndStorePassesEligibility() 
    const { timestamp, ...response } = cachedEntry
    return response as ReferralEligibilityResponse
  }
  logForDebugging('Passes: Using fresh cached eligibility data')
  const { timestamp, ...response } = cachedEntry
  return response as ReferralEligibilityResponse
}
export async function prefetchPassesEligibility(): Promise<void> {
  if (isEssentialTrafficOnly()) {
    return
  }
  void getCachedOrFetchPassesEligibility()
}
