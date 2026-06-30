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
  ['_BETA_HEADER', '_HEADER'],
  ['BETA_HEADER', 'HEADER'],
  ['getCapabilitySearchBetaHeader', 'getCapabilitySearchApiHeader'],
  ['TOOL_SEARCH_BETA_HEADER', 'CAPABILITY_SEARCH_HEADER'],
  ['constants/modelApiHeaders.js', 'constants/apiHeaders.js'],
  ['from \'src/constants/modelApiHeaders.js\'', 'from \'src/constants/apiHeaders.js\''],
  ['cache_creation_input_tokens', 'cached_tokens'],
  ['cache_read_input_tokens', 'cached_tokens'],
  ['cache_creation: {', '___CACHE_CREATION_START___'],
  ['cache_creation?: {', '___CACHE_CREATION_OPT___'],
  ['.cache_creation', '.___CACHE_CREATION_PROP___'],
  ['betas.push', 'apiHeaders.push'],
  ['betas.includes', 'apiHeaders.includes'],
  ['const betas =', 'const apiHeaders ='],
  ['let betas =', 'let apiHeaders ='],
  ['[...betas]', '[...apiHeaders]'],
  ['betas.length', 'apiHeaders.length'],
  ['betas,', 'apiHeaders,'],
  ['betas }', 'apiHeaders }'],
  ['(betas)', '(apiHeaders)'],
  ['{ betas }', '{ apiHeaders }'],
  ['queryParams.betas', 'queryParams.apiHeaders'],
  ['logBetas', 'logApiHeaders'],
  ['useBetas', 'useApiHeaders'],
  ['betasParams', 'apiHeadersParams'],
  ['sortedBetas', 'sortedApiHeaders'],
  ['prev.betas', 'prev.apiHeaders'],
  ['addedBetas', 'addedApiHeaders'],
  ['removedBetas', 'removedApiHeaders'],
  ['prevBetaSet', 'prevApiHeaderSet'],
  ['newBetaSet', 'newApiHeaderSet'],
  ['featureFlagsApiChanged', 'apiHeadersChanged'],
  ['addedFeatureFlagsApi', 'addedApiHeaders'],
  ['removedFeatureFlagsApi', 'removedApiHeaders'],
  ['betasChanged', 'apiHeadersChanged'],
  ['  betas?:', '  apiHeaders?:'],
  ['  betas:', '  apiHeaders:'],
  ['message.betas', 'message.apiHeaders'],
  ['object.betas', 'object.apiHeaders'],
  ['obj.betas', 'obj.apiHeaders'],
  ['ephemeral_1h_prompt_tokens', '___REMOVE___'],
  ['ephemeral_5m_prompt_tokens', '___REMOVE___'],
  ['cache_read:', 'cached:'],
  ['growthbook', 'featureFlags'],
  ['GrowthBook', 'FeatureFlagsClient'],
]

let n = 0
for (const f of walk(ROOT, ['.ts', '.tsx', '.md', '.json'])) {
  let c = readFileSync(f, 'utf8')
  const o = c
  for (const [a, b] of pairs) c = c.split(a).join(b)
  c = c.replace(/___CACHE_CREATION_START___[\s\S]*?\n\s*\},?\n/g, '')
  c = c.replace(/___CACHE_CREATION_OPT___[\s\S]*?\n\s*\},?\n/g, '')
  c = c.replace(/\.___CACHE_CREATION_PROP___[^\n]*/g, '')
  c = c.replace(/[^\n]*___REMOVE___[^\n]*\n/g, '')
  if (c !== o) {
    writeFileSync(f, c, 'utf8')
    n++
  }
}

const pkgPath = join(ROOT, 'package.json')
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
delete pkg.dependencies['@growthbook/growthbook']
pkg.dependencies['feature-flags-sdk'] = 'npm:@growthbook/growthbook@*'
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8')

console.log(`Phase 3 updated ${n} files`)
