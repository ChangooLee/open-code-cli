import memoize from 'lodash-es/memoize.js'
import type { Command } from '../commands.js'
import type { MCPServerConnection } from '../services/mcp/types.js'
export const fetchMcpSkillsForClient = memoize(
  async (_client: MCPServerConnection): Promise<Command[]> => {
    throw new Error('not implemented')
  },
  client => client.name,
)
