import type { SDKMessage } from '../entrypoints/agentSdkTypes.js'
import type { SDKControlPermissionRequest } from '../entrypoints/sdk/controlTypes.js'
import type { RemoteMessageContent } from '../utils/teleport/api.js'

/**
 * Callbacks wired by the REPL when it attaches to an SSH session.
 */
export interface SSHSessionCallbacks {
  onMessage: (message: SDKMessage) => void
  onPermissionRequest: (
    request: SDKControlPermissionRequest,
    requestId: string,
  ) => void
  onConnected?: () => void
  onReconnecting?: (attempt: number, max: number) => void
  onDisconnected?: () => void
  onError?: (error: Error) => void
}

/**
 * Response to a remote permission request.
 */
export type SSHPermissionResponse =
  | { behavior: 'allow'; updatedInput?: unknown }
  | { behavior: 'deny'; message: string }

/**
 * Drives the stream-json protocol over an SSH child process: forwards messages,
 * relays permission requests, and manages reconnection.
 */
export class SSHSessionManager {
  /** Open the protocol stream and begin processing remote messages. */
  connect(): void {
    throw new Error('not implemented')
  }

  /** Tear down the manager (does not stop the underlying ssh process). */
  disconnect(): void {
    throw new Error('not implemented')
  }

  /** Send a user message to the remote session. Resolves true on success. */
  sendMessage(content: RemoteMessageContent): Promise<boolean> {
    throw new Error('not implemented')
  }

  /** Interrupt the in-flight remote request. */
  sendInterrupt(): void {
    throw new Error('not implemented')
  }

  /** Respond to a pending remote permission request. */
  respondToPermissionRequest(
    requestId: string,
    response: SSHPermissionResponse,
  ): void {
    throw new Error('not implemented')
  }
}
