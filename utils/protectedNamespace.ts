/**
 * Allowlist check for ant-only "protected" namespaces. Loaded via require()
 * behind a USER_TYPE === 'ant' guard so the allowlist is stripped from public
 * builds.
 */
export function checkProtectedNamespace(): boolean {
  throw new Error('not implemented')
}
