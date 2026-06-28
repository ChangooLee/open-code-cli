import type { AppState } from '../state/AppStateStore.js'
export function markAssistantForced(): void {
  throw new Error('not implemented')
}
export function isAssistantForced(): boolean {
  throw new Error('not implemented')
}
export function isAssistantMode(): boolean {
  throw new Error('not implemented')
}
export function getAssistantSystemPromptAddendum(): string {
  throw new Error('not implemented')
}
export function getAssistantActivationPath(): string | undefined {
  throw new Error('not implemented')
}
export function initializeAssistantTeam(): Promise<AppState['teamContext']> {
  throw new Error('not implemented')
}
