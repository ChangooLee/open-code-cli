import { build } from 'esbuild'
import { readFileSync, mkdtempSync } from 'node:fs'
import { dirname, resolve, join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { spawn, spawnSync } from 'node:child_process'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
const PORT = 8231

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
    /^@open-code-cli\/sandbox-runtime$/, /^@open-code-cli\/mcpb$/, /^open-code-cli-agent-sdk$/,
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
  const enabled = new Set(features)
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
    plugins: makePlugins(enabled),
    loader: { '.md': 'text', '.txt': 'text', '.node': 'file' },
    define: {
      'process.env.USER_TYPE': JSON.stringify('external'),
      'process.env.OPEN_CODE_CLI_VERIFY_PLAN': JSON.stringify('false'),
      'MACRO.VERSION': JSON.stringify(pkg.version),
      'MACRO.BUILD_TIME': JSON.stringify('e2e'),
      'MACRO.PACKAGE_URL': JSON.stringify(pkg.name),
      'MACRO.NATIVE_PACKAGE_URL': JSON.stringify(`${pkg.name}-native`),
      'MACRO.ISSUES_EXPLAINER': JSON.stringify(''),
      'MACRO.VERSION_CHANGELOG': JSON.stringify(''),
      'MACRO.FEEDBACK_CHANNEL': JSON.stringify(''),
    },
    logLevel: 'warning',
  })
}

function runCli(cliPath, workDir) {
  const r = spawnSync(
    'node',
    [cliPath, '-p', 'write 3 files', '--output-format', 'stream-json', '--verbose', '--allowedTools', 'Write', '--max-turns', '30'],
    {
      cwd: workDir,
      encoding: 'utf8',
      input: '',
      env: {
        ...process.env,
        OPEN_CODE_CLI_API_KEY: 'test',
        OPEN_CODE_CLI_BASE_URL: `http://localhost:${PORT}/v1`,
        OPEN_CODE_CLI_MODEL: 'mock',
      },
      timeout: 60000,
    },
  )
  const out = (r.stdout || '') + (r.stderr || '')
  const line = out.split('\n').find(l => l.includes('"type":"result"'))
  if (!line) throw new Error('no result line in output:\n' + out.slice(-800))
  return JSON.parse(line)
}

const tmp = mkdtempSync(join(tmpdir(), 'occ-e2e-'))
const cliFlagged = join(tmp, 'cli-flagged.mjs')
const cliControl = join(tmp, 'cli-control.mjs')
console.error('building flagged + control binaries...')
await buildCli(cliFlagged, ['VERIFY_IMPLEMENTATION_BEFORE_COMPLETION', 'BOUNDED_AUTONOMY'])
await buildCli(cliControl, [])

const mock = spawn('node', [resolve(root, 'tests/e2e/mockModelServer.mjs')], {
  env: { ...process.env, MOCK_PORT: String(PORT), MOCK_SCENARIO: 'verifyfail' },
  stdio: 'ignore',
})
await new Promise(r => setTimeout(r, 800))

let failures = 0
const check = (name, cond, detail) => {
  if (cond) console.error(`✔ ${name}`)
  else {
    failures++
    console.error(`✗ ${name} — ${detail}`)
  }
}

try {
  const flagged = runCli(cliFlagged, mkdtempSync(join(tmpdir(), 'occ-e2e-wf-')))
  check(
    'gate ON: unverified 3-edit task surfaces as a non-success result',
    flagged.is_error === true,
    `expected is_error=true, got ${JSON.stringify({ is_error: flagged.is_error, subtype: flagged.subtype })}`,
  )

  const control = runCli(cliControl, mkdtempSync(join(tmpdir(), 'occ-e2e-wc-')))
  check(
    'gate OFF (default build): same task completes successfully',
    control.is_error === false || control.subtype === 'success',
    `expected success, got ${JSON.stringify({ is_error: control.is_error, subtype: control.subtype })}`,
  )
} finally {
  mock.kill()
}

if (failures > 0) {
  console.error(`\n${failures} e2e check(s) failed`)
  process.exit(1)
}
console.error('\nall e2e checks passed')
process.exit(0)
