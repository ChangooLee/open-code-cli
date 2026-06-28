import type { MemoryScope } from '../utils/memoryFileDetection.js'
import type { MemoryHeader } from './memoryScan.js'

/**
 * Telemetry for the memory subsystem's "shape" (recall selection rates and
 * write patterns). Gated behind the MEMORY_SHAPE_TELEMETRY build flag.
 */

/** Log the outcome of a memory recall pass (candidates vs. selected). */
export function logMemoryRecallShape(
  _memories: MemoryHeader[],
  _selected: MemoryHeader[],
): void {
  throw new Error('not implemented')
}

/** Log the shape of a memory-file write performed via Edit/Write tools. */
export function logMemoryWriteShape(
  _toolName: string,
  _toolInput: unknown,
  _filePath: string,
  _scope: MemoryScope,
): void {
  throw new Error('not implemented')
}
