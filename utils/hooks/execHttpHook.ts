import axios from 'axios'
import type { HookEvent } from 'src/entrypoints/agentSdkTypes.js'
import { createCombinedAbortSignal } from '../combinedAbortSignal.js'
import { logForDebugging } from '../debug.js'
import { errorMessage } from '../errors.js'
import { getProxyUrl, shouldBypassProxy } from '../proxy.js'
import * as settingsModule from '../settings/settings.js'
import type { HttpHook } from '../settings/types.js'
import { ssrfGuardedLookup } from './ssrfGuard.js'
const DEFAULT_HTTP_HOOK_TIMEOUT_MS = 10 * 60 * 1000 
async function getSandboxProxyConfig(): Promise<
  { host: string; port: number; protocol: string } | undefined
> {
  const { SandboxManager } = await import('../sandbox/sandbox-adapter.js')
  if (!SandboxManager.isSandboxingEnabled()) {
    return undefined
  }
  await SandboxManager.waitForNetworkInitialization()
  const proxyPort = SandboxManager.getProxyPort()
  if (!proxyPort) {
    return undefined
  }
  return { host: '127.0.0.1', port: proxyPort, protocol: 'http' }
}
function getHttpHookPolicy(): {
  allowedUrls: string[] | undefined
  allowedEnvVars: string[] | undefined
} {
  const settings = settingsModule.getInitialSettings()
  return {
    allowedUrls: settings.allowedHttpHookUrls,
    allowedEnvVars: settings.httpHookAllowedEnvVars,
  }
}
function urlMatchesPattern(url: string, pattern: string): boolean {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&')
  const regexStr = escaped.replace(/\*/g, '.*')
  return new RegExp(`^${regexStr}$`).test(url)
}
function sanitizeHeaderValue(value: string): string {
  return value.replace(/[\r\n\x00]/g, '')
}
function interpolateEnvVars(
  value: string,
  allowedEnvVars: ReadonlySet<string>,
): string {
  const interpolated = value.replace(
    /\$\{([A-Z_][A-Z0-9_]*)\}|\$([A-Z_][A-Z0-9_]*)/g,
    (_, braced, unbraced) => {
      const varName = braced ?? unbraced
      if (!allowedEnvVars.has(varName)) {
        logForDebugging(
          `Hooks: env var $${varName} not in allowedEnvVars, skipping interpolation`,
          { level: 'warn' },
        )
        return ''
      }
      return process.env[varName] ?? ''
    },
  )
  return sanitizeHeaderValue(interpolated)
}
export async function execHttpHook(
  hook: HttpHook,
  _hookEvent: HookEvent,
  jsonInput: string,
  signal?: AbortSignal,
): Promise<{
  ok: boolean
  statusCode?: number
  body: string
  error?: string
  aborted?: boolean
}> {
  const policy = getHttpHookPolicy()
  if (policy.allowedUrls !== undefined) {
    const matched = policy.allowedUrls.some(p => urlMatchesPattern(hook.url, p))
    if (!matched) {
      const msg = `HTTP hook blocked: ${hook.url} does not match any pattern in allowedHttpHookUrls`
      logForDebugging(msg, { level: 'warn' })
      return { ok: false, body: '', error: msg }
    }
  }
  const timeoutMs = hook.timeout
    ? hook.timeout * 1000
    : DEFAULT_HTTP_HOOK_TIMEOUT_MS
  const { signal: combinedSignal, cleanup } = createCombinedAbortSignal(
    signal,
    { timeoutMs },
  )
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (hook.headers) {
      const hookVars = hook.allowedEnvVars ?? []
      const effectiveVars =
        policy.allowedEnvVars !== undefined
          ? hookVars.filter(v => policy.allowedEnvVars!.includes(v))
          : hookVars
      const allowedEnvVars = new Set(effectiveVars)
      for (const [name, value] of Object.entries(hook.headers)) {
        headers[name] = interpolateEnvVars(value, allowedEnvVars)
      }
    }
    const sandboxProxy = await getSandboxProxyConfig()
    const envProxyActive =
      !sandboxProxy &&
      getProxyUrl() !== undefined &&
      !shouldBypassProxy(hook.url)
    if (sandboxProxy) {
      logForDebugging(
        `Hooks: HTTP hook POST to ${hook.url} (via sandbox proxy :${sandboxProxy.port})`,
      )
    } else if (envProxyActive) {
      logForDebugging(
        `Hooks: HTTP hook POST to ${hook.url} (via env-var proxy)`,
      )
    } else {
      logForDebugging(`Hooks: HTTP hook POST to ${hook.url}`)
    }
    const response = await axios.post<string>(hook.url, jsonInput, {
      headers,
      signal: combinedSignal,
      responseType: 'text',
      validateStatus: () => true,
      maxRedirects: 0,
      proxy: sandboxProxy ?? false,
      lookup: sandboxProxy || envProxyActive ? undefined : ssrfGuardedLookup,
    })
    cleanup()
    const body = response.data ?? ''
    logForDebugging(
      `Hooks: HTTP hook response status ${response.status}, body length ${body.length}`,
    )
    return {
      ok: response.status >= 200 && response.status < 300,
      statusCode: response.status,
      body,
    }
  } catch (error) {
    cleanup()
    if (combinedSignal.aborted) {
      return { ok: false, body: '', aborted: true }
    }
    const errorMsg = errorMessage(error)
    logForDebugging(`Hooks: HTTP hook error: ${errorMsg}`, { level: 'error' })
    return { ok: false, body: '', error: errorMsg }
  }
}
