// open-code-cli capability benchmark.
//
// Runs the built CLI against a configured model over a suite of self-contained
// coding tasks. Each task ships starter files and a `check` command whose exit
// code is the objective verdict: 0 => the agent actually solved it.
//
// This replaces subjective "how close to X" estimates with a reproducible,
// model-agnostic success rate. Point it at any OpenAI-compatible endpoint:
//
//   OPEN_CODE_CLI_BASE_URL=https://api.example/v1 \
//   OPEN_CODE_CLI_MODEL=some-model \
//   OPEN_CODE_CLI_API_KEY=sk-... \
//   node scripts/bench.mjs
//
// Self-test the harness itself (no real model, deterministic mock):
//   node scripts/bench.mjs --mock                       # solve  => 2/2 pass
//   node scripts/bench.mjs --mock --mock-behavior=noop --assert  # noop => 0/2
//
// Optional: BENCH_FEATURES=VERIFY_IMPLEMENTATION_BEFORE_COMPLETION,BOUNDED_AUTONOMY
// builds the CLI with those ultracode-mechanism flags ON.
import { build } from 'esbuild'
import {
  readFileSync,
  readdirSync,
  mkdtempSync,
  mkdirSync,
  copyFileSync,
  existsSync,
  statSync,
} from 'node:fs'
import { dirname, resolve, join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { spawn, spawnSync } from 'node:child_process'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))

