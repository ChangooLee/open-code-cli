import { KEYBINDING_ACTIONS, KEYBINDING_CONTEXTS } from './schema.js'
export type KeybindingAction = (typeof KEYBINDING_ACTIONS)[number]
export type KeybindingContextName = (typeof KEYBINDING_CONTEXTS)[number]
export type BindingAction = KeybindingAction | `command:${string}`
export interface ParsedKeystroke {
  key: string
  ctrl: boolean
  alt: boolean
  shift: boolean
  meta: boolean
  super: boolean
}
export type Chord = ParsedKeystroke[]
export interface KeybindingBlock {
  context: KeybindingContextName
  bindings: Record<string, BindingAction | null>
}
export interface ParsedBinding {
  chord: Chord
  action: BindingAction | null
  context: KeybindingContextName
}
