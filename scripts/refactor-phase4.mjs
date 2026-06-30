#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { join, dirname } from 'path'

const ROOT = join(dirname(new URL(import.meta.url).pathname), '..')
const SKIP = new Set(['node_modules', 'dist', '.git', 'scripts'])

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

const pairs = [
  ['<betas...>', '<headers...>'],
  ['STATE.sdkApiHeaders = betas', 'STATE.sdkApiHeaders = apiHeaders'],
  ['getContextWindowForModel(model, betas)', 'getContextWindowForModel(model, apiHeaders)'],
  ['if (betas?.includes', 'if (apiHeaders?.includes'],
  ['const betas = getMergedApiHeaders', 'const apiHeaders = getMergedApiHeaders'],
  ['const betas = [...getModelApiHeaders', 'const apiHeaders = [...getModelApiHeaders'],
  ['toolSearchEnabled', 'capabilitySearchEnabled'],
  ['toolSearchHeader', 'capabilitySearchHeader'],
  ['lastRequestBetas', 'lastRequestApiHeaders'],
  ['betas.CACHE_EDITING_HEADER', 'apiHeadersModule.CACHE_EDITING_HEADER'],
  ['...(betas?.length', '...(apiHeaders?.length'],
  ['apiHeaders: betas.join', 'apiHeaders: apiHeaders.join'],
  ['options.betas', 'options.apiHeaders'],
  ['coreFields.betas', 'coreFields.apiHeaders'],
  ['core.betas', 'core.apiHeaders'],
  ['`betas changed', '`api headers changed'],
  ['prefetchAwsCredentialsAndBedRockInfoIfSafe', 'prefetchAwsCredentialsIfSafe'],
  ['AWS_BEARER_TOKEN_BEDROCK', 'AWS_BEARER_TOKEN'],
  ['MAX_MCP_OUTPUT_TOKENS', 'MAX_MCP_COMPLETION_TOKENS'],
  ['DEFAULT_MAX_MCP_OUTPUT_TOKENS', 'DEFAULT_MAX_MCP_COMPLETION_TOKENS'],
  ['FLOOR_OUTPUT_TOKENS', 'FLOOR_COMPLETION_TOKENS'],
  ['DEFAULT_MAX_INPUT_TOKENS', 'DEFAULT_MAX_PROMPT_TOKENS'],
  ['DEFAULT_TARGET_INPUT_TOKENS', 'DEFAULT_TARGET_PROMPT_TOKENS'],
  ['API_MAX_INPUT_TOKENS', 'API_MAX_PROMPT_TOKENS'],
  ['API_TARGET_INPUT_TOKENS', 'API_TARGET_PROMPT_TOKENS'],
  ['SdkBetaSchema', 'SdkApiHeaderSchema'],
  ['SdkBeta', 'SdkApiHeader'],
  ['--betas', '--api-headers'],
  ['betaSessionTracing', 'previewSessionTracing'],
  ['isBetaTracingEnabled', 'isPreviewTracingEnabled'],
  ['addBetaInteractionAttributes', 'addPreviewInteractionAttributes'],
  ['addBetaLLMRequestAttributes', 'addPreviewLLMRequestAttributes'],
  ['addBetaLLMResponseAttributes', 'addPreviewLLMResponseAttributes'],
  ['addBetaToolInputAttributes', 'addPreviewToolInputAttributes'],
  ['addBetaToolResultAttributes', 'addPreviewToolResultAttributes'],
  ['clearBetaTracingState', 'clearPreviewTracingState'],
]

for (const f of walk(ROOT, ['.ts', '.tsx', '.md', '.json'])) {
  let c = readFileSync(f, 'utf8')
  const o = c
  for (const [a, b] of pairs) c = c.split(a).join(b)
  if (c !== o) writeFileSync(f, c, 'utf8')
}

const envUtils = join(ROOT, 'utils/envUtils.ts')
let eu = readFileSync(envUtils, 'utf8')
eu = eu.replace(/const VERTEX_REGION_OVERRIDES:[\s\S]*?export function getProviderRegionForModel[\s\S]*?return getDefaultProviderRegion\(\)\n\}/,
`export function getProviderRegionForModel(
  _model: string | undefined,
): string | undefined {
  return getDefaultProviderRegion()
}`)
writeFileSync(envUtils, eu, 'utf8')

const oauth = join(ROOT, 'components/ConsoleOAuthFlow.tsx')
let oc = readFileSync(oauth, 'utf8')
oc = oc.replace(/t5 = <Text>· Amazon OpenCodeCli:[\s\S]*?t7 = <Box[^>]*>[\s\S]*?<\/Box>;/, '')
writeFileSync(oauth, oc, 'utf8')

const pkgPath = join(ROOT, 'package.json')
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
delete pkg.dependencies['feature-flags-sdk']
delete pkg.dependencies['@growthbook/growthbook']
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8')

try {
  const betaPath = join(ROOT, 'utils/telemetry/betaSessionTracing.ts')
  const previewPath = join(ROOT, 'utils/telemetry/previewSessionTracing.ts')
  const { renameSync } = await import('fs')
  renameSync(betaPath, previewPath)
} catch {}

console.log('Phase 4 complete')
