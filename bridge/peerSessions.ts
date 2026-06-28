/**
 * Peer-to-peer messaging between Open Code CLI sessions reachable through the
 * bridge. Used by SendMessageTool to deliver messages to another agent.
 */
export interface PostInterOpenCodeCliMessageResult {
  ok: boolean
  error?: string
}

/**
 * Deliver a message to a peer Open Code CLI session identified by `target`.
 */
export async function postInterOpenCodeCliMessage(
  target: string,
  message: string,
): Promise<PostInterOpenCodeCliMessageResult> {
  throw new Error('not implemented')
}
