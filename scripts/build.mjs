import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const enabledFeatures = new Set((process.env.OPEN_CODE_CLI_FEATURES ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean));
const bunBundlePlugin = {
    name: 'bun-bundle-macro',
    setup(b) {
        b.onResolve({ filter: /^bun:bundle$/ }, () => ({
            path: 'bun:bundle',
            namespace: 'bun-bundle',
        }));
        b.onLoad({ filter: /.*/, namespace: 'bun-bundle' }, () => ({
            contents: `export function feature(flag) { return ${JSON.stringify([
                ...enabledFeatures,
            ])}.includes(flag) }`,
            loader: 'js',
        }));
    },
};
const { readFile } = await import('node:fs/promises');
const featureCallRe = /\bfeature\(\s*(['"])([A-Za-z0-9_]+)\1\s*\)/g;
const loaderByExt = { '.ts': 'ts', '.tsx': 'tsx', '.js': 'js', '.jsx': 'jsx' };
const featureInlinePlugin = {
    name: 'feature-macro-inline',
    setup(b) {
        b.onLoad({ filter: /\.(ts|tsx|js|jsx)$/ }, async (args) => {
            if (args.path.includes('/node_modules/'))
                return null;
            let source = await readFile(args.path, 'utf8');
            if (!source.includes('feature('))
                return null;
            source = source.replace(featureCallRe, (_m, _q, flag) => enabledFeatures.has(flag) ? 'true' : 'false');
            const ext = args.path.slice(args.path.lastIndexOf('.'));
            return { contents: source, loader: loaderByExt[ext] ?? 'ts' };
        });
    },
};
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
    /^@open-code-cli\/sandbox-isolation$/,
    /^@open-code-cli\/mcp-bundle$/,
    /^open-code-cli-sdk$/,
    /^@ant\//,
    /^@aws-sdk\//,
    /^@smithy\//,
    /^@opentelemetry\/exporter-/,
    /^vscode-jsonrpc\/node\.js$/,
];
const optionalStubPlugin = {
    name: 'optional-stub',
    setup(b) {
        b.onResolve({ filter: /.*/ }, args => {
            if (optionalStubs.some(re => re.test(args.path))) {
                return { path: args.path, namespace: 'optional-stub' };
            }
            return null;
        });
        b.onLoad({ filter: /.*/, namespace: 'optional-stub' }, () => ({
            contents: 'const s = new Proxy(function(){}, { get: () => s, apply: () => s, construct: () => s }); module.exports = Object.create(s);',
            loader: 'js',
        }));
    },
};
await build({
    entryPoints: [resolve(root, 'entrypoints/cli.tsx')],
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'esm',
    outfile: resolve(root, 'dist/cli.mjs'),
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
    plugins: [optionalStubPlugin, featureInlinePlugin, bunBundlePlugin],
    loader: { '.md': 'text', '.txt': 'text', '.node': 'file' },
    define: {
        'process.env.USER_TYPE': JSON.stringify('external'),
        'process.env.OPEN_CODE_CLI_VERIFY_PLAN': JSON.stringify('false'),
        'MACRO.VERSION': JSON.stringify(pkg.version),
        'MACRO.BUILD_TIME': JSON.stringify(new Date().toISOString()),
        'MACRO.PACKAGE_URL': JSON.stringify(pkg.name),
        'MACRO.NATIVE_PACKAGE_URL': JSON.stringify(`${pkg.name}-native`),
        'MACRO.ISSUES_EXPLAINER': JSON.stringify('report issues at https://github.com/ChangooLee/open-code-cli/issues'),
        'MACRO.VERSION_CHANGELOG': JSON.stringify(''),
        'MACRO.FEEDBACK_CHANNEL': JSON.stringify(''),
    },
    logLevel: 'info',
});
