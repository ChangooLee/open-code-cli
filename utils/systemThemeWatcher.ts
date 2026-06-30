import type { TerminalQuerier } from '../ink/terminal-querier.js'
import type { SystemTheme } from './systemTheme.js'
export function watchSystemTheme(
  _querier: TerminalQuerier,
  _onChange: (theme: SystemTheme) => void,
): () => void {
  throw new Error('not implemented')
}
