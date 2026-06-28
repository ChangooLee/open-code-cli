export function isProactiveActive(): boolean {
  throw new Error('not implemented')
}
export function isProactivePaused(): boolean {
  throw new Error('not implemented')
}
export function activateProactive(source: string): void {
  throw new Error('not implemented')
}
export function deactivateProactive(): void {
  throw new Error('not implemented')
}
export function pauseProactive(): void {
  throw new Error('not implemented')
}
export function resumeProactive(): void {
  throw new Error('not implemented')
}
export function setContextBlocked(blocked: boolean): void {
  throw new Error('not implemented')
}
export function getNextTickAt(): number | null {
  throw new Error('not implemented')
}
export function subscribeToProactiveChanges(
  onStoreChange: () => void,
): () => void {
  throw new Error('not implemented')
}
