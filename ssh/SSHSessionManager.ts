import type { SDKMessage } from '../entrypoints/agentSdkTypes.js'
import type { SDKControlPermissionRequest } from '../entrypoints/sdk/controlTypes.js'
import type { RemoteMessageContent } from '../utils/teleport/api.js'
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
export type SSHPermissionResponse =
  | { behavior: 'allow'; updatedInput?: unknown }
  | { behavior: 'deny'; message: string }
export class SSHSessionManager {
  connect(): void {
    throw new Error('not implemented')
  }
  disconnect(): void {
    throw new Error('not implemented')
  }
  sendMessage(content: RemoteMessageContent): Promise<boolean> {
    throw new Error('not implemented')
  }
  sendInterrupt(): void {
    throw new Error('not implemented')
  }
  respondToPermissionRequest(
    requestId: string,
    response: SSHPermissionResponse,
  ): void {
    throw new Error('not implemented')
  }
}
