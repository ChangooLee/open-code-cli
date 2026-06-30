import type { Message } from 'src/types/message.js'
export async function writeSessionTranscriptSegment(
  _messages: Message[],
): Promise<void> {
  throw new Error('not implemented')
}
export function flushOnDateChange(
  _messages: Message[],
  _currentDate: string,
): void {
  throw new Error('not implemented')
}
