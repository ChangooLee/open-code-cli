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

const fixes = [
  [/usage\. \?\?/g, '0 ??'],
  [/usage\. \|\|/g, '0 ||'],
  [/usage\.,/g, '0,'],
  [/usage\. \+/g, '0 +'],
  [/usage\.;/g, '0;'],
  [/usage\. \)/g, '0)'],
  [/:\s*usage\./g, ': 0'],
  [/,\s*:\s*z\.number\(\)/g, ''],
  [/^\s*:\s*z\.number\(\),?\n/gm, ''],
  [/^\s*\?: number \| null;\n/gm, ''],
  [/,\s*\n\s*:\s*usage\. \?\? 0,/g, ','],
  [/,\s*\n\s*:\s*0 \?\? 0,/g, ','],
  [/prompt_tokens: z\.number\(\),\n\s*completion_tokens: z\.number\(\),\n\s*: z\.number\(\),/g,
    'prompt_tokens: z.number(),\n          completion_tokens: z.number(),'],
]

let n = 0
for (const f of walk(ROOT, ['.ts', '.tsx'])) {
  let c = readFileSync(f, 'utf8')
  const o = c
  for (const [re, rep] of fixes) c = c.replace(re, rep)
  if (c !== o) {
    writeFileSync(f, c, 'utf8')
    n++
  }
}
console.log(`Fixed ${n} files`)
