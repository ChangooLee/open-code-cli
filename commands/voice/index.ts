import type { Command } from '../../commands.js'
import {
  isVoiceFeatureFlagsClientEnabled,
  isVoiceModeEnabled,
} from '../../voice/voiceModeEnabled.js'

const voice = {
  type: 'local',
  name: 'voice',
  description: 'Toggle voice mode',
  availability: ['open-code-cli-ai'],
  isEnabled: () => isVoiceFeatureFlagsClientEnabled(),
  get isHidden() {
    return !isVoiceModeEnabled()
  },
  supportsNonInteractive: false,
  load: () => import('./voice.js'),
} satisfies Command

export default voice
