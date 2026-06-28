import type {
  ConfigScope,
  MCPServerConnection,
  McpHTTPServerConfig,
  McpOpenCodeCliProxyServerConfig,
  McpSSEServerConfig,
  McpStdioServerConfig,
  Transport,
} from '../../services/mcp/types.js'

/**
 * Fields shared by every MCP server view-model entry.
 */
interface BaseServerInfo {
  name: string
  scope: ConfigScope
  client: MCPServerConnection
}

/**
 * A stdio-transport MCP server.
 */
export interface StdioServerInfo extends BaseServerInfo {
  transport: 'stdio'
  config: McpStdioServerConfig
}

/**
 * An SSE-transport MCP server.
 */
export interface SSEServerInfo extends BaseServerInfo {
  transport: 'sse'
  isAuthenticated?: boolean
  config: McpSSEServerConfig
}

/**
 * An HTTP-transport MCP server.
 */
export interface HTTPServerInfo extends BaseServerInfo {
  transport: 'http'
  isAuthenticated?: boolean
  config: McpHTTPServerConfig
}

/**
 * An Open Code CLI proxy MCP server.
 */
export interface OpenCodeCliServerInfo extends BaseServerInfo {
  transport: 'openCodeCli-proxy'
  isAuthenticated?: boolean
  config: McpOpenCodeCliProxyServerConfig
}

/**
 * Discriminated union of all MCP server view-models, keyed on `transport`.
 */
export type ServerInfo =
  | StdioServerInfo
  | SSEServerInfo
  | HTTPServerInfo
  | OpenCodeCliServerInfo

/**
 * An MCP server contributed by an agent definition (inline mcpServers).
 */
export interface AgentMcpServerInfo {
  name: string
  sourceAgents: string[]
  transport: Transport
  needsAuth: boolean
  command?: string
  url?: string
  isAuthenticated?: boolean
}

/**
 * View navigation state for the MCP settings dialog.
 */
export type MCPViewState =
  | { type: 'list'; defaultTab?: string }
  | { type: 'server-menu'; server: ServerInfo }
  | { type: 'agent-server-menu'; agentServer: AgentMcpServerInfo }
  | { type: 'server-tools'; server: ServerInfo }
  | { type: 'server-tool-detail'; server: ServerInfo; toolIndex: number }
