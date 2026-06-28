import { feature } from 'bun:bundle'
import { getFeatureValue_CACHED_MAY_BE_STALE } from '../services/analytics/growthbook.js'
import {
  getOpenCodeCliOAuthTokens,
  isOpenAICompatibleAuthEnabled,
} from '../utils/auth.js'
export function isVoiceGrowthBookEnabled(): boolean {
  return feature('VOICE_MODE')
    ? !getFeatureValue_CACHED_MAY_BE_STALE('open_code_cli_amber_quartz_disabled', false)
    : false
}
export function hasVoiceAuth(): boolean {
  if (!isOpenAICompatibleAuthEnabled()) {
    return false
  }
  const tokens = getOpenCodeCliOAuthTokens()
  return Boolean(tokens?.accessToken)
}
export function isVoiceModeEnabled(): boolean {
  return hasVoiceAuth() && isVoiceGrowthBookEnabled()
}
