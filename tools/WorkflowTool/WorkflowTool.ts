import type { ToolResultBlockParam } from 'src/services/api/openaiCompatible.js'
import type { PermissionResult } from 'src/utils/permissions/PermissionResult.js'
import { z } from 'zod/v4'
import { buildTool, type ToolDef } from '../../Tool.js'
import { lazySchema } from '../../utils/lazySchema.js'
import { WORKFLOW_TOOL_NAME } from './constants.js'

const inputSchema = lazySchema(() =>
  z.strictObject({
    workflow: z.string().describe('Name of the workflow to run.'),
    args: z
      .record(z.string(), z.unknown())
      .optional()
      .describe('Arguments to pass to the workflow.'),
  }),
)
type InputSchema = ReturnType<typeof inputSchema>
type Input = z.infer<InputSchema>

export type WorkflowOutput = {
  result: string
}

export const WorkflowTool = buildTool({
  name: WORKFLOW_TOOL_NAME,
  maxResultSizeChars: 100_000,
  async description(input: Input) {
    return `Run the "${input.workflow}" workflow.`
  },
  userFacingName() {
    return 'Workflow'
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
    return input.workflow
  },
  async checkPermissions(input): Promise<PermissionResult> {
    return { behavior: 'allow', updatedInput: input }
  },
  async prompt() {
    return 'Runs a named workflow script.'
  },
  renderToolUseMessage() {
    return null
  },
  async call(): Promise<{ data: WorkflowOutput }> {
    throw new Error('not implemented')
  },
  mapToolResultToToolResultBlockParam(
    output: WorkflowOutput,
    toolUseID: string,
  ): ToolResultBlockParam {
    return {
      tool_use_id: toolUseID,
      type: 'tool_result',
      content: output.result,
    }
  },
} satisfies ToolDef<InputSchema, WorkflowOutput>)
