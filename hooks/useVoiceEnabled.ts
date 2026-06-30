import { useMemo } from 'react'
import { useAppState } from '../state/AppState.js'
import {
  hasVoiceAuth,
  isVoiceFeatureFlagsClientEnabled,
} from '../voice/voiceModeEnabled.js'
export function useVoiceEnabled(): boolean {
  const userIntent = useAppState(s => s.settings.voiceEnabled === true)
  const authVersion = useAppState(s => s.authVersion)
  const authed = useMemo(hasVoiceAuth, [authVersion])
  return userIntent && authed && isVoiceFeatureFlagsClientEnabled()
}
