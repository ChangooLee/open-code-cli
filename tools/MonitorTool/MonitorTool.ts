import type { ToolResultBlockParam } from 'src/services/api/chatCompletions.js'
import type { PermissionResult } from 'src/utils/permissions/PermissionResult.js'
import { z } from 'zod/v4'
import { buildTool, type ToolDef } from '../../Tool.js'
import { lazySchema } from '../../utils/lazySchema.js'

export const MONITOR_TOOL_NAME = 'Monitor'

const inputSchema = lazySchema(() =>
  z.strictObject({
    command: z.string().describe('The command or MCP server to monitor.'),
  }),
)
type InputSchema = ReturnType<typeof inputSchema>
type Input = z.infer<InputSchema>

export type MonitorOutput = {
  result: string
}

export const MonitorTool = buildTool({
  name: MONITOR_TOOL_NAME,
  maxResultSizeChars: 100_000,
  async description() {
    return 'Start a background monitor.'
  },
  userFacingName() {
    return 'Monitor'
  },
  isEnabled() {
    return true
  },
  get inputSchema(): InputSchema {
    return inputSchema()
  },
  isConcurrencySafe() {
    return false
  },
  isReadOnly() {
    return false
  },
  toAutoClassifierInput(input: Input) {
    return input.command
  },
  async checkPermissions(input): Promise<PermissionResult> {
    return { behavior: 'allow', updatedInput: input }
  },
  async prompt() {
    return 'Starts a background monitor for an MCP server or command.'
  },
  renderToolUseMessage() {
    return null
  },
  async call(): Promise<{ data: MonitorOutput }> {
    throw new Error('not implemented')
  },
  mapToolResultToToolResultBlockParam(
    output: MonitorOutput,
    toolUseID: string,
  ): ToolResultBlockParam {
    return {
      tool_use_id: toolUseID,
      type: 'tool_result',
      content: output.result,
    }
  },
} satisfies ToolDef<InputSchema, MonitorOutput>)
