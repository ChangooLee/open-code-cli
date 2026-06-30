import { useEffect, useRef } from 'react'
import {
  type AnalyticsScalarMetadata,
  logEvent,
} from '../services/analytics/index.js'
import { useOptionalKeybindingContext } from './KeybindingContext.js'
import type { KeybindingContextName } from './types.js'
export function useShortcutDisplay(
  action: string,
  context: KeybindingContextName,
  fallback: string,
): string {
  const keybindingContext = useOptionalKeybindingContext()
  const resolved = keybindingContext?.getDisplayText(action, context)
  const isFallback = resolved === undefined
  const reason = keybindingContext ? 'action_not_found' : 'no_context'
  const hasLoggedRef = useRef(false)
  useEffect(() => {
    if (isFallback && !hasLoggedRef.current) {
      hasLoggedRef.current = true
      logEvent('open_code_cli_keybinding_fallback_used', {
        action:
          action as AnalyticsScalarMetadata,
        context:
          context as AnalyticsScalarMetadata,
        fallback:
          fallback as AnalyticsScalarMetadata,
        reason:
          reason as AnalyticsScalarMetadata,
      })
    }
  }, [isFallback, action, context, fallback, reason])
  return isFallback ? fallback : resolved
}
