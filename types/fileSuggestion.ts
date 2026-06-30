interface BaseHookCommandInput {
  session_id: string
  transcript_path: string
  cwd: string
  permission_mode?: string
  agent_id?: string
  agent_type?: string
}
export interface FileSuggestionCommandInput extends BaseHookCommandInput {
  query: string
}
