// Experimental Node-side build for open-code-cli.
//
// Upstream is bundled with Bun, which resolves the `bun:bundle` macro
// (`feature()`) and the global `MACRO` object at build time. This script is the
// non-Bun fallback: it uses esbuild (transpile + bundle, no type checking) and
// reproduces those build-time substitutions:
//
//   - `feature('FLAG')`  -> inlined boolean from the OPEN_CODE_CLI_FEATURES
//                           comma-separated allowlist (default: all false), so
//                           disabled branches are dead-code-eliminated.
//   - `MACRO.*`           -> build metadata defined below.
//   - `src/*`             -> path alias to the repo root (mirrors tsconfig).
//
// Run: node scripts/build.mjs
import { build } from 'esbuild'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))

const enabledFeatures = new Set(
  (process.env.OPEN_CODE_CLI_FEATURES ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean),
)

// Virtual `bun:bundle` module: `feature()` is resolved against the allowlist.
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

// Bun resolves `feature('FLAG')` at build time so disabled branches (and their
// `require('...')`/`import('...')` of optional/ant-only modules) are dropped by
// dead-code elimination. esbuild does not constant-fold the runtime helper, so
// we replicate the macro by inlining each `feature('FLAG')` call to a boolean
// literal here; esbuild then DCEs the dead branches just like Bun.
const { readFile } = await import('node:fs/promises')
const featureCallRe = /\bfeature\(\s*(['"])([A-Za-z0-9_]+)\1\s*\)/g
const loaderByExt = { '.ts': 'ts', '.tsx': 'tsx', '.js': 'js', '.jsx': 'jsx' }
const featureInlinePlugin = {
  name: 'feature-macro-inline',
  setup(b) {
    b.onLoad({ filter: /\.(ts|tsx|js|jsx)$/ }, async args => {
      if (args.path.includes('/node_modules/')) return null
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

// Optional native addons / platform packages that are not installed in this
// open-source tree. Some are imported statically (hoisted to the top of an ESM
// bundle), so we cannot simply mark them `external` — Node would fail at
// startup. Instead we resolve them to a permissive empty CommonJS stub so the
// bundle loads. The features that actually use them are gated behind runtime
// checks / `feature()` flags (off by default) and degrade gracefully.
const optionalStubs = [
  /^sharp$/,
  /^cli-highlight$/,
  /^plist$/,
  /^image-processor-napi$/,
  /^audio-capture-napi$/,
  /^color-diff-napi$/,
  /^url-handler-napi$/,
  /^modifiers-napi$/,
  /^bun:ffi$/,
  /^@open-code-cli\/sandbox-runtime$/,
  /^@open-code-cli\/mcpb$/,
  /^open-code-cli-agent-sdk$/,
  /^@ant\//,
  /^@aws-sdk\//,
  /^@smithy\//,
  /^@opentelemetry\/exporter-/,
  /^vscode-jsonrpc\/node\.js$/,
]
const optionalStubPlugin = {
  name: 'optional-stub',
  setup(b) {
    b.onResolve({ filter: /.*/ }, args => {
      if (optionalStubs.some(re => re.test(args.path))) {
        return { path: args.path, namespace: 'optional-stub' }
      }
      return null
    })
    b.onLoad({ filter: /.*/, namespace: 'optional-stub' }, () => ({
      // Permissive self-returning stub: any named/default import and any deep
      // property access or call resolves to the same callable proxy, so
      // module-init expressions like `pkg.Foo.bar` don't throw. Build-time
      // "no matching export" errors are avoided via CJS interop.
      // The self-returning proxy `s` is exposed as the PROTOTYPE of the
      // exported object so that esbuild's CJS->ESM interop (which reads named
      // bindings off a copied target object) resolves any named import through
      // the prototype chain to `s` (callable, deep-access-safe) instead of
      // `undefined`.
      contents:
        'const s = new Proxy(function(){}, { get: () => s, apply: () => s, construct: () => s }); module.exports = Object.create(s);',
      loader: 'js',
    }))
  },
}

await build({
  entryPoints: [resolve(root, 'entrypoints/cli.tsx')],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  outfile: resolve(root, 'dist/cli.mjs'),
  jsx: 'automatic',
  jsxImportSource: 'react',
  // ESM bundle on Node: CJS dependencies (execa/cross-spawn, etc.) call
  // `require(...)` for built-ins like `child_process`. Provide a real `require`
  // (plus __dirname/__filename) via createRequire so those work at runtime.
  banner: {
    js: [
      '#!/usr/bin/env node',
      "import { createRequire as __occCreateRequire } from 'node:module';",
      'const require = __occCreateRequire(import.meta.url);',
    ].join('\n'),
  },
  alias: { src: root },
  plugins: [optionalStubPlugin, featureInlinePlugin, bunBundlePlugin],
  loader: { '.md': 'text', '.txt': 'text', '.node': 'file' },
  define: {
    // This is the open-source ("external") distribution: bake the build-time
    // identity vars so ant-only/internal branches (e.g. USER_TYPE === 'ant',
    // OPEN_CODE_CLI_VERIFY_PLAN === 'true') are dead-code-eliminated, dropping
    // their require()s of modules that are not part of this tree. Mirrors Bun's
    // compile-time substitution of these gates.
    'process.env.USER_TYPE': JSON.stringify('external'),
    'process.env.OPEN_CODE_CLI_VERIFY_PLAN': JSON.stringify('false'),
    'MACRO.VERSION': JSON.stringify(pkg.version),
    'MACRO.BUILD_TIME': JSON.stringify(new Date().toISOString()),
    'MACRO.PACKAGE_URL': JSON.stringify(pkg.name),
    'MACRO.NATIVE_PACKAGE_URL': JSON.stringify(`${pkg.name}-native`),
    'MACRO.ISSUES_EXPLAINER': JSON.stringify(
      'report issues at https://github.com/ChangooLee/open-code-cli/issues',
    ),
    'MACRO.VERSION_CHANGELOG': JSON.stringify(''),
    'MACRO.FEEDBACK_CHANNEL': JSON.stringify(''),
  },
  logLevel: 'info',
})
