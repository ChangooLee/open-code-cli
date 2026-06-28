// Reconstructed from usage: QuerySource is an open string identifier describing
// where a query originated (REPL, agent, output style, etc.). Producers build it
// with template literals like `agent:builtin:${agentType}` and
// `repl_main_thread:outputStyle:${style}` and cast with `as QuerySource`.
//
// The union below documents the known well-formed shapes while `string & {}`
// keeps it assignable from arbitrary identifiers without forcing a cast at every
// call site (matching how the codebase passes literals around).

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
