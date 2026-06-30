import figures from 'figures'
import { errorMessage } from '../../utils/errors.js'
import { gracefulShutdown } from '../../utils/gracefulShutdown.js'
import { logError } from '../../utils/log.js'
import { getManagedPluginNames } from '../../utils/plugins/managedPlugins.js'
import { parsePluginIdentifier } from '../../utils/plugins/pluginIdentifier.js'
import type { PluginScope } from '../../utils/plugins/schemas.js'
import { writeToStdout } from '../../utils/process.js'
import {
  buildPluginTelemetryFields,
  classifyPluginCommandError,
} from '../../utils/telemetry/pluginTelemetry.js'
import {
  type AnalyticsScalarMetadata,
  type AnalyticsPiiScalarMetadata,
  logEvent,
} from '../analytics/index.js'
import {
  disableAllPluginsOp,
  disablePluginOp,
  enablePluginOp,
  type InstallableScope,
  installPluginOp,
  uninstallPluginOp,
  updatePluginOp,
  VALID_INSTALLABLE_SCOPES,
  VALID_UPDATE_SCOPES,
} from './pluginOperations.js'
export { VALID_INSTALLABLE_SCOPES, VALID_UPDATE_SCOPES }
type PluginCliCommand =
  | 'install'
  | 'uninstall'
  | 'enable'
  | 'disable'
  | 'disable-all'
  | 'update'
