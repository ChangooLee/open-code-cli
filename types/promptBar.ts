interface BaseHookCommandInput {
  session_id: string
  transcript_path: string
  cwd: string
  permission_mode?: string
  agent_id?: string
  agent_type?: string
}
export interface PromptBarCommandInput extends BaseHookCommandInput {
  session_name?: string
  model: {
    id: string
    display_name: string
  }
  workspace: {
    current_dir: string
    project_dir: string
    added_dirs: string[]
  }
  version: string
  output_style: {
    name: string
  }
  cost: {
    total_cost_usd: number
    total_duration_ms: number
    total_api_duration_ms: number
    total_lines_added: number
    total_lines_removed: number
  }
  context_window: {
    total_prompt_tokens: number
    total_completion_tokens: number
    context_window_size: number
    current_usage: {
      prompt_tokens: number
      completion_tokens: number
      : number
      cached_tokens: number
    } | null
    used_percentage: number
    remaining_percentage: number
  }
  exceeds_200k_tokens: boolean
  rate_limits?: {
    five_hour?: {
      used_percentage: number
      resets_at: number
    }
    seven_day?: {
      used_percentage: number
      resets_at: number
    }
  }
  vim?: {
    mode: string
  }
  agent?: {
    name: string
  }
  remote?: {
    session_id: string
  }
  worktree?: {
    name: string
    path: string
    branch?: string
    original_cwd: string
    original_branch?: string
  }
}