function makePlugins(enabledFeatures) {
  const bunBundlePlugin = {
    name: 'bun-bundle-macro',
    setup(b) {
      b.onResolve({ filter: /^bun:bundle$/ }, () => ({ path: 'bun:bundle', namespace: 'bun-bundle' }))
      b.onLoad({ filter: /.*/, namespace: 'bun-bundle' }, () => ({
        contents: `export function feature(flag) { return ${JSON.stringify([...enabledFeatures])}.includes(flag) }`,
        loader: 'js',
      }))
    },
  }
  const featureCallRe = /\bfeature\(\s*(['"])([A-Za-z0-9_]+)\1\s*\)/g
  const loaderByExt = { '.ts': 'ts', '.tsx': 'tsx', '.js': 'js', '.jsx': 'jsx' }
  const featureInlinePlugin = {
    name: 'feature-macro-inline',
    setup(b) {
      b.onLoad({ filter: /\.(ts|tsx|js|jsx)$/ }, async args => {
        if (args.path.includes('/node_modules/')) return null
        const { readFile } = await import('node:fs/promises')
        let source = await readFile(args.path, 'utf8')
        if (!source.includes('feature(')) return null
        source = source.replace(featureCallRe, (_m, _q, flag) => (enabledFeatures.has(flag) ? 'true' : 'false'))
        const ext = args.path.slice(args.path.lastIndexOf('.'))
        return { contents: source, loader: loaderByExt[ext] ?? 'ts' }
      })
    },
  }
  const optionalStubs = [
    /^sharp$/, /^cli-highlight$/, /^plist$/, /^image-processor-napi$/, /^audio-capture-napi$/,
    /^color-diff-napi$/, /^url-handler-napi$/, /^modifiers-napi$/, /^bun:ffi$/,
    /^@open-code-cli\/sandbox-isolation$/, /^@open-code-cli\/mcp-bundle$/, /^open-code-cli-sdk$/,
    /^@ant\//, /^@aws-sdk\//, /^@smithy\//, /^@opentelemetry\/exporter-/, /^vscode-jsonrpc\/node\.js$/,
  ]
  const optionalStubPlugin = {
    name: 'optional-stub',
    setup(b) {
      b.onResolve({ filter: /.*/ }, args =>
        optionalStubs.some(re => re.test(args.path)) ? { path: args.path, namespace: 'optional-stub' } : null,
      )
      b.onLoad({ filter: /.*/, namespace: 'optional-stub' }, () => ({
        contents:
          'const s = new Proxy(function(){}, { get: () => s, apply: () => s, construct: () => s }); module.exports = Object.create(s);',
        loader: 'js',
      }))
    },
  }
  return [optionalStubPlugin, featureInlinePlugin, bunBundlePlugin]
}

async function buildCli(outfile, features) {
  await build({
    entryPoints: [resolve(root, 'entrypoints/cli.tsx')],
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'esm',
    outfile,
    jsx: 'automatic',
    jsxImportSource: 'react',
    banner: {
      js: [
        '#!/usr/bin/env node',
        "import { createRequire as __occCreateRequire } from 'node:module';",
        'const require = __occCreateRequire(import.meta.url);',
      ].join('\n'),
    },
    alias: { src: root },
    plugins: makePlugins(new Set(features)),
    loader: { '.md': 'text', '.txt': 'text', '.node': 'file' },
    define: {
      'process.env.USER_TYPE': JSON.stringify('external'),
      'process.env.OPEN_CODE_CLI_VERIFY_PLAN': JSON.stringify('false'),
      'MACRO.VERSION': JSON.stringify(pkg.version),
      'MACRO.BUILD_TIME': JSON.stringify('bench'),
      'MACRO.PACKAGE_URL': JSON.stringify(pkg.name),
      'MACRO.NATIVE_PACKAGE_URL': JSON.stringify(`${pkg.name}-native`),
      'MACRO.ISSUES_EXPLAINER': JSON.stringify(''),
      'MACRO.VERSION_CHANGELOG': JSON.stringify(''),
      'MACRO.FEEDBACK_CHANNEL': JSON.stringify(''),
    },
    logLevel: 'warning',
  })
}

function copyTree(srcDir, destDir) {
  for (const name of readdirSync(srcDir)) {
    const s = join(srcDir, name)
    const d = join(destDir, name)
    if (statSync(s).isDirectory()) {
      mkdirSync(d, { recursive: true })
      copyTree(s, d)
    } else {
      copyFileSync(s, d)
    }
  }
}

function runTask(cliPath, task, workDir) {
  const r = spawnSync(
    'node',
    [
      cliPath,
      '-p',
      task.prompt,
      '--output-format',
      'stream-json',
      '--verbose',
      '--allowedTools',
      task.allowedTools || 'Read,Edit,Write,Bash',
      '--max-turns',
      String(task.maxTurns ?? 20),
    ],
    {
      cwd: workDir,
      encoding: 'utf8',
      input: '',
      env: { ...process.env },
      timeout: Number(process.env.BENCH_TIMEOUT_MS ?? 120000),
    },
  )
  const out = (r.stdout || '') + (r.stderr || '')
  const line = out
    .split('\n')
    .reverse()
    .find(l => l.includes('"type":"result"'))
  let result = null
  try {
    result = line ? JSON.parse(line) : null
  } catch {}
  return result
}

function runCheck(check, workDir) {
  const r = spawnSync('bash', ['-c', check], { cwd: workDir, encoding: 'utf8', timeout: 30000 })
  return {
    pass: r.status === 0,
    status: r.status,
    out: ((r.stdout || '') + (r.stderr || '')).trim(),
  }
}

// ---- main ----
const argv = process.argv.slice(2)
const useMock = argv.includes('--mock')
const doAssert = argv.includes('--assert')
const mockBehavior = (argv.find(a => a.startsWith('--mock-behavior=')) || '').split('=')[1] || 'solve'
const features = (process.env.BENCH_FEATURES ?? '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)

const tmp = mkdtempSync(join(tmpdir(), 'occ-bench-'))
const cliPath = join(tmp, 'cli.mjs')
console.error(`building CLI (features: ${features.length ? features.join(',') : 'none / default'})...`)
await buildCli(cliPath, features)

let mock = null
if (useMock) {
  const PORT = 8242
  mock = spawn('node', [resolve(root, 'bench/benchMockServer.mjs')], {
    env: { ...process.env, MOCK_PORT: String(PORT), BENCH_BEHAVIOR: mockBehavior },
    stdio: 'ignore',
  })
  await new Promise(r => setTimeout(r, 800))
  process.env.OPEN_CODE_CLI_BASE_URL = `http://localhost:${PORT}/v1`
  process.env.OPEN_CODE_CLI_MODEL = 'mock'
  process.env.OPEN_CODE_CLI_API_KEY = 'test'
}

if (!process.env.OPEN_CODE_CLI_BASE_URL || !process.env.OPEN_CODE_CLI_MODEL) {
  console.error(
    'Set OPEN_CODE_CLI_BASE_URL and OPEN_CODE_CLI_MODEL (and _API_KEY) to point at a model,\n' +
      'or pass --mock to self-test the benchmark harness with a deterministic mock.',
  )
  process.exit(2)
}

const tasksDir = resolve(root, 'bench/tasks')
const taskNames = readdirSync(tasksDir).filter(n => existsSync(join(tasksDir, n, 'task.json')))
const rows = []
for (const name of taskNames) {
  const task = JSON.parse(readFileSync(join(tasksDir, name, 'task.json'), 'utf8'))
  const wd = mkdtempSync(join(tmpdir(), `occ-bench-${name}-`))
  copyTree(join(tasksDir, name, 'files'), wd)
  const result = runTask(cliPath, task, wd)
  const check = runCheck(task.check, wd)
  rows.push({
    name,
    pass: check.pass,
    checkOut: check.out,
    subtype: result?.subtype,
    is_error: result?.is_error,
    num_turns: result?.num_turns,
    cost: result?.total_cost_usd,
  })
}
if (mock) mock.kill()

const passed = rows.filter(r => r.pass).length
console.error('\n=== open-code-cli capability benchmark ===')
for (const r of rows) {
  const tail = r.pass ? '' : `  :: ${r.checkOut.split('\n').slice(-1)[0]}`
  console.error(
    `${r.pass ? '✔' : '✗'} ${r.name}  [check ${r.pass ? 'PASS' : 'FAIL'}]  result=${r.subtype ?? '?'} turns=${r.num_turns ?? '?'}${tail}`,
  )
}
const pct = rows.length ? Math.round((100 * passed) / rows.length) : 0
console.error(`\nTASK SUCCESS RATE: ${passed}/${rows.length}  (${pct}%)`)
console.log(JSON.stringify({ passed, total: rows.length, pct, rows }, null, 2))

if (doAssert) {
  const expectAllPass = mockBehavior !== 'noop'
  const ok = expectAllPass ? passed === rows.length : passed === 0
  if (!ok) {
    console.error(
      `\nself-test FAILED: behavior=${mockBehavior} expected ${expectAllPass ? 'all pass' : 'none pass'}, got ${passed}/${rows.length}`,
    )
    process.exit(1)
  }
  console.error(`self-test OK: behavior=${mockBehavior} measured ${passed}/${rows.length} as expected`)
}
process.exit(0)
