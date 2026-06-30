import type {
  ConfigScope,
  MCPServerConnection,
  McpHTTPServerConfig,
  McpOpenCodeCliProxyServerConfig,
  McpSSEServerConfig,
  McpStdioServerConfig,
  Transport,
} from '../../services/mcp/types.js'
interface BaseServerInfo {
  name: string
  scope: ConfigScope
  client: MCPServerConnection
}
export interface StdioServerInfo extends BaseServerInfo {
  transport: 'stdio'
  config: McpStdioServerConfig
}
export interface SSEServerInfo extends BaseServerInfo {
  transport: 'sse'
  isAuthenticated?: boolean
  config: McpSSEServerConfig
}
export interface HTTPServerInfo extends BaseServerInfo {
  transport: 'http'
  isAuthenticated?: boolean
  config: McpHTTPServerConfig
}
export interface OpenCodeCliServerInfo extends BaseServerInfo {
  transport: 'openCodeCli-proxy'
  isAuthenticated?: boolean
  config: McpOpenCodeCliProxyServerConfig
}
export type ServerInfo =
  | StdioServerInfo
  | SSEServerInfo
  | HTTPServerInfo
  | OpenCodeCliServerInfo
export interface AgentMcpServerInfo {
  name: string
  sourceAgents: string[]
  transport: Transport
  needsAuth: boolean
  command?: string
  url?: string
  isAuthenticated?: boolean
}
export type MCPViewState =
  | { type: 'list'; defaultTab?: string }
  | { type: 'server-menu'; server: ServerInfo }
  | { type: 'agent-server-menu'; agentServer: AgentMcpServerInfo }
  | { type: 'server-tools'; server: ServerInfo }
  | { type: 'server-tool-detail'; server: ServerInfo; toolIndex: number }
