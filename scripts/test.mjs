import { build } from 'esbuild'
import { readFileSync, readdirSync, mkdtempSync } from 'node:fs'
import { dirname, resolve, join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))

// Tests run with the ultracode mechanism flags ON so feature()-gated logic is exercised.
const DEFAULT_TEST_FEATURES =
  'BOUNDED_AUTONOMY,AGENT_LOOP_DETECTION,AGENT_LOOP_DETECTION_OSCILLATION,AGENT_LOOP_DETECTION_NORMALIZE,VERIFY_IMPLEMENTATION_BEFORE_COMPLETION,STRICT_TOOL_IO,ASYNC_AGENT_JOIN,VERIFICATION_AGENT,WALL_CLOCK_DEADLINE'
const enabledFeatures = new Set(
  (process.env.OPEN_CODE_CLI_FEATURES ?? DEFAULT_TEST_FEATURES)
    .split(',')
    .map(s => s.trim())
    .filter(Boolean),
)

const bunBundlePlugin = {
  name: 'bun-bundle-macro',
  setup(b) {
    b.onResolve({ filter: /^bun:bundle$/ }, () => ({
      path: 'bun:bundle',
      namespace: 'bun-bundle',
    }))
    b.onLoad({ filter: /.*/, namespace: 'bun-bundle' }, () => ({
      contents: `export function feature(flag) { return ${JSON.stringify([
        ...enabledFeatures,
      ])}.includes(flag) }`,
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
      source = source.replace(featureCallRe, (_m, _q, flag) =>
        enabledFeatures.has(flag) ? 'true' : 'false',
      )
      const ext = args.path.slice(args.path.lastIndexOf('.'))
      return { contents: source, loader: loaderByExt[ext] ?? 'ts' }
    })
  },
}
const optionalStubs = [
  /^sharp$/, /^cli-highlight$/, /^plist$/, /^image-processor-napi$/,
  /^audio-capture-napi$/, /^color-diff-napi$/, /^url-handler-napi$/,
  /^modifiers-napi$/, /^bun:ffi$/, /^@open-code-cli\/sandbox-isolation$/,
  /^@open-code-cli\/mcp-bundle$/, /^open-code-cli-sdk$/, /^@ant\//,
  /^@aws-sdk\//, /^@smithy\//, /^@opentelemetry\/exporter-/,
  /^vscode-jsonrpc\/node\.js$/,
]
const optionalStubPlugin = {
  name: 'optional-stub',
  setup(b) {
    b.onResolve({ filter: /.*/ }, args =>
      optionalStubs.some(re => re.test(args.path))
        ? { path: args.path, namespace: 'optional-stub' }
        : null,
    )
    b.onLoad({ filter: /.*/, namespace: 'optional-stub' }, () => ({
      contents:
        'const s = new Proxy(function(){}, { get: () => s, apply: () => s, construct: () => s }); module.exports = Object.create(s);',
      loader: 'js',
    }))
  },
}

const testsDir = resolve(root, 'tests')
const testFiles = readdirSync(testsDir)
  .filter(f => f.endsWith('.test.ts'))
  .map(f => join(testsDir, f))
if (testFiles.length === 0) {
  console.error('No test files found in tests/')
  process.exit(1)
}

const outDir = mkdtempSync(join(tmpdir(), 'occ-test-'))
const outFiles = []
for (const tf of testFiles) {
  const base = tf.split('/').pop().replace(/\.ts$/, '.mjs')
  const outfile = join(outDir, base)
  await build({
    entryPoints: [tf],
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'esm',
    outfile,
    jsx: 'automatic',
    jsxImportSource: 'react',
    banner: {
      js: [
        "import { createRequire as __occCreateRequire } from 'node:module';",
        'const require = __occCreateRequire(import.meta.url);',
      ].join('\n'),
    },
    alias: { src: root },
    plugins: [optionalStubPlugin, featureInlinePlugin, bunBundlePlugin],
    loader: { '.md': 'text', '.txt': 'text', '.node': 'file' },
    define: {
      'process.env.USER_TYPE': JSON.stringify('external'),
      'process.env.OPEN_CODE_CLI_VERIFY_PLAN': JSON.stringify('false'),
      'MACRO.VERSION': JSON.stringify(pkg.version),
      'MACRO.BUILD_TIME': JSON.stringify('test'),
      'MACRO.PACKAGE_URL': JSON.stringify(pkg.name),
      'MACRO.NATIVE_PACKAGE_URL': JSON.stringify(`${pkg.name}-native`),
      'MACRO.ISSUES_EXPLAINER': JSON.stringify(''),
      'MACRO.VERSION_CHANGELOG': JSON.stringify(''),
      'MACRO.FEEDBACK_CHANNEL': JSON.stringify(''),
    },
    logLevel: 'warning',
  })
  outFiles.push(outfile)
}

console.error(
  `Bundled ${outFiles.length} test file(s) with features: ${[...enabledFeatures].join(',')}`,
)
const result = spawnSync('node', ['--test', ...outFiles], { stdio: 'inherit' })
process.exit(result.status ?? 1)
