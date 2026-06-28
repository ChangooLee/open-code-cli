/**
 * Parse a `cc://` / `cc+unix://` connect URL into a server URL and auth token.
 */
export function parseConnectUrl(ccUrl: string): {
  serverUrl: string
  authToken?: string
} {
  throw new Error('not implemented')
}
