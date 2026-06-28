/**
 * Shared constants and types for the file-persistence subsystem.
 */

/** Maximum number of files uploaded in parallel during persistence. */
export const DEFAULT_UPLOAD_CONCURRENCY = 5

/** Upper bound on the number of modified files persisted in a single turn. */
export const FILE_COUNT_LIMIT = 1000

/** Subdirectory (under `{cwd}/{sessionId}`) scanned for persisted outputs. */
export const OUTPUTS_SUBDIR = 'outputs'

/** Timestamp (epoch ms) captured when a turn begins. */
export type TurnStartTime = number

/** A file that was successfully persisted to the Files API. */
export type PersistedFile = {
  filename: string
  file_id: string
}

/** A file that failed to persist, with the failure reason. */
export type FailedPersistence = {
  filename: string
  error: string
}

/** Aggregated result of a file-persistence run for a turn. */
export type FilesPersistedEventData = {
  files: PersistedFile[]
  failed: FailedPersistence[]
}
