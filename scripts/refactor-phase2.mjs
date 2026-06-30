#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, statSync, renameSync, unlinkSync, existsSync } from 'fs'
import { join, dirname } from 'path'

const ROOT = join(dirname(new URL(import.meta.url).pathname), '..')
const SKIP = new Set(['node_modules', 'dist', '.git'])

function walk(dir, exts, out = []) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n)
    if (SKIP.has(n)) continue
    const st = statSync(p)
    if (st.isDirectory()) walk(p, exts, out)
    else if (exts.some(e => n.endsWith(e))) out.push(p)
  }
  return out
}

function rw(p, fn) {
  const c = readFileSync(p, 'utf8')
  const n = fn(c)
  if (n !== c) writeFileSync(p, n, 'utf8')
}

const renames = [
  ['utils/betas.ts', 'utils/modelApiHeaders.ts'],
  ['constants/featureFlagsApi.ts', 'constants/apiHeaders.ts'],
  ['constants/betas.ts', null],
]

for (const [from, to] of renames) {
  const fp = join(ROOT, from)
  if (!existsSync(fp)) continue
  if (to === null) {
    unlinkSync(fp)
    continue
  }
  const tp = join(ROOT, to)
  renameSync(fp, tp)
}

const pairs = [
  ['modelApiHeaders.js', 'modelApiHeaders.js'],
  ['apiHeaders.js', 'apiHeaders.js'],
  ['getSdkApiHeaders', 'getSdkApiHeaders'],
  ['setSdkApiHeaders', 'setSdkApiHeaders'],
  ['sdkApiHeaders', 'sdkApiHeaders'],
  ['SdkApiHeaders', 'SdkApiHeaders'],
  ['filterAllowedSdkApiHeaders', 'filterAllowedSdkApiHeaders'],
  ['getMergedApiHeaders', 'getMergedApiHeaders'],
  ['getModelApiHeaders', 'getModelApiHeaders'],
  ['getAllModelApiHeaders', 'getAllModelApiHeaders'],
  ['clearModelApiHeaderCaches', 'clearModelApiHeaderCaches'],
  ['shouldIncludeFirstPartyOnlyApiHeaders', 'shouldIncludeFirstPartyOnlyApiHeaders'],
  ['OPEN_CODE_CLI_DISABLE_EXPERIMENTAL_API_HEADERS', 'OPEN_CODE_CLI_DISABLE_EXPERIMENTAL_API_HEADERS'],
  ['MAX_COMPLETION_TOKENS', 'MAX_COMPLETION_TOKENS'],
  ['DEFAULT_MAX_COMPLETION_TOKENS', 'DEFAULT_MAX_COMPLETION_TOKENS'],
  ['OPEN_CODE_CLI_FILE_READ_MAX_COMPLETION_TOKENS', 'OPEN_CODE_CLI_FILE_READ_MAX_COMPLETION_TOKENS'],
  ['COMPACT_MAX_COMPLETION_TOKENS', 'COMPACT_MAX_COMPLETION_TOKENS'],
  ['featureFlagsDisable', 'featureFlagsDisable'],
  ['FEATURE_FLAGS_API_KEY', 'FEATURE_FLAGS_API_KEY'],
  ['ENABLE_FEATURE_FLAGS_DEV', 'ENABLE_FEATURE_FLAGS_DEV'],
  ['PROMPT_BAR_SETUP_AGENT', 'PROMPT_BAR_SETUP_AGENT'],
  ['PROMPT_BAR_SYSTEM_PROMPT', 'PROMPT_BAR_SYSTEM_PROMPT'],
  ['prompt bar setup agent', 'prompt bar setup agent'],
  ['prompt bar', 'prompt bar'],
  ['', ''],
  ['', ''],
  ['', ''],
  ['', ''],
  ['', ''],
  ['', ''],
  ['', ''],
  ['getOpenCodeCliEnv(\'ENTRYPOINT\')', "getOpenCodeCliEnv('LAUNCH_MODE')"],
  ['.option(\'--betas', '.option(\'--api-headers'],
  ['--api-headers <headers...>', '--api-headers <headers...>'],
  ['Optional API headers to include', 'Optional API headers to include'],
  ['apiHeaders = []', 'apiHeaders = []'],
  ['filterAllowedSdkApiHeaders(apiHeaders)', 'filterAllowedSdkApiHeaders(apiHeaders)'],
  ['  apiHeaders?: readonly string[]', '  apiHeaders?: readonly string[]'],
  ['  apiHeaders = []', '  apiHeaders = []'],
  ['  apiHeaders?: string[]', '  apiHeaders?: string[]'],
  ['apiHeaders?: string', 'apiHeaders?: string'],
  ['apiHeaders: getSdkApiHeaders()', 'apiHeaders: getSdkApiHeaders()'],
  ['apiHeaders:', 'apiHeaders:'],
  ['...(apiHeaders.length > 0 && { apiHeaders })', '...(apiHeaders.length > 0 && { apiHeaders })'],
  ['`[api-headers]', '`[api-headers]'],
]

