import {
  type AnalyticsScalarMetadata,
  logEvent,
} from '../services/analytics/index.js'
import { loadKeybindingsSync } from './loadUserBindings.js'
import { getBindingDisplayText } from './resolver.js'
import type { KeybindingContextName } from './types.js'
const LOGGED_FALLBACKS = new Set<string>()
export function getShortcutDisplay(
  action: string,
  context: KeybindingContextName,
  fallback: string,
): string {
  const bindings = loadKeybindingsSync()
  const resolved = getBindingDisplayText(action, context, bindings)
  if (resolved === undefined) {
    const key = `${action}:${context}`
    if (!LOGGED_FALLBACKS.has(key)) {
      LOGGED_FALLBACKS.add(key)
      logEvent('open_code_cli_keybinding_fallback_used', {
        action:
          action as AnalyticsScalarMetadata,
        context:
          context as AnalyticsScalarMetadata,
        fallback:
          fallback as AnalyticsScalarMetadata,
        reason:
          'action_not_found' as AnalyticsScalarMetadata,
      })
    }
    return fallback
  }
  return resolved
}
