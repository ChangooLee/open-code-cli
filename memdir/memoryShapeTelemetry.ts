import type { MemoryScope } from '../utils/memoryFileDetection.js'
import type { MemoryHeader } from './memoryScan.js'
export function logMemoryRecallShape(
  _memories: MemoryHeader[],
  _selected: MemoryHeader[],
): void {
  throw new Error('not implemented')
}
export function logMemoryWriteShape(
  _toolName: string,
  _toolInput: unknown,
  _filePath: string,
  _scope: MemoryScope,
): void {
  throw new Error('not implemented')
}