for (const f of walk(ROOT, ['.ts', '.tsx', '.md', '.json', '.mjs'])) {
  if (f.includes('refactor-fork-evidence')) continue
  rw(f, c => {
    let s = c
    for (const [a, b] of pairs) s = s.split(a).join(b)
    return s
  })
}

const apiHeadersPath = join(ROOT, 'constants/apiHeaders.ts')
writeFileSync(apiHeadersPath, `import { feature } from 'bun:bundle'
export const OPEN_CODE_CLI_20250219_HEADER = 'open-code-cli-20250219'
export const INTERLEAVED_THINKING_HEADER = 'interleaved-thinking-2025-05-14'
export const CONTEXT_1M_HEADER = 'context-1m-2025-08-07'
export const CONTEXT_MANAGEMENT_HEADER = 'context-management-2025-06-27'
export const STRUCTURED_OUTPUTS_HEADER = 'structured-outputs-2025-12-15'
export const WEB_SEARCH_HEADER = 'web-search-2025-03-05'
export const CAPABILITY_SEARCH_HEADER_1P = 'advanced-tool-use-2025-11-20'
export const CAPABILITY_SEARCH_HEADER_3P = 'tool-search-tool-2025-10-19'
export const EFFORT_HEADER = 'effort-2025-11-24'
export const TASK_BUDGETS_HEADER = 'task-budgets-2026-03-13'
export const PROMPT_CACHING_SCOPE_HEADER = 'prompt-caching-scope-2026-01-05'
export const FAST_MODE_HEADER = 'fast-mode-2026-02-01'
export const REDACT_THINKING_HEADER = 'redact-thinking-2026-02-12'
export const TOKEN_EFFICIENT_TOOLS_HEADER = 'token-efficient-tools-2026-03-28'
export const SUMMARIZE_CONNECTOR_TEXT_HEADER = feature('CONNECTOR_TEXT')
  ? 'summarize-connector-text-2026-03-13'
  : ''
export const AFK_MODE_HEADER = feature('TRANSCRIPT_CLASSIFIER')
  ? 'afk-mode-2026-01-31'
  : ''
export const CLI_INTERNAL_HEADER =
  process.env.USER_TYPE === 'ant' ? 'cli-internal-2026-02-09' : ''
export const ADVISOR_HEADER = 'advisor-tool-2026-03-01'
export const CACHE_EDITING_HEADER =
  process.env.USER_TYPE === 'ant' ? 'cache-editing-2026-01-15' : ''
`, 'utf8')

const modelApiHeadersPath = join(ROOT, 'utils/modelApiHeaders.ts')
writeFileSync(modelApiHeadersPath, `import memoize from 'lodash-es/memoize.js'
import { getSdkApiHeaders } from '../bootstrap/state.js'
import { CAPABILITY_SEARCH_HEADER_1P } from '../constants/apiHeaders.js'

export function filterAllowedSdkApiHeaders(
  sdkApiHeaders: string[] | undefined,
): string[] | undefined {
  return sdkApiHeaders && sdkApiHeaders.length > 0 ? sdkApiHeaders : undefined
}

export function modelSupportsISP(_model: string): boolean {
  return false
}

export function modelSupportsContextManagement(_model: string): boolean {
  return false
}

export function modelSupportsStructuredOutputs(_model: string): boolean {
  return true
}

export function modelSupportsAutoMode(_model: string): boolean {
  return false
}

export function getCapabilitySearchApiHeader(): string {
  return CAPABILITY_SEARCH_HEADER_1P
}

export function shouldIncludeFirstPartyOnlyApiHeaders(): boolean {
  return false
}

export function shouldUseGlobalCacheScope(): boolean {
  return false
}

export const getAllModelApiHeaders = memoize((_model: string): string[] => [])
export const getModelApiHeaders = memoize((_model: string): string[] => [])
export const getExtraBodyParamsFeatures = memoize((_model: string): string[] => [])

export function getMergedApiHeaders(
  model: string,
  _options?: { isAgenticQuery?: boolean },
): string[] {
  return [...getModelApiHeaders(model), ...(getSdkApiHeaders() ?? [])]
}

export function clearModelApiHeaderCaches(): void {
  getAllModelApiHeaders.cache.clear?.()
  getModelApiHeaders.cache.clear?.()
  getExtraBodyParamsFeatures.cache.clear?.()
}
`, 'utf8')

console.log('Phase 2 complete')
