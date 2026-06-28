// Ambient module declarations for private / platform-specific packages that are NOT published
// to npm. These are optional integrations (macOS computer-use, browser MCP, the
// .mcpb plugin bundle format, and the agent SDK package self-reference). They
// are optional platform integrations, declared here as opaque
// `any` modules. This keeps `tsc --noEmit` focused on real source errors instead
// of cascading "cannot find module" failures. The corresponding features are
// gated behind runtime checks / `feature()` flags and degrade gracefully.
//
// A body-less `declare module` makes every import from the module resolve to
// `any` (named, default, and namespace imports all work).

declare module '@ant/computer-use-mcp'
declare module '@ant/computer-use-mcp/types'
declare module '@ant/computer-use-mcp/sentinelApps'
declare module '@ant/computer-use-swift'
declare module '@ant/computer-use-input'
declare module '@ant/open-code-cli-for-chrome-mcp'
declare module '@open-code-cli/mcpb'
declare module 'open-code-cli-agent-sdk'

// Bundled skill docs are imported for their text content (default import).
// They are loaded via esbuild's text loader at build time.
declare module '*.md' {
  const content: string
  export default content
}

// Optional native addons / platform packages that are not installed in this
// repo. Features that use them are gated behind runtime checks or
// `feature()` flags. Declared as opaque `any` modules so tsc stays focused on
// real source errors.
declare module 'sharp'
declare module 'cli-highlight'
declare module 'plist'
declare module 'bun:ffi'
declare module 'image-processor-napi'
declare module 'audio-capture-napi'
declare module 'color-diff-napi'
declare module 'url-handler-napi'
declare module '@open-code-cli/sandbox-runtime'
declare module '@aws-sdk/client-sts'
declare module '@aws-sdk/credential-providers'
declare module '@aws-sdk/credential-provider-node'
declare module '@smithy/node-http-handler'
declare module '@opentelemetry/exporter-trace-otlp-http'
declare module '@opentelemetry/exporter-trace-otlp-grpc'
declare module '@opentelemetry/exporter-trace-otlp-proto'
declare module '@opentelemetry/exporter-logs-otlp-http'
declare module '@opentelemetry/exporter-logs-otlp-grpc'
declare module '@opentelemetry/exporter-logs-otlp-proto'
declare module '@opentelemetry/exporter-metrics-otlp-http'
declare module '@opentelemetry/exporter-metrics-otlp-grpc'
declare module '@opentelemetry/exporter-metrics-otlp-proto'
declare module '@opentelemetry/exporter-prometheus'

// vscode-jsonrpc is installed but its `/node.js` subpath is not exposed via the
// package's exports map under bundler resolution. The LSP transport that uses
// it is optional / feature-gated.
declare module 'vscode-jsonrpc/node.js'
