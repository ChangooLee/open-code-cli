export interface PostInterOpenCodeCliMessageResult {
  ok: boolean
  error?: string
}
export async function postInterOpenCodeCliMessage(
  target: string,
  message: string,
): Promise<PostInterOpenCodeCliMessageResult> {
  throw new Error('not implemented')
}
