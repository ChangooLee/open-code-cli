export type QuerySource =
  | 'repl_main_thread'
  | 'koding'
  | 'unknown'
  | `repl_main_thread:${string}`
  | `agent:${string}`
  | `subagent:${string}`
  | `sdk:${string}`
  | `command:${string}`
  | `tool:${string}`
  | (string & {})
