import { TerminalEvent } from './terminal-event.js'

/**
 * Terminal resize event. Dispatched when the terminal viewport dimensions
 * change (SIGWINCH).
 */
export class ResizeEvent extends TerminalEvent {
  readonly columns: number
  readonly rows: number

  constructor(columns: number, rows: number) {
    super('resize', { bubbles: false, cancelable: false })
    this.columns = columns
    this.rows = rows
  }
}
