import type { Attachment } from 'src/utils/attachments.js'
import type { Message } from 'src/types/message.js'
import type { ToolUseContext } from 'src/Tool.js'
import type { DiscoverySignal } from './signals.js'
export type PendingSkillDiscoveryPrefetch = {
  signal: DiscoverySignal | null
  promise: Promise<Attachment[]>
}
export async function getTurnZeroSkillDiscovery(
  _input: string,
  _messages: Message[],
  _context: ToolUseContext,
): Promise<Attachment[]> {
  throw new Error('not implemented')
}
export function startSkillDiscoveryPrefetch(
  _signal: DiscoverySignal | null,
  _messages: Message[],
  _toolUseContext: ToolUseContext,
): PendingSkillDiscoveryPrefetch {
  throw new Error('not implemented')
}
export async function collectSkillDiscoveryPrefetch(
  _pending: PendingSkillDiscoveryPrefetch,
): Promise<Attachment[]> {
  throw new Error('not implemented')
}
