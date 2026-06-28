import { KEYBINDING_ACTIONS, KEYBINDING_CONTEXTS } from './schema.js'

/**
 * A single keybinding action identifier (e.g. "app:interrupt").
 */
export type KeybindingAction = (typeof KEYBINDING_ACTIONS)[number]

/**
 * A valid context name where keybindings can be applied (e.g. "Global").
 */
export type KeybindingContextName = (typeof KEYBINDING_CONTEXTS)[number]

/**
 * Action value stored in a keybinding block: a known action, a command
 * binding (e.g. "command:help"), or null to unbind a default shortcut.
 */
export type BindingAction = KeybindingAction | `command:${string}`

/**
 * A single parsed keystroke with its modifiers.
 */
export interface ParsedKeystroke {
  key: string
  ctrl: boolean
  alt: boolean
  shift: boolean
  meta: boolean
  super: boolean
}

/**
 * A chord is an ordered sequence of keystrokes (e.g. "ctrl+k ctrl+s").
 */
export type Chord = ParsedKeystroke[]

/**
 * A block of keybindings for a specific context (config representation).
 */
export interface KeybindingBlock {
  context: KeybindingContextName
  bindings: Record<string, BindingAction | null>
}

/**
 * A flattened, parsed binding ready for matching.
 */
export interface ParsedBinding {
  chord: Chord
  action: BindingAction | null
  context: KeybindingContextName
}
