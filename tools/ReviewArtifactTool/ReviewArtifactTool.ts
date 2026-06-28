import type { ToolResultBlockParam } from 'src/services/api/openaiCompatible.js'
import type { PermissionResult } from 'src/utils/permissions/PermissionResult.js'
import { z } from 'zod/v4'
import { buildTool, type ToolDef } from '../../Tool.js'
import { lazySchema } from '../../utils/lazySchema.js'

export const REVIEW_ARTIFACT_TOOL_NAME = 'ReviewArtifact'

const inputSchema = lazySchema(() =>
  z.strictObject({
    artifact: z.string().describe('The artifact to submit for review.'),
  }),
)
type InputSchema = ReturnType<typeof inputSchema>
type Input = z.infer<InputSchema>

export type ReviewArtifactOutput = {
  result: string
}

export const ReviewArtifactTool = buildTool({
  name: REVIEW_ARTIFACT_TOOL_NAME,
  maxResultSizeChars: 100_000,
  async description() {
    return 'Submit an artifact for user review.'
  },
  userFacingName() {
    return 'Review Artifact'
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
    return input.artifact
  },
  async checkPermissions(input): Promise<PermissionResult> {
    return { behavior: 'allow', updatedInput: input }
  },
  async prompt() {
    return 'Submits an artifact for the user to review and approve.'
  },
  renderToolUseMessage() {
    return null
  },
  async call(): Promise<{ data: ReviewArtifactOutput }> {
    throw new Error('not implemented')
  },
  mapToolResultToToolResultBlockParam(
    output: ReviewArtifactOutput,
    toolUseID: string,
  ): ToolResultBlockParam {
    return {
      tool_use_id: toolUseID,
      type: 'tool_result',
      content: output.result,
    }
  },
} satisfies ToolDef<InputSchema, ReviewArtifactOutput>)
