import memoize from 'lodash-es/memoize.js'
import type { Command } from '../commands.js'
import type { MCPServerConnection } from '../services/mcp/types.js'

/**
 * Fetch skills exposed by an MCP server (discovered via its resources) as slash
 * commands. Memoized by server name; callers invalidate via `.cache.delete(name)`
 * when the server's resource list changes.
 */
export const fetchMcpSkillsForClient = memoize(
  async (_client: MCPServerConnection): Promise<Command[]> => {
    throw new Error('not implemented')
  },
  client => client.name,
)
