import type { ToolResultBlockParam } from 'src/services/api/chatCompletions.js'
import type { PermissionResult } from 'src/utils/permissions/PermissionResult.js'
import { z } from 'zod/v4'
import { buildTool, type ToolDef } from '../../Tool.js'
import { lazySchema } from '../../utils/lazySchema.js'
export const TUNGSTEN_TOOL_NAME = 'Tungsten'
const inputSchema = lazySchema(() =>
  z.strictObject({
    prompt: z.string().describe('The instruction to run.'),
  }),
)
type InputSchema = ReturnType<typeof inputSchema>
type Input = z.infer<InputSchema>
export type TungstenOutput = {
  result: string
}
const sessionsWithTungstenUsage = new Set<string>()
let initialized = false
export function clearSessionsWithTungstenUsage(): void {
  sessionsWithTungstenUsage.clear()
}
export function resetInitializationState(): void {
  initialized = false
}
export const TungstenTool = buildTool({
  name: TUNGSTEN_TOOL_NAME,
  maxResultSizeChars: 100_000,
  async description() {
    return 'Run a Tungsten task.'
  },
  userFacingName() {
    return 'Tungsten'
  },
  isEnabled() {
    return process.env.USER_TYPE === 'ant'
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
    return input.prompt
  },
  async checkPermissions(input): Promise<PermissionResult> {
    return { behavior: 'allow', updatedInput: input }
  },
  async prompt() {
    return 'Runs a Tungsten task on behalf of the user.'
  },
  renderToolUseMessage() {
    return null
  },
  async call(): Promise<{ data: TungstenOutput }> {
    void initialized
    throw new Error('not implemented')
  },
  mapToolResultToToolResultBlockParam(
    output: TungstenOutput,
    toolUseID: string,
  ): ToolResultBlockParam {
    return {
      tool_use_id: toolUseID,
      type: 'tool_result',
      content: output.result,
    }
  },
} satisfies ToolDef<InputSchema, TungstenOutput>)
