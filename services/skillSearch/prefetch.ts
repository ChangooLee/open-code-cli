import type { Attachment } from 'src/utils/attachments.js'
import type { Message } from 'src/types/message.js'
import type { ToolUseContext } from 'src/Tool.js'
import type { DiscoverySignal } from './signals.js'

// Opaque handle returned by startSkillDiscoveryPrefetch and later consumed by
// collectSkillDiscoveryPrefetch to inject the discovered skill attachments.
export type PendingSkillDiscoveryPrefetch = {
  signal: DiscoverySignal | null
  promise: Promise<Attachment[]>
}

/**
 * Turn-0 skill discovery driven by the user's input. Runs inline in
 * getAttachments since there's no prior work to hide the latency under.
 */
export async function getTurnZeroSkillDiscovery(
  _input: string,
  _messages: Message[],
  _context: ToolUseContext,
): Promise<Attachment[]> {
  throw new Error('not implemented')
}

/**
 * Kick off inter-turn skill discovery concurrently with the main turn. The
 * returned handle is awaited later via collectSkillDiscoveryPrefetch.
 */
export function startSkillDiscoveryPrefetch(
  _signal: DiscoverySignal | null,
  _messages: Message[],
  _toolUseContext: ToolUseContext,
): PendingSkillDiscoveryPrefetch {
  throw new Error('not implemented')
}

/**
 * Await a pending prefetch and return the resulting skill_discovery attachments.
 */
export async function collectSkillDiscoveryPrefetch(
  _pending: PendingSkillDiscoveryPrefetch,
): Promise<Attachment[]> {
  throw new Error('not implemented')
}
