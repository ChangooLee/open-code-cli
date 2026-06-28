import { TerminalEvent } from './terminal-event.js'

/**
 * Bracketed-paste event. Dispatched when the terminal delivers pasted text as
 * a single chunk (CSI 200~ … CSI 201~).
 */
export class PasteEvent extends TerminalEvent {
  readonly text: string

  constructor(text: string) {
    super('paste', { bubbles: true, cancelable: true })
    this.text = text
  }
}
