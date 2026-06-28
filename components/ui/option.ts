/**
 * A simple selectable option (label/value), compatible with the
 * CustomSelect component's option shape.
 */
export interface Option {
  label: string
  value: string
  description?: string
  disabled?: boolean
}
