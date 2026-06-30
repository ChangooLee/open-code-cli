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

const lineRemovals = [
  /^\s*:\s*0,?\s*$/,
  /^\s*:\s*usage\?\.\s*\?\?\s*undefined,?\s*$/,
  /^\s*:\s*advisorUsage\.\s*\?\?\s*0,?\s*$/,
  /^\s*compactionCacheCreationTokens:\s*compactionUsage\?\.\s*\?\?\s*0,?\s*$/,
  /^\s*:\s*partUsage\.\s*!=/,
  /^\s*partUsage\.\s*>\s*0\s*$/,
  /^\s*\?\s*partUsage\.\s*$/,
]

const replacements = [
  [/0service_tier/g, 'partUsage.service_tier ?? usage.service_tier'],
  [/0inference_geo/g, 'partUsage.inference_geo ?? usage.inference_geo'],
  [/0speed/g, 'partUsage.speed ?? usage.speed'],
  [/0inputTokens/g, 'usage.inputTokens'],
  [/0outputTokens/g, 'usage.outputTokens'],
  [/0cacheReadInputTokens/g, 'usage.cacheReadInputTokens'],
  [/0cacheCreationInputTokens/g, 'usage.cacheCreationInputTokens'],
  [/0webSearchRequests/g, 'usage.webSearchRequests'],
  [/0costUSD/g, 'usage.costUSD'],
  [/\(compactionUsage\. \?\? 0\)/g, '0'],
  [/compactionUsage\?\. \?\? 0/g, '0'],
  [/getTokenCounter\(\)\?\.add\(0 \?\? 0,/g, 'getTokenCounter()?.add(0,'],
  [/modelUsage\.cacheCreationInputTokens \+= 0 \?\? 0/g, 'modelUsage.cacheCreationInputTokens += 0'],
]

let n = 0
for (const f of walk(ROOT, ['.ts', '.tsx'])) {
  let lines = readFileSync(f, 'utf8').split('\n')
  const orig = lines.join('\n')
  lines = lines.filter(line => !lineRemovals.some(re => re.test(line)))
  let c = lines.join('\n')
  for (const [re, rep] of replacements) c = c.replace(re, rep)
  if (c !== orig) {
    writeFileSync(f, c, 'utf8')
    n++
  }
}
console.log(`Fixed ${n} files`)
