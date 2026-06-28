/**
 * A mutation applied to the unified command queue.
 */
export type QueueOperation = 'enqueue' | 'dequeue' | 'remove' | 'popAll'

/**
 * A log record describing a single queue operation.
 */
export interface QueueOperationMessage {
  type: 'queue-operation'
  operation: QueueOperation
  timestamp: string
  sessionId: string
  content?: string
}
