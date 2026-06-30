import { createHash } from 'crypto'
import { sep } from 'path'
import {
  type AnalyticsScalarMetadata,
  type AnalyticsPiiScalarMetadata,
  logEvent,
} from '../../services/analytics/index.js'
import type {
  LoadedPlugin,
  PluginError,
  PluginManifest,
} from '../../types/plugin.js'
import {
  isOfficialMarketplaceName,
  parsePluginIdentifier,
} from '../plugins/pluginIdentifier.js'
const BUILTIN_MARKETPLACE_NAME = 'builtin'
const PLUGIN_ID_HASH_SALT = 'open-code-cli-plugin-telemetry-v1'
export function hashPluginId(name: string, marketplace?: string): string {
  const key = marketplace ? `${name}@${marketplace.toLowerCase()}` : name
  return createHash('sha256')
    .update(key + PLUGIN_ID_HASH_SALT)
    .digest('hex')
    .slice(0, 16)
}
export type TelemetryPluginScope =
  | 'official'
  | 'org'
  | 'user-local'
  | 'default-bundle'
export function getTelemetryPluginScope(
  name: string,
  marketplace: string | undefined,
  managedNames: Set<string> | null,
): TelemetryPluginScope {
  if (marketplace === BUILTIN_MARKETPLACE_NAME) return 'default-bundle'
  if (isOfficialMarketplaceName(marketplace)) return 'official'
  if (managedNames?.has(name)) return 'org'
  return 'user-local'
}
export type EnabledVia =
  | 'user-install'
  | 'org-policy'
  | 'default-enable'
  | 'seed-mount'
export type InvocationTrigger =
  | 'user-slash'
  | 'open-code-cli-proactive'
  | 'nested-skill'
export type SkillExecutionContext = 'split' | 'inline' | 'remote'
export type InstallSource =
  | 'cli-explicit'
  | 'ui-discover'
  | 'ui-suggestion'
  | 'deep-link'
export function getEnabledVia(
  plugin: LoadedPlugin,
  managedNames: Set<string> | null,
  seedDirs: string[],
): EnabledVia {
  if (plugin.isBuiltin) return 'default-enable'
  if (managedNames?.has(plugin.name)) return 'org-policy'
  if (
    seedDirs.some(dir =>
      plugin.path.startsWith(dir.endsWith(sep) ? dir : dir + sep),
    )
  ) {
    return 'seed-mount'
  }
  return 'user-install'
}
export function buildPluginTelemetryFields(
  name: string,
  marketplace: string | undefined,
  managedNames: Set<string> | null = null,
): {
  plugin_id_hash: AnalyticsScalarMetadata
  plugin_scope: AnalyticsScalarMetadata
  plugin_name_redacted: AnalyticsScalarMetadata
  marketplace_name_redacted: AnalyticsScalarMetadata
  is_official_plugin: boolean
} {
  const scope = getTelemetryPluginScope(name, marketplace, managedNames)
  const isOfficialPluginControlled =
    scope === 'official' || scope === 'default-bundle'
  return {
    plugin_id_hash: hashPluginId(
      name,
      marketplace,
    ) as AnalyticsScalarMetadata,
    plugin_scope:
      scope as AnalyticsScalarMetadata,
    plugin_name_redacted: (isOfficialPluginControlled
      ? name
      : 'third-party') as AnalyticsScalarMetadata,
    marketplace_name_redacted: (isOfficialPluginControlled && marketplace
      ? marketplace
      : 'third-party') as AnalyticsScalarMetadata,
    is_official_plugin: isOfficialPluginControlled,
  }
}
export function buildPluginCommandTelemetryFields(
  pluginInfo: { pluginManifest: PluginManifest; repository: string },
  managedNames: Set<string> | null = null,
): ReturnType<typeof buildPluginTelemetryFields> {
  const { marketplace } = parsePluginIdentifier(pluginInfo.repository)
  return buildPluginTelemetryFields(
    pluginInfo.pluginManifest.name,
    marketplace,
    managedNames,
  )
}
export function logPluginsEnabledForSession(
  plugins: LoadedPlugin[],
  managedNames: Set<string> | null,
  seedDirs: string[],
): void {
  for (const plugin of plugins) {
    const { marketplace } = parsePluginIdentifier(plugin.repository)
    logEvent('open_code_cli_plugin_enabled_for_session', {
      _PROTO_plugin_name:
        plugin.name as AnalyticsPiiScalarMetadata,
      ...(marketplace && {
        _PROTO_marketplace_name:
          marketplace as AnalyticsPiiScalarMetadata,
      }),
      ...buildPluginTelemetryFields(plugin.name, marketplace, managedNames),
      enabled_via: getEnabledVia(
        plugin,
        managedNames,
        seedDirs,
      ) as AnalyticsScalarMetadata,
      skill_path_count:
        (plugin.skillsPath ? 1 : 0) + (plugin.skillsPaths?.length ?? 0),
      command_path_count:
        (plugin.commandsPath ? 1 : 0) + (plugin.commandsPaths?.length ?? 0),
      has_mcp: plugin.manifest.mcpServers !== undefined,
      has_hooks: plugin.hooksConfig !== undefined,
      ...(plugin.manifest.version && {
        version: plugin.manifest
          .version as AnalyticsScalarMetadata,
      }),
    })
  }
}
export type PluginCommandErrorCategory =
  | 'network'
  | 'not-found'
  | 'permission'
  | 'validation'
  | 'unknown'
export function classifyPluginCommandError(
  error: unknown,
): PluginCommandErrorCategory {
  const msg = String((error as { message?: unknown })?.message ?? error)
  if (
    /ENOTFOUND|ECONNREFUSED|EAI_AGAIN|ETIMEDOUT|ECONNRESET|network|Could not resolve|Connection refused|timed out/i.test(
      msg,
    )
  ) {
    return 'network'
  }
  if (/\b404\b|not found|does not exist|no such plugin/i.test(msg)) {
    return 'not-found'
  }
  if (/\b40[13]\b|EACCES|EPERM|permission denied|unauthorized/i.test(msg)) {
    return 'permission'
  }
  if (/invalid|malformed|schema|validation|parse error/i.test(msg)) {
    return 'validation'
  }
  return 'unknown'
}
export function logPluginLoadErrors(
  errors: PluginError[],
  managedNames: Set<string> | null,
): void {
  for (const err of errors) {
    const { name, marketplace } = parsePluginIdentifier(err.source)
    const pluginName = 'plugin' in err && err.plugin ? err.plugin : name
    logEvent('open_code_cli_plugin_load_failed', {
      error_category:
        err.type as AnalyticsScalarMetadata,
      _PROTO_plugin_name:
        pluginName as AnalyticsPiiScalarMetadata,
      ...(marketplace && {
        _PROTO_marketplace_name:
          marketplace as AnalyticsPiiScalarMetadata,
      }),
      ...buildPluginTelemetryFields(pluginName, marketplace, managedNames),
    })
  }
}
