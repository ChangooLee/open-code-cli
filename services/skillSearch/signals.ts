// Signals that can trigger inter-turn skill discovery. `null` is used for the
// turn-0 user-input path where no prior signal exists.
export type DiscoverySignal =
  | 'user_input'
  | 'assistant_turn'
  | 'subagent_spawn'
  | 'write_pivot'
