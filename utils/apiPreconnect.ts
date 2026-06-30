import { getOauthConfig } from '../constants/oauth.js'
import { isEssentialTrafficOnly } from './privacyLevel.js'
let fired = false
export function preconnectProviderApi(): void {
  if (fired) return
  fired = true
  if (isEssentialTrafficOnly()) {
    return
  }
  if (
    process.env.HTTPS_PROXY ||
    process.env.https_proxy ||
    process.env.HTTP_PROXY ||
    process.env.http_proxy ||
    process.env.OPEN_CODE_CLI_UNIX_SOCKET ||
    process.env.OPEN_CODE_CLI_CLIENT_CERT ||
    process.env.OPEN_CODE_CLI_CLIENT_KEY
  ) {
    return
  }
  const baseUrl =
    process.env.OPEN_CODE_CLI_REMOTE_BASE_URL || getOauthConfig().BASE_API_URL
  void fetch(baseUrl, {
    method: 'HEAD',
    signal: AbortSignal.timeout(10_000),
  }).catch(() => {})
}
