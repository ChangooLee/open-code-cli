import {
  type AnalyticsScalarMetadata,
  logEvent,
} from '../../services/analytics/index.js'
import type { LocalCommandCall } from '../../types/command.js'
import { getGlobalConfig, saveGlobalConfig } from '../../utils/config.js'
export const call: LocalCommandCall = async () => {
  const config = getGlobalConfig()
  let currentMode = config.editorMode || 'normal'
  if (currentMode === 'emacs') {
    currentMode = 'normal'
  }
  const newMode = currentMode === 'normal' ? 'vim' : 'normal'
  saveGlobalConfig(current => ({
    ...current,
    editorMode: newMode,
  }))
  logEvent('open_code_cli_editor_mode_changed', {
    mode: newMode as AnalyticsScalarMetadata,
    source:
      'command' as AnalyticsScalarMetadata,
  })
  return {
    type: 'text',
    value: `Editor mode set to ${newMode}. ${
      newMode === 'vim'
        ? 'Use Escape key to toggle between INSERT and NORMAL modes.'
        : 'Using standard (readline) keyboard bindings.'
    }`,
  }
}
