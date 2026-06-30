import { getGlobalConfig, saveGlobalConfig } from '../utils/config.js'

export function migrateProDefaultReset(): void {
  const config = getGlobalConfig()
  if (config.proMigrationComplete) {
    return
  }
  saveGlobalConfig(current => ({
    ...current,
    proMigrationComplete: true,
  }))
}
