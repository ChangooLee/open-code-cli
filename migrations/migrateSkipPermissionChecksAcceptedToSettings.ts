import { logEvent } from 'src/services/analytics/index.js'
import { getGlobalConfig, saveGlobalConfig } from '../utils/config.js'
import { logError } from '../utils/log.js'
import {
  hasSkipDangerousModePermissionPrompt,
  updateSettingsForSource,
} from '../utils/settings/settings.js'
export function migrateSkipPermissionChecksAcceptedToSettings(): void {
  const globalConfig = getGlobalConfig()
  if (!globalConfig.skipPermissionChecksModeAccepted) {
    return
  }
  try {
    if (!hasSkipDangerousModePermissionPrompt()) {
      updateSettingsForSource('userSettings', {
        skipDangerousModePermissionPrompt: true,
      })
    }
    logEvent('open_code_cli_migrate_bypass_permissions_accepted', {})
    saveGlobalConfig(current => {
      if (!('skipPermissionChecksModeAccepted' in current)) return current
      const { skipPermissionChecksModeAccepted: _, ...updatedConfig } = current
      return updatedConfig
    })
  } catch (error) {
    logError(
      new Error(`Failed to migrate bypass permissions accepted: ${error}`),
    )
  }
}
