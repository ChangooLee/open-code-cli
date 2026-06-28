export function getDefaultUdsSocketPath(): string {
  throw new Error('not implemented')
}
export function getUdsMessagingSocketPath(): string {
  throw new Error('not implemented')
}
export async function startUdsMessaging(
  _socketPath: string,
  _opts: { isExplicit: boolean },
): Promise<void> {
  throw new Error('not implemented')
}
export function setOnEnqueue(_onEnqueue: () => void): void {
  throw new Error('not implemented')
}
