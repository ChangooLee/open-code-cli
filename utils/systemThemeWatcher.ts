import type { TerminalQuerier } from '../ink/terminal-querier.js'
import type { SystemTheme } from './systemTheme.js'

/**
 * Watch for live terminal background-color changes (via OSC 11 polling through
 * the terminal querier) while the theme setting is 'auto', invoking `onChange`
 * whenever the resolved light/dark appearance flips.
 *
 * @returns A cleanup function that stops the watcher.
 */
export function watchSystemTheme(
  _querier: TerminalQuerier,
  _onChange: (theme: SystemTheme) => void,
): () => void {
  throw new Error('not implemented')
}
