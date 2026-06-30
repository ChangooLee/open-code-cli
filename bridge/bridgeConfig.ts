import { getOauthConfig } from '../constants/oauth.js'
import { getOpenCodeCliOAuthTokens } from '../utils/auth.js'
export function getBridgeTokenOverride(): string | undefined {
  return (
    (process.env.USER_TYPE === 'ant' &&
      process.env.OPEN_CODE_BRIDGE_OAUTH_TOKEN) ||
    undefined
  )
}
export function getBridgeBaseUrlOverride(): string | undefined {
  return (
    (process.env.USER_TYPE === 'ant' && process.env.OPEN_CODE_BRIDGE_BASE_URL) ||
    undefined
  )
}
export function getBridgeAccessToken(): string | undefined {
  return getBridgeTokenOverride() ?? getOpenCodeCliOAuthTokens()?.accessToken
}
export function getBridgeBaseUrl(): string {
  return getBridgeBaseUrlOverride() ?? getOauthConfig().BASE_API_URL
}
