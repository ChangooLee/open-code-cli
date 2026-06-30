#!/usr/bin/env node
import { execSync } from 'child_process'
import { readFileSync, writeFileSync, readdirSync, statSync, renameSync, unlinkSync, existsSync } from 'fs'
import { join, dirname } from 'path'

const ROOT = join(dirname(new URL(import.meta.url).pathname), '..')

const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', '.turbo'])

function walk(dir, exts, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (SKIP_DIRS.has(name)) continue
    const st = statSync(p)
    if (st.isDirectory()) walk(p, exts, out)
    else if (exts.some(e => name.endsWith(e))) out.push(p)
  }
  return out
}

function read(p) {
  return readFileSync(p, 'utf8')
}

function write(p, content) {
  writeFileSync(p, content, 'utf8')
}

function applyReplacements(content, pairs) {
  let s = content
  for (const [from, to] of pairs) {
    if (typeof from === 'string') {
      s = s.split(from).join(to)
    } else {
      s = s.replace(from, to)
    }
  }
  return s
}

const renames = [
  ['services/analytics/growthbook.ts', 'services/analytics/featureFlags.ts'],
  ['types/generated/events_mono/growthbook/v1/growthbook_experiment_event.ts', 'types/generated/events_mono/feature_flags/v1/feature_flags_experiment_event.ts'],
  ['tools/TodoWriteTool', 'tools/TaskChecklistTool'],
  ['tools/EnterPlanModeTool', 'tools/StartPlanModeTool'],
  ['tools/ToolSearchTool', 'tools/CapabilitySearchTool'],
  ['tools/ExitPlanModeTool', 'tools/EndPlanModeTool'],
  ['components/permissions/EnterPlanModePermissionRequest', 'components/permissions/StartPlanModePermissionRequest'],
  ['components/permissions/ExitPlanModePermissionRequest', 'components/permissions/EndPlanModePermissionRequest'],
  ['utils/toolSearch.ts', 'utils/capabilitySearch.ts'],
  ['utils/openCodeMd.ts', 'utils/projectMd.ts'],
  ['services/api/promptCacheBreakDetection.ts', 'services/api/promptCacheInvalidation.ts'],
  ['commands/statusline.tsx', 'commands/prompt-bar.tsx'],
  ['commands/output-style', 'commands/response-theme'],
  ['commands/rewind', 'commands/backtrack'],
  ['types/statusLine.ts', 'types/promptBar.ts'],
  ['components/StatusLine.tsx', 'components/PromptBar.tsx'],
  ['outputStyles', 'responseThemes'],
  ['constants/outputStyles.ts', 'constants/responseThemes.ts'],
  ['tools/AgentTool/built-in/statuslineSetup.ts', 'tools/AgentTool/built-in/promptBarSetup.ts'],
  ['components/OpenCodeMdExternalIncludesDialog.tsx', 'components/ProjectMdExternalIncludesDialog.tsx'],
  ['tools/TodoWriteTool/TodoWriteTool.ts', 'tools/TaskChecklistTool/TaskChecklistTool.ts'],
  ['tools/EnterPlanModeTool/EnterPlanModeTool.ts', 'tools/StartPlanModeTool/StartPlanModeTool.ts'],
  ['tools/ToolSearchTool/ToolSearchTool.ts', 'tools/CapabilitySearchTool/CapabilitySearchTool.ts'],
  ['tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts', 'tools/EndPlanModeTool/EndPlanModeV2Tool.ts'],
  ['components/permissions/EnterPlanModePermissionRequest/EnterPlanModePermissionRequest.tsx', 'components/permissions/StartPlanModePermissionRequest/StartPlanModePermissionRequest.tsx'],
  ['components/permissions/ExitPlanModePermissionRequest/ExitPlanModePermissionRequest.tsx', 'components/permissions/EndPlanModePermissionRequest/EndPlanModePermissionRequest.tsx'],
  ['tools/TodoWriteTool/constants.ts', 'tools/TaskChecklistTool/constants.ts'],
  ['tools/EnterPlanModeTool/constants.ts', 'tools/StartPlanModeTool/constants.ts'],
  ['tools/ToolSearchTool/constants.ts', 'tools/CapabilitySearchTool/constants.ts'],
  ['tools/ExitPlanModeTool/constants.ts', 'tools/EndPlanModeTool/constants.ts'],
  ['tools/EnterPlanModeTool/prompt.ts', 'tools/StartPlanModeTool/prompt.ts'],
  ['tools/EnterPlanModeTool/UI.tsx', 'tools/StartPlanModeTool/UI.tsx'],
  ['tools/ExitPlanModeTool/prompt.ts', 'tools/EndPlanModeTool/prompt.ts'],
  ['tools/ExitPlanModeTool/UI.tsx', 'tools/EndPlanModeTool/UI.tsx'],
  ['tools/ToolSearchTool/prompt.ts', 'tools/CapabilitySearchTool/prompt.ts'],
  ['commands/output-style/output-style.tsx', 'commands/response-theme/response-theme.tsx'],
  ['commands/output-style/index.ts', 'commands/response-theme/index.ts'],
  ['utils/plugins/loadPluginOutputStyles.ts', 'utils/plugins/loadPluginResponseThemes.ts'],
  ['components/OutputStylePicker.tsx', 'components/ResponseThemePicker.tsx'],
  ['outputStyles/loadOutputStylesDir.ts', 'responseThemes/loadResponseThemesDir.ts'],
]

