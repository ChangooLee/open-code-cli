import type { StdoutMessage } from 'src/entrypoints/sdk/controlTypes.js'

/**
 * Bidirectional streaming transport abstraction used by RemoteIO.
 *
 * Implemented by WebSocketTransport, HybridTransport, and SSETransport. Only
 * the methods common to every implementation belong here — implementation
 * specific extras (setOnEvent, getLastSequenceNum, ...) are accessed through
 * the concrete class type instead.
 */
export interface Transport {
  /** Open the connection (and keep it open with reconnection logic). */
  connect(): Promise<void>
  /** Send a single message to the remote peer. */
  write(message: StdoutMessage): Promise<void>
  /** Tear down the connection and release resources. */
  close(): void
  /** Register the callback invoked with each inbound data chunk. */
  setOnData(callback: (data: string) => void): void
  /** Register the callback invoked when the connection closes. */
  setOnClose(callback: (closeCode?: number) => void): void
  /** Whether the transport currently has a live connection. */
  isConnectedStatus(): boolean
  /** Whether the transport has permanently closed. */
  isClosedStatus(): boolean
}
