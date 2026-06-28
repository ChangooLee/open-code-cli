// Configuration and lifecycle types for Language Server Protocol (LSP) servers.
// LSP servers are configured via plugins (see utils/plugins/lspPluginIntegration).

/** Lifecycle state of a managed LSP server instance. */
export type LspServerState =
  | 'stopped'
  | 'starting'
  | 'running'
  | 'stopping'
  | 'error'

/** Raw LSP server configuration as declared in a plugin manifest / .lsp.json. */
export type LspServerConfig = {
  /** Command to execute the LSP server (e.g. "typescript-language-server"). */
  command: string
  /** Command-line arguments to pass to the server. */
  args?: string[]
  /** Mapping from file extension to LSP language ID. */
  extensionToLanguage: Record<string, string>
  /** Communication transport mechanism (defaults to 'stdio'). */
  transport?: 'stdio' | 'socket'
  /** Environment variables to set when starting the server. */
  env?: Record<string, string>
  /** Initialization options passed during the LSP initialize request. */
  initializationOptions?: unknown
  /** Settings passed via workspace/didChangeConfiguration. */
  settings?: unknown
  /** Workspace folder path to use for the server. */
  workspaceFolder?: string
  /** Maximum time to wait for server startup (milliseconds). */
  startupTimeout?: number
  /** Maximum time to wait for graceful shutdown (milliseconds). */
  shutdownTimeout?: number
  /** Whether to restart the server if it crashes. */
  restartOnCrash?: boolean
  /** Maximum number of restart attempts before giving up. */
  maxRestarts?: number
}

/**
 * LSP server config after plugin scoping. The server name is prefixed
 * (`plugin:<name>:<server>`) and provenance is attached.
 */
export type ScopedLspServerConfig = LspServerConfig & {
  scope: 'dynamic'
  source: string
}
