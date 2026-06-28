import type { Message } from 'src/types/message.js'

// KAIROS session-transcript persistence. Buckets messages by their timestamp
// into per-day transcript files consumed by downstream skills (e.g. /dream).

/**
 * Append the given messages to the current session transcript segment,
 * bucketed by message timestamp.
 */
export async function writeSessionTranscriptSegment(
  _messages: Message[],
): Promise<void> {
  throw new Error('not implemented')
}

/**
 * Flush the previous day's transcript when the local date rolls over, so it is
 * available even if no compaction occurred that day.
 */
export function flushOnDateChange(
  _messages: Message[],
  _currentDate: string,
): void {
  throw new Error('not implemented')
}
