/**
 * Fields shared by all hook command inputs (see createBaseHookInput).
 */
interface BaseHookCommandInput {
  session_id: string
  transcript_path: string
  cwd: string
  permission_mode?: string
  agent_id?: string
  agent_type?: string
}

/**
 * Structured input passed (as JSON) to a user's fileSuggestion hook command.
 */
export interface FileSuggestionCommandInput extends BaseHookCommandInput {
  query: string
}
