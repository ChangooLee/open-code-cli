import type { ToolResultBlockParam } from 'src/services/api/openaiCompatible.js'
import type { PermissionResult } from 'src/utils/permissions/PermissionResult.js'
import { z } from 'zod/v4'
import { buildTool, type ToolDef } from '../../Tool.js'
import { lazySchema } from '../../utils/lazySchema.js'

export const OVERFLOW_TEST_TOOL_NAME = 'OverflowTest'

const inputSchema = lazySchema(() =>
  z.strictObject({
    size: z
      .number()
      .optional()
      .describe('Number of characters of output to generate.'),
  }),
)
type InputSchema = ReturnType<typeof inputSchema>

export type OverflowTestOutput = {
  result: string
}

export const OverflowTestTool = buildTool({
  name: OVERFLOW_TEST_TOOL_NAME,
  maxResultSizeChars: 100_000,
  async description() {
    return 'Generate large output for testing context overflow handling.'
  },
  userFacingName() {
    return 'Overflow Test'
  },
  isEnabled() {
    return true
  },
  get inputSchema(): InputSchema {
    return inputSchema()
  },
  isConcurrencySafe() {
    return true
  },
  isReadOnly() {
    return true
  },
  toAutoClassifierInput() {
    return ''
  },
  async checkPermissions(input): Promise<PermissionResult> {
    return { behavior: 'allow', updatedInput: input }
  },
  async prompt() {
    return 'Generates a large amount of output for testing overflow handling.'
  },
  renderToolUseMessage() {
    return null
  },
  async call(): Promise<{ data: OverflowTestOutput }> {
    throw new Error('not implemented')
  },
  mapToolResultToToolResultBlockParam(
    output: OverflowTestOutput,
    toolUseID: string,
  ): ToolResultBlockParam {
    return {
      tool_use_id: toolUseID,
      type: 'tool_result',
      content: output.result,
    }
  },
} satisfies ToolDef<InputSchema, OverflowTestOutput>)
