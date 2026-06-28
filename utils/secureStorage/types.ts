import type { OAuthTokens } from '../../services/oauth/types.js'

/**
 * A single persisted MCP OAuth token/client entry, keyed by server.
 */
export type McpOAuthEntry = {
  serverName?: string
  serverUrl?: string
  accessToken: string
  refreshToken?: string
  expiresAt: number
  scope?: string
  clientId?: string
  clientSecret?: string
  stepUpScope?: string
  discoveryState?: {
    authorizationServerUrl?: string
    resourceMetadataUrl?: string
    resourceMetadata?: unknown
    authorizationServerMetadata?: unknown
  }
}

/**
 * The full credential blob persisted by a SecureStorage backend. Every field is
 * optional so an empty object (`{}`) is a valid, fully-cleared store.
 */
export type SecureStorageData = {
  openCodeCliOauth?: OAuthTokens
  mcpOAuth?: Record<string, McpOAuthEntry>
  mcpOAuthClientConfig?: Record<string, { clientSecret?: string }>
  mcpXaaIdp?: Record<string, { idToken: string; expiresAt: number }>
  mcpXaaIdpConfig?: Record<string, { clientSecret?: string }>
  pluginSecrets?: Record<string, Record<string, string>>
  trustedDeviceToken?: string
}

/**
 * A pluggable secure-credential backend (keychain, plaintext file, or a
 * fallback composition of the two).
 */
export type SecureStorage = {
  name: string
  read(): SecureStorageData | null
  readAsync(): Promise<SecureStorageData | null>
  update(data: SecureStorageData): { success: boolean; warning?: string }
  delete(): boolean
}
