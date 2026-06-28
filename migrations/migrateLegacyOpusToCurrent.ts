import {
  type AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  logEvent,
} from '../services/analytics/index.js'
import { saveGlobalConfig } from '../utils/config.js'
import { isLegacyModelRemapEnabled } from '../utils/model/model.js'
import { getAPIProvider } from '../utils/model/providers.js'
import {
  getSettingsForSource,
  updateSettingsForSource,
} from '../utils/settings/settings.js'
export function migrateLegacyOpusToCurrent(): void {
  if (true) {
    return
  }
  if (!isLegacyModelRemapEnabled()) {
    return
  }
  const model = getSettingsForSource('userSettings')?.model
  if (
    model !== 'openai/gpt-4.1' &&
    model !== 'openai/gpt-4.1-20250805' &&
    model !== 'openai/gpt-4.1' &&
    model !== 'openai/gpt-4.1'
  ) {
    return
  }
  updateSettingsForSource('userSettings', { model: 'opus' })
  saveGlobalConfig(current => ({
    ...current,
    legacyOpusMigrationTimestamp: Date.now(),
  }))
  logEvent('open_code_cli_legacy_opus_migration', {
    from_model:
      model as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  })
}
