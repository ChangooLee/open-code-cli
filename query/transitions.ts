/**
 * Discriminated unions describing how a single iteration of the query loop
 * ends. `Continue` transitions feed into the next iteration; `Terminal`
 * transitions end the generator.
 */

/**
 * Reason the query loop continued into another iteration. Recorded on the loop
 * state so tests can assert which recovery path fired.
 */
export type Continue =
  | { reason: 'next_turn' }
  | { reason: 'reactive_compact_retry' }
  | { reason: 'max_output_tokens_escalate' }
  | { reason: 'max_output_tokens_recovery'; attempt: number }
  | { reason: 'stop_hook_blocking' }
  | { reason: 'token_budget_continuation' }
  | { reason: 'collapse_drain_retry'; committed: number }

/**
 * Reason the query loop terminated. Returned as the generator's final value.
 */
export type Terminal =
  | { reason: 'completed' }
  | { reason: 'max_turns'; turnCount: number }
  | { reason: 'model_error'; error: unknown }
  | { reason: 'prompt_too_long' }
  | { reason: 'image_error' }
  | { reason: 'blocking_limit' }
  | { reason: 'aborted_streaming' }
  | { reason: 'aborted_tools' }
  | { reason: 'stop_hook_prevented' }
  | { reason: 'hook_stopped' }
