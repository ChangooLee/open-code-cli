import { createHash } from 'crypto'
import type { AnalyticsScalarMetadata } from 'src/services/analytics/index.js'
import { logEvent } from 'src/services/analytics/index.js'
function hashFilePath(
  filePath: string,
): AnalyticsScalarMetadata {
  return createHash('sha256')
    .update(filePath)
    .digest('hex')
    .slice(0, 16) as AnalyticsScalarMetadata
}
function hashFileContent(
  content: string,
): AnalyticsScalarMetadata {
  return createHash('sha256')
    .update(content)
    .digest('hex') as AnalyticsScalarMetadata
}
const MAX_CONTENT_HASH_SIZE = 100 * 1024
export function logFileOperation(params: {
  operation: 'read' | 'write' | 'edit'
  tool: 'FileReadTool' | 'FileWriteTool' | 'FileEditTool'
  filePath: string
  content?: string
  type?: 'create' | 'update'
}): void {
  const metadata: Record<
    string,
    | AnalyticsScalarMetadata
    | number
    | boolean
  > = {
    operation:
      params.operation as AnalyticsScalarMetadata,
    tool: params.tool as AnalyticsScalarMetadata,
    filePathHash: hashFilePath(params.filePath),
  }
  if (
    params.content !== undefined &&
    params.content.length <= MAX_CONTENT_HASH_SIZE
  ) {
    metadata.contentHash = hashFileContent(params.content)
  }
  if (params.type !== undefined) {
    metadata.type =
      params.type as AnalyticsScalarMetadata
  }
  logEvent('open_code_cli_file_operation', metadata)
}