function handlePluginCommandError(
  error: unknown,
  command: PluginCliCommand,
  plugin?: string,
): never {
  logError(error)
  const operation = plugin
    ? `${command} plugin "${plugin}"`
    : command === 'disable-all'
      ? 'disable all plugins'
      : `${command} plugins`
  console.error(
    `${figures.cross} Failed to ${operation}: ${errorMessage(error)}`,
  )
  const telemetryFields = plugin
    ? (() => {
        const { name, marketplace } = parsePluginIdentifier(plugin)
        return {
          _PROTO_plugin_name:
            name as AnalyticsPiiScalarMetadata,
          ...(marketplace && {
            _PROTO_marketplace_name:
              marketplace as AnalyticsPiiScalarMetadata,
          }),
          ...buildPluginTelemetryFields(
            name,
            marketplace,
            getManagedPluginNames(),
          ),
        }
      })()
    : {}
  logEvent('open_code_cli_plugin_command_failed', {
    command:
      command as AnalyticsScalarMetadata,
    error_category: classifyPluginCommandError(
      error,
    ) as AnalyticsScalarMetadata,
    ...telemetryFields,
  })
  process.exit(1)
}
export async function installPlugin(
  plugin: string,
  scope: InstallableScope = 'user',
): Promise<void> {
  try {
    console.log(`Installing plugin "${plugin}"...`)
    const result = await installPluginOp(plugin, scope)
    if (!result.success) {
      throw new Error(result.message)
    }
    console.log(`${figures.tick} ${result.message}`)
    const { name, marketplace } = parsePluginIdentifier(
      result.pluginId || plugin,
    )
    logEvent('open_code_cli_plugin_installed_cli', {
      _PROTO_plugin_name:
        name as AnalyticsPiiScalarMetadata,
      ...(marketplace && {
        _PROTO_marketplace_name:
          marketplace as AnalyticsPiiScalarMetadata,
      }),
      scope: (result.scope ||
        scope) as AnalyticsScalarMetadata,
      install_source:
        'cli-explicit' as AnalyticsScalarMetadata,
      ...buildPluginTelemetryFields(name, marketplace, getManagedPluginNames()),
    })
    process.exit(0)
  } catch (error) {
    handlePluginCommandError(error, 'install', plugin)
  }
}
export async function uninstallPlugin(
  plugin: string,
  scope: InstallableScope = 'user',
  keepData = false,
): Promise<void> {
  try {
    const result = await uninstallPluginOp(plugin, scope, !keepData)
    if (!result.success) {
      throw new Error(result.message)
    }
    console.log(`${figures.tick} ${result.message}`)
    const { name, marketplace } = parsePluginIdentifier(
      result.pluginId || plugin,
    )
    logEvent('open_code_cli_plugin_uninstalled_cli', {
      _PROTO_plugin_name:
        name as AnalyticsPiiScalarMetadata,
      ...(marketplace && {
        _PROTO_marketplace_name:
          marketplace as AnalyticsPiiScalarMetadata,
      }),
      scope: (result.scope ||
        scope) as AnalyticsScalarMetadata,
      ...buildPluginTelemetryFields(name, marketplace, getManagedPluginNames()),
    })
    process.exit(0)
  } catch (error) {
    handlePluginCommandError(error, 'uninstall', plugin)
  }
}
export async function enablePlugin(
  plugin: string,
  scope?: InstallableScope,
): Promise<void> {
  try {
    const result = await enablePluginOp(plugin, scope)
    if (!result.success) {
      throw new Error(result.message)
    }
    console.log(`${figures.tick} ${result.message}`)
    const { name, marketplace } = parsePluginIdentifier(
      result.pluginId || plugin,
    )
    logEvent('open_code_cli_plugin_enabled_cli', {
      _PROTO_plugin_name:
        name as AnalyticsPiiScalarMetadata,
      ...(marketplace && {
        _PROTO_marketplace_name:
          marketplace as AnalyticsPiiScalarMetadata,
      }),
      scope:
        result.scope as AnalyticsScalarMetadata,
      ...buildPluginTelemetryFields(name, marketplace, getManagedPluginNames()),
    })
    process.exit(0)
  } catch (error) {
    handlePluginCommandError(error, 'enable', plugin)
  }
}
export async function disablePlugin(
  plugin: string,
  scope?: InstallableScope,
): Promise<void> {
  try {
    const result = await disablePluginOp(plugin, scope)
    if (!result.success) {
      throw new Error(result.message)
    }
    console.log(`${figures.tick} ${result.message}`)
    const { name, marketplace } = parsePluginIdentifier(
      result.pluginId || plugin,
    )
    logEvent('open_code_cli_plugin_disabled_cli', {
      _PROTO_plugin_name:
        name as AnalyticsPiiScalarMetadata,
      ...(marketplace && {
        _PROTO_marketplace_name:
          marketplace as AnalyticsPiiScalarMetadata,
      }),
      scope:
        result.scope as AnalyticsScalarMetadata,
      ...buildPluginTelemetryFields(name, marketplace, getManagedPluginNames()),
    })
    process.exit(0)
  } catch (error) {
    handlePluginCommandError(error, 'disable', plugin)
  }
}
export async function disableAllPlugins(): Promise<void> {
  try {
    const result = await disableAllPluginsOp()
    if (!result.success) {
      throw new Error(result.message)
    }
    console.log(`${figures.tick} ${result.message}`)
    logEvent('open_code_cli_plugin_disabled_all_cli', {})
    process.exit(0)
  } catch (error) {
    handlePluginCommandError(error, 'disable-all')
  }
}
export async function updatePluginCli(
  plugin: string,
  scope: PluginScope,
): Promise<void> {
  try {
    writeToStdout(
      `Checking for updates for plugin "${plugin}" at ${scope} scope…\n`,
    )
    const result = await updatePluginOp(plugin, scope)
    if (!result.success) {
      throw new Error(result.message)
    }
    writeToStdout(`${figures.tick} ${result.message}\n`)
    if (!result.alreadyUpToDate) {
      const { name, marketplace } = parsePluginIdentifier(
        result.pluginId || plugin,
      )
      logEvent('open_code_cli_plugin_updated_cli', {
        _PROTO_plugin_name:
          name as AnalyticsPiiScalarMetadata,
        ...(marketplace && {
          _PROTO_marketplace_name:
            marketplace as AnalyticsPiiScalarMetadata,
        }),
        old_version: (result.oldVersion ||
          'unknown') as AnalyticsScalarMetadata,
        new_version: (result.newVersion ||
          'unknown') as AnalyticsScalarMetadata,
        ...buildPluginTelemetryFields(
          name,
          marketplace,
          getManagedPluginNames(),
        ),
      })
    }
    await gracefulShutdown(0)
  } catch (error) {
    handlePluginCommandError(error, 'update', plugin)
  }
}
