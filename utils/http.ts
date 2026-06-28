import axios from 'axios'
import { OAUTH_BETA_HEADER } from '../constants/oauth.js'
import {
  getOpenAICompatibleApiKey,
  getOpenCodeCliOAuthTokens,
  handleOAuth401Error,
  isOpenCodeCliSubscriber,
} from './auth.js'
import { getOpenCodeCliUserAgent } from './userAgent.js'
import { getOpenCodeCliEnv } from './envUtils.js'
import { getWorkload } from './workloadContext.js'
export function getOpenCodeCliHttpUserAgent(): string {
  const agentSdkVersion = process.env.OPEN_CODE_AGENT_SDK_VERSION
    ? `, agent-sdk/${process.env.OPEN_CODE_AGENT_SDK_VERSION}`
    : ''
  const clientApp = process.env.OPEN_CODE_AGENT_SDK_CLIENT_APP
    ? `, client-app/${process.env.OPEN_CODE_AGENT_SDK_CLIENT_APP}`
    : ''
  const workload = getWorkload()
  const workloadSuffix = workload ? `, workload/${workload}` : ''
  return `open-code-cli/${MACRO.VERSION} (${process.env.USER_TYPE}, ${getOpenCodeCliEnv('ENTRYPOINT') ?? 'cli'}${agentSdkVersion}${clientApp}${workloadSuffix})`
}
export const getUserAgent = getOpenCodeCliHttpUserAgent
export function getMCPUserAgent(): string {
  const parts: string[] = []
  const entrypoint = getOpenCodeCliEnv('ENTRYPOINT')
  if (entrypoint) {
    parts.push(entrypoint)
  }
  if (process.env.OPEN_CODE_AGENT_SDK_VERSION) {
    parts.push(`agent-sdk/${process.env.OPEN_CODE_AGENT_SDK_VERSION}`)
  }
  if (process.env.OPEN_CODE_AGENT_SDK_CLIENT_APP) {
    parts.push(`client-app/${process.env.OPEN_CODE_AGENT_SDK_CLIENT_APP}`)
  }
  const suffix = parts.length > 0 ? ` (${parts.join(', ')})` : ''
  return `open-code-cli/${MACRO.VERSION}${suffix}`
}
export function getWebFetchUserAgent(): string {
  return `Open Code CLI-User (${getOpenCodeCliUserAgent()}; +https://support.openai-compatible.com/)`
}
export type AuthHeaders = {
  headers: Record<string, string>
  error?: string
}
export function getAuthHeaders(): AuthHeaders {
  if (isOpenCodeCliSubscriber()) {
    const oauthTokens = getOpenCodeCliOAuthTokens()
    if (!oauthTokens?.accessToken) {
      return {
        headers: {},
        error: 'No OAuth token available',
      }
    }
    return {
      headers: {
        Authorization: `Bearer ${oauthTokens.accessToken}`,
        'openai-compatible-beta': OAUTH_BETA_HEADER,
      },
    }
  }
  const apiKey = getOpenAICompatibleApiKey()
  if (!apiKey) {
    return {
      headers: {},
      error: 'No API key available',
    }
  }
  return {
    headers: {
      'x-api-key': apiKey,
    },
  }
}
export async function withOAuth401Retry<T>(
  request: () => Promise<T>,
  opts?: { also403Revoked?: boolean },
): Promise<T> {
  try {
    return await request()
  } catch (err) {
    if (!axios.isAxiosError(err)) throw err
    const status = err.response?.status
    const isAuthError =
      status === 401 ||
      (opts?.also403Revoked &&
        status === 403 &&
        typeof err.response?.data === 'string' &&
        err.response.data.includes('OAuth token has been revoked'))
    if (!isAuthError) throw err
    const failedAccessToken = getOpenCodeCliOAuthTokens()?.accessToken
    if (!failedAccessToken) throw err
    await handleOAuth401Error(failedAccessToken)
    return await request()
  }
}