function mkdirp(p) {
  execSync(`mkdir -p "${p}"`, { stdio: 'ignore' })
}

function gitMv(from, to) {
  const fp = join(ROOT, from)
  const tp = join(ROOT, to)
  if (!existsSync(fp)) return
  mkdirp(dirname(tp))
  if (existsSync(tp)) {
    execSync(`rm -rf "${tp}"`)
  }
  renameSync(fp, tp)
}

for (const [from, to] of renames) {
  gitMv(from, to)
}

const files = walk(ROOT, ['.ts', '.tsx', '.md', '.json', '.mjs'])

const contentPairs = [
  ['cache_creation_input_tokens', '___REMOVE_CACHE_CREATION___'],
  ['cache_read_input_tokens', 'cached_tokens'],
  ['input_tokens', 'prompt_tokens'],
  ['output_tokens', 'completion_tokens'],
  ['ephemeral_1h_input_tokens', '___REMOVE_EPHEMERAL_1H___'],
  ['ephemeral_5m_input_tokens', '___REMOVE_EPHEMERAL_5M___'],
  ['GrowthBookUserAttributes', 'FeatureFlagsUserAttributes'],
  ['getGrowthBookClientKey', 'getFeatureFlagsClientKey'],
  ['onGrowthBookRefresh', 'onFeatureFlagsRefresh'],
  ['hasGrowthBookEnvOverride', 'hasFeatureFlagsEnvOverride'],
  ['initializeGrowthBook', 'initializeFeatureFlags'],
  ['refreshGrowthBookAfterAuthChange', 'refreshFeatureFlagsAfterAuthChange'],
  ['getAllGrowthBookFeatures', 'getAllFeatureFlagsFeatures'],
  ['getGrowthBookConfigOverrides', 'getFeatureFlagsConfigOverrides'],
  ['setGrowthBookConfigOverride', 'setFeatureFlagsConfigOverride'],
  ['clearGrowthBookConfigOverrides', 'clearFeatureFlagsConfigOverrides'],
  ['logGrowthBookExperimentTo1P', 'logFeatureFlagsExperimentTo1P'],
  ['GrowthbookExperimentEvent', 'FeatureFlagsExperimentEvent'],
  ['cachedGrowthBookFeatures', 'cachedFeatureFlagsFeatures'],
  ['growthBookOverrides', 'featureFlagsOverrides'],
  ['GrowthBookRefreshListener', 'FeatureFlagsRefreshListener'],
  ['getUserForGrowthBook', 'getUserForFeatureFlags'],
  ['growthbook.js', 'featureFlags.js'],
  ['growthbook_experiment_event.js', 'feature_flags_experiment_event.js'],
  ['events_mono/growthbook/', 'events_mono/feature_flags/'],
  ['TodoWriteTool', 'TaskChecklistTool'],
  ['TodoWrite', 'TaskChecklist'],
  ['EnterPlanModeTool', 'StartPlanModeTool'],
  ['EnterPlanMode', 'StartPlanMode'],
  ['ExitPlanModeTool', 'EndPlanModeTool'],
  ['ExitPlanMode', 'EndPlanMode'],
  ['ExitPlanModeV2Tool', 'EndPlanModeV2Tool'],
  ['ToolSearchTool', 'CapabilitySearchTool'],
  ['ToolSearch', 'CapabilitySearch'],
  ['toolSearch.js', 'capabilitySearch.js'],
  ['toolSearch.ts', 'capabilitySearch.ts'],
  ['openCodeMd.js', 'projectMd.js'],
  ['openCodeMd.ts', 'projectMd.ts'],
  ['OpenCodeMdExternalIncludesDialog', 'ProjectMdExternalIncludesDialog'],
  ['OPEN_CODE.md', 'PROJECT.md'],
  ['CLAUDE.md', 'PROJECT.md'],
  ['promptCacheBreakDetection.js', 'promptCacheInvalidation.js'],
  ['promptCacheBreakDetection.ts', 'promptCacheInvalidation.ts'],
  ['checkResponseForCacheBreak', 'checkResponseForCacheInvalidation'],
  ['resetPromptCacheBreakDetection', 'resetPromptCacheInvalidation'],
  ['open_code_cli_prompt_cache_break', 'open_code_cli_prompt_cache_invalidation'],
  ['output-style', 'response-theme'],
  ['outputStyle', 'responseTheme'],
  ['OutputStyle', 'ResponseTheme'],
  ['outputStyles', 'responseThemes'],
  ['OutputStyles', 'ResponseThemes'],
  ['loadOutputStylesDir', 'loadResponseThemesDir'],
  ['loadPluginOutputStyles', 'loadPluginResponseThemes'],
  ['statusline', 'prompt-bar'],
  ['statusLine', 'promptBar'],
  ['StatusLine', 'PromptBar'],
  ['statuslineSetup', 'promptBarSetup'],
  ['/rewind', '/backtrack'],
  ['rewind-files', 'backtrack-files'],
  ['--rewind-files', '--backtrack-files'],
  ['settings.local.json', 'local.settings.json'],
  ['OPEN_CODE_CLI_OAUTH_TOKEN_FILE_DESCRIPTOR', 'OPEN_CODE_CLI_AUTH_TOKEN_FILE_DESCRIPTOR'],
  ['OPEN_CODE_CLI_OAUTH_TOKEN', 'OPEN_CODE_CLI_AUTH_TOKEN'],
  ['OPEN_CODE_CLI_INFERENCE_SCOPE', 'OPEN_CODE_CLI_API_SCOPE'],
  ['OPEN_CODE_CLI_ENTRYPOINT', 'OPEN_CODE_CLI_LAUNCH_MODE'],
  ['OPEN_CODE_CLI_USE_BEDROCK', '___REMOVE_BEDROCK___'],
  ['OPEN_CODE_CLI_USE_VERTEX', '___REMOVE_VERTEX___'],
  ['OPEN_CODE_CLI_USE_FOUNDRY', '___REMOVE_FOUNDRY___'],
  ['@growthbook/growthbook', 'feature-flags-sdk'],
  ['GrowthBook', 'FeatureFlagsClient'],
  ['growthbook', 'featureFlags'],
  ['from \'../constants/betas.js\'', 'from \'../constants/featureFlagsApi.js\''],
  ['from "../../constants/betas.js"', 'from "../../constants/featureFlagsApi.js"'],
  ['from \'../../constants/betas.js\'', 'from \'../../constants/featureFlagsApi.js\''],
  ['from \'src/constants/betas.js\'', 'from \'src/constants/featureFlagsApi.js\''],
  ['clearBetasCaches', 'clearFeatureFlagsApiCaches'],
  ['getBetas', 'getFeatureFlagsApiHeaders'],
  ['betasChanged', 'featureFlagsApiChanged'],
  ['addedBetas', 'addedFeatureFlagsApi'],
  ['removedBetas', 'removedFeatureFlagsApi'],
  ['anthropic-beta', '___REMOVE_ANTHROPIC_BETA___'],
  ['promptCacheBreak', 'promptCacheInvalidation'],
]

let changed = 0
for (const file of files) {
  if (file.includes('refactor-fork-evidence.mjs')) continue
  let content = read(file)
  const orig = content
  content = applyReplacements(content, contentPairs)
  if (content !== orig) {
    write(file, content)
    changed++
  }
}

console.log(`Content updated in ${changed} files`)
