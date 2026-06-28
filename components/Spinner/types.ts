/**
 * Animation/streaming mode for the spinner.
 */
export type SpinnerMode =
  | 'requesting'
  | 'responding'
  | 'thinking'
  | 'tool-use'
  | 'tool-input'

/**
 * An RGB color expressed as numeric channels (0-255).
 */
export interface RGBColor {
  r: number
  g: number
  b: number
}
