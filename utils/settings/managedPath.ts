import memoize from 'lodash-es/memoize.js'
import { join } from 'path'
import { getPlatform } from '../platform.js'
export const getManagedFilePath = memoize(function (): string {
  if (
    process.env.USER_TYPE === 'ant' &&
    process.env.OPEN_CODE_CLI_MANAGED_SETTINGS_PATH
  ) {
    return process.env.OPEN_CODE_CLI_MANAGED_SETTINGS_PATH
  }
  switch (getPlatform()) {
    case 'macos':
      return '/Library/Application Support/Open Code CLICode'
    case 'windows':
      return 'C:\\Program Files\\Open Code CLICode'
    default:
      return '/etc/open-code-cli'
  }
})
export const getManagedSettingsDropInDir = memoize(function (): string {
  return join(getManagedFilePath(), 'managed-settings.d')
})
