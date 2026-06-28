/**
 * Terminal cursor position and visibility for a rendered frame.
 */
export type Cursor = {
  /** Column (0-based). */
  x: number
  /** Row (0-based). */
  y: number
  /** Whether the cursor should be shown. */
  visible: boolean
}
