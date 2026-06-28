import { feature } from 'bun:bundle'
import { APIUserAbortError } from 'src/services/api/openaiCompatible.js'
import type { z } from 'zod/v4'
import { getFeatureValue_CACHED_MAY_BE_STALE } from '../../services/analytics/growthbook.js'
import {
  type AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  logEvent,
} from '../../services/analytics/index.js'
import type { ToolPermissionContext, ToolUseContext } from '../../Tool.js'
import type { PendingClassifierCheck } from '../../types/permissions.js'
import { count } from '../../utils/array.js'
import {
  checkSemantics,
  nodeTypeId,
  type ParseForSecurityResult,
  parseForSecurityFromAst,
  type Redirect,
  type SimpleCommand,
} from '../../utils/bash/ast.js'
import {
  type CommandPrefixResult,
  extractOutputRedirections,
  getCommandSubcommandPrefix,
  splitCommand_DEPRECATED,
} from '../../utils/bash/commands.js'
import { parseCommandRaw } from '../../utils/bash/parser.js'
import { tryParseShellCommand } from '../../utils/bash/shellQuote.js'
import { getCwd } from '../../utils/cwd.js'
import { logForDebugging } from '../../utils/debug.js'
import { isEnvTruthy } from '../../utils/envUtils.js'
import { AbortError } from '../../utils/errors.js'
import type {
  ClassifierBehavior,
  ClassifierResult,
} from '../../utils/permissions/bashClassifier.js'
import {
  classifyBashCommand,
  getBashPromptAllowDescriptions,
  getBashPromptAskDescriptions,
  getBashPromptDenyDescriptions,
  isClassifierPermissionsEnabled,
} from '../../utils/permissions/bashClassifier.js'
import type {
  PermissionDecisionReason,
  PermissionResult,
} from '../../utils/permissions/PermissionResult.js'
import type {
  PermissionRule,
  PermissionRuleValue,
} from '../../utils/permissions/PermissionRule.js'
import { extractRules } from '../../utils/permissions/PermissionUpdate.js'
import type { PermissionUpdate } from '../../utils/permissions/PermissionUpdateSchema.js'
import { permissionRuleValueToString } from '../../utils/permissions/permissionRuleParser.js'
import {
  createPermissionRequestMessage,
  getRuleByContentsForTool,
} from '../../utils/permissions/permissions.js'
import {
  parsePermissionRule,
  type ShellPermissionRule,
  matchWildcardPattern as sharedMatchWildcardPattern,
  permissionRuleExtractPrefix as sharedPermissionRuleExtractPrefix,
  suggestionForExactCommand as sharedSuggestionForExactCommand,
  suggestionForPrefix as sharedSuggestionForPrefix,
} from '../../utils/permissions/shellRuleMatching.js'
import { getPlatform } from '../../utils/platform.js'
import { SandboxManager } from '../../utils/sandbox/sandbox-adapter.js'
import { jsonStringify } from '../../utils/slowOperations.js'
import { windowsPathToPosixPath } from '../../utils/windowsPaths.js'
import { BashTool } from './BashTool.js'
import { checkCommandOperatorPermissions } from './bashCommandHelpers.js'
import {
  bashCommandIsSafeAsync_DEPRECATED,
  stripSafeHeredocSubstitutions,
} from './bashSecurity.js'
import { checkPermissionMode } from './modeValidation.js'
import { checkPathConstraints } from './pathValidation.js'
import { checkSedConstraints } from './sedValidation.js'
import { shouldUseSandbox } from './shouldUseSandbox.js'
const bashCommandIsSafeAsync = bashCommandIsSafeAsync_DEPRECATED
const splitCommand = splitCommand_DEPRECATED
const ENV_VAR_ASSIGN_RE = /^[A-Za-z_]\w*=/
export const MAX_SUBCOMMANDS_FOR_SECURITY_CHECK = 50
export const MAX_SUGGESTED_RULES_FOR_COMPOUND = 5
function logClassifierResultForAnts(
  command: string,
  behavior: ClassifierBehavior,
  descriptions: string[],
  result: ClassifierResult,
): void {
  if (process.env.USER_TYPE !== 'ant') {
    return
  }
  logEvent('open_code_cli_internal_bash_classifier_result', {
    behavior:
      behavior as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
    descriptions: jsonStringify(
      descriptions,
    ) as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
    matches: result.matches,
    matchedDescription: (result.matchedDescription ??
      '') as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
    confidence:
      result.confidence as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
    reason:
      result.reason as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
    command:
      command as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  })
}
export function getSimpleCommandPrefix(command: string): string | null {
  const tokens = command.trim().split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return null
  let i = 0
  while (i < tokens.length && ENV_VAR_ASSIGN_RE.test(tokens[i]!)) {
    const varName = tokens[i]!.split('=')[0]!
    const isAntOnlySafe =
      process.env.USER_TYPE === 'ant' && ANT_ONLY_SAFE_ENV_VARS.has(varName)
    if (!SAFE_ENV_VARS.has(varName) && !isAntOnlySafe) {
      return null
    }
    i++
  }
  const remaining = tokens.slice(i)
  if (remaining.length < 2) return null
  const subcmd = remaining[1]!
  if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(subcmd)) return null
  return remaining.slice(0, 2).join(' ')
}
const BARE_SHELL_PREFIXES = new Set([
  'sh',
  'bash',
  'zsh',
  'fish',
  'csh',
  'tcsh',
  'ksh',
  'dash',
  'cmd',
  'powershell',
  'pwsh',
  'env',
  'xargs',
  'nice',
  'stdbuf',
  'nohup',
  'timeout',
  'time',
  'sudo',
  'doas',
  'pkexec',
])
export function getFirstWordPrefix(command: string): string | null {
  const tokens = command.trim().split(/\s+/).filter(Boolean)
  let i = 0
  while (i < tokens.length && ENV_VAR_ASSIGN_RE.test(tokens[i]!)) {
    const varName = tokens[i]!.split('=')[0]!
    const isAntOnlySafe =
      process.env.USER_TYPE === 'ant' && ANT_ONLY_SAFE_ENV_VARS.has(varName)
    if (!SAFE_ENV_VARS.has(varName) && !isAntOnlySafe) {
      return null
    }
    i++
  }
  const cmd = tokens[i]
  if (!cmd) return null
  if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(cmd)) return null
  if (BARE_SHELL_PREFIXES.has(cmd)) return null
  return cmd
}
function suggestionForExactCommand(command: string): PermissionUpdate[] {
  const heredocPrefix = extractPrefixBeforeHeredoc(command)
  if (heredocPrefix) {
    return sharedSuggestionForPrefix(BashTool.name, heredocPrefix)
  }
  if (command.includes('\n')) {
    const firstLine = command.split('\n')[0]!.trim()
    if (firstLine) {
      return sharedSuggestionForPrefix(BashTool.name, firstLine)
    }
  }
  const prefix = getSimpleCommandPrefix(command)
  if (prefix) {
    return sharedSuggestionForPrefix(BashTool.name, prefix)
  }
  return sharedSuggestionForExactCommand(BashTool.name, command)
}
function extractPrefixBeforeHeredoc(command: string): string | null {
  if (!command.includes('<<')) return null
  const idx = command.indexOf('<<')
  if (idx <= 0) return null
  const before = command.substring(0, idx).trim()
  if (!before) return null
  const prefix = getSimpleCommandPrefix(before)
  if (prefix) return prefix
  const tokens = before.split(/\s+/).filter(Boolean)
  let i = 0
  while (i < tokens.length && ENV_VAR_ASSIGN_RE.test(tokens[i]!)) {
    const varName = tokens[i]!.split('=')[0]!
    const isAntOnlySafe =
      process.env.USER_TYPE === 'ant' && ANT_ONLY_SAFE_ENV_VARS.has(varName)
    if (!SAFE_ENV_VARS.has(varName) && !isAntOnlySafe) {
      return null
    }
    i++
  }
  if (i >= tokens.length) return null
  return tokens.slice(i, i + 2).join(' ') || null
}
function suggestionForPrefix(prefix: string): PermissionUpdate[] {
  return sharedSuggestionForPrefix(BashTool.name, prefix)
}
export const permissionRuleExtractPrefix = sharedPermissionRuleExtractPrefix
export function matchWildcardPattern(
  pattern: string,
  command: string,
): boolean {
  return sharedMatchWildcardPattern(pattern, command)
}
export const bashPermissionRule: (
  permissionRule: string,
) => ShellPermissionRule = parsePermissionRule
const SAFE_ENV_VARS = new Set([
  'GOEXPERIMENT', // experimental features
  'GOOS', // target OS
  'GOARCH', // target architecture
  'CGO_ENABLED', // enable/disable CGO
  'GO111MODULE', // module mode
  'RUST_BACKTRACE', // backtrace verbosity
  'RUST_LOG', // logging filter
  'NODE_ENV',
  'PYTHONUNBUFFERED', // disable buffering
  'PYTHONDONTWRITEBYTECODE', // no .pyc files
  'PYTEST_DISABLE_PLUGIN_AUTOLOAD', // disable plugin loading
  'PYTEST_DEBUG', // debug output
  'OPEN_CODE_CLI_API_KEY', // API authentication
  'LANG', // default locale
  'LANGUAGE', // language preference list
  'LC_ALL', // override all locale settings
  'LC_CTYPE', // character classification
  'LC_TIME', // time format
  'CHARSET', // character set preference
  'TERM', // terminal type
  'COLORTERM', // color terminal indicator
  'NO_COLOR', // disable color output (universal standard)
  'FORCE_COLOR', // force color output
  'TZ', // timezone
  'LS_COLORS', // colors for ls (GNU)
  'LSCOLORS', // colors for ls (BSD/macOS)
  'GREP_COLOR', // grep match color (deprecated)
  'GREP_COLORS', // grep color scheme
  'GCC_COLORS', // GCC diagnostic colors
  'TIME_STYLE', // time display format for ls
  'BLOCK_SIZE', // block size for du/df
  'BLOCKSIZE', // alternative block size
])
const ANT_ONLY_SAFE_ENV_VARS = new Set([
  'KUBECONFIG', // kubectl config file path — controls which cluster kubectl uses
  'DOCKER_HOST', // Docker daemon socket/endpoint — controls which daemon docker talks to
  'AWS_PROFILE', // AWS profile name selection
  'CLOUDSDK_CORE_PROJECT', // GCP project ID
  'CLUSTER', // generic cluster name
  'COO_CLUSTER', // coo cluster name
  'COO_CLUSTER_NAME', // coo cluster name (alternate)
  'COO_NAMESPACE', // coo namespace
  'COO_LAUNCH_YAML_DRY_RUN', // dry run mode
  'SKIP_NODE_VERSION_CHECK', // skip version check
  'EXPECTTEST_ACCEPT', // accept test expectations
  'CI', // CI environment indicator
  'GIT_LFS_SKIP_SMUDGE', // skip LFS downloads
  'CUDA_VISIBLE_DEVICES', // GPU device selection
  'JAX_PLATFORMS', // JAX platform selection
  'COLUMNS', // terminal width
  'TMUX', // TMUX socket info
  'POSTGRESQL_VERSION', // postgres version string
  'FIRESTORE_EMULATOR_HOST', // emulator host:port
  'HARNESS_QUIET', // quiet mode flag
  'TEST_CROSSCHECK_LISTS_MATCH_UPDATE', // test update flag
  'DBT_PER_DEVELOPER_ENVIRONMENTS', // DBT config
  'STATSIG_FORD_DB_CHECKS', // statsig DB check flag
  'ANT_ENVIRONMENT', // OpenAICompatible environment name
  'ANT_SERVICE', // OpenAICompatible service name
  'MONOREPO_ROOT_DIR', // monorepo root path
  'PYENV_VERSION', // Python version selection
  'PGPASSWORD', // Postgres password
  'GH_TOKEN', // GitHub token
  'GROWTHBOOK_API_KEY', // self-hosted growthbook
])
function stripCommentLines(command: string): string {
  const lines = command.split('\n')
  const nonCommentLines = lines.filter(line => {
    const trimmed = line.trim()
    return trimmed !== '' && !trimmed.startsWith('#')
  })
  if (nonCommentLines.length === 0) {
    return command
  }
  return nonCommentLines.join('\n')
}
export function stripSafeWrappers(command: string): string {
  const SAFE_WRAPPER_PATTERNS = [
    /^timeout[ \t]+(?:(?:--(?:foreground|preserve-status|verbose)|--(?:kill-after|signal)=[A-Za-z0-9_.+-]+|--(?:kill-after|signal)[ \t]+[A-Za-z0-9_.+-]+|-v|-[ks][ \t]+[A-Za-z0-9_.+-]+|-[ks][A-Za-z0-9_.+-]+)[ \t]+)*(?:--[ \t]+)?\d+(?:\.\d+)?[smhd]?[ \t]+/,
    /^time[ \t]+(?:--[ \t]+)?/,
    /^nice(?:[ \t]+-n[ \t]+-?\d+|[ \t]+-\d+)?[ \t]+(?:--[ \t]+)?/,
    /^stdbuf(?:[ \t]+-[ioe][LN0-9]+)+[ \t]+(?:--[ \t]+)?/,
    /^nohup[ \t]+(?:--[ \t]+)?/,
  ] as const
  const ENV_VAR_PATTERN = /^([A-Za-z_][A-Za-z0-9_]*)=([A-Za-z0-9_./:-]+)[ \t]+/
  let stripped = command
  let previousStripped = ''
  while (stripped !== previousStripped) {
    previousStripped = stripped
    stripped = stripCommentLines(stripped)
    const envVarMatch = stripped.match(ENV_VAR_PATTERN)
    if (envVarMatch) {
      const varName = envVarMatch[1]!
      const isAntOnlySafe =
        process.env.USER_TYPE === 'ant' && ANT_ONLY_SAFE_ENV_VARS.has(varName)
      if (SAFE_ENV_VARS.has(varName) || isAntOnlySafe) {
        stripped = stripped.replace(ENV_VAR_PATTERN, '')
      }
    }
  }
  previousStripped = ''
  while (stripped !== previousStripped) {
    previousStripped = stripped
    stripped = stripCommentLines(stripped)
    for (const pattern of SAFE_WRAPPER_PATTERNS) {
      stripped = stripped.replace(pattern, '')
    }
  }
  return stripped.trim()
}
const TIMEOUT_FLAG_VALUE_RE = /^[A-Za-z0-9_.+-]+$/
function skipTimeoutFlags(a: readonly string[]): number {
  let i = 1
  while (i < a.length) {
    const arg = a[i]!
    const next = a[i + 1]
    if (
      arg === '--foreground' ||
      arg === '--preserve-status' ||
      arg === '--verbose'
    )
      i++
    else if (/^--(?:kill-after|signal)=[A-Za-z0-9_.+-]+$/.test(arg)) i++
    else if (
      (arg === '--kill-after' || arg === '--signal') &&
      next &&
      TIMEOUT_FLAG_VALUE_RE.test(next)
    )
      i += 2
    else if (arg === '--') {
      i++
      break
    } 
    else if (arg.startsWith('--')) return -1
    else if (arg === '-v') i++
    else if (
      (arg === '-k' || arg === '-s') &&
      next &&
      TIMEOUT_FLAG_VALUE_RE.test(next)
    )
      i += 2
    else if (/^-[ks][A-Za-z0-9_.+-]+$/.test(arg)) i++
    else if (arg.startsWith('-')) return -1
    else break
  }
  return i
}
export function stripWrappersFromArgv(argv: string[]): string[] {
  let a = argv
  for (;;) {
    if (a[0] === 'time' || a[0] === 'nohup') {
      a = a.slice(a[1] === '--' ? 2 : 1)
    } else if (a[0] === 'timeout') {
      const i = skipTimeoutFlags(a)
      if (i < 0 || !a[i] || !/^\d+(?:\.\d+)?[smhd]?$/.test(a[i]!)) return a
      a = a.slice(i + 1)
    } else if (
      a[0] === 'nice' &&
      a[1] === '-n' &&
      a[2] &&
      /^-?\d+$/.test(a[2])
    ) {
      a = a.slice(a[3] === '--' ? 4 : 3)
    } else {
      return a
    }
  }
}
export const BINARY_HIJACK_VARS = /^(LD_|DYLD_|PATH$)/
export function stripAllLeadingEnvVars(
  command: string,
  blocklist?: RegExp,
): string {
  const ENV_VAR_PATTERN =
    /^([A-Za-z_][A-Za-z0-9_]*(?:\[[^\]]*\])?)\+?=(?:'[^'\n\r]*'|"(?:\\.|[^"$`\\\n\r])*"|\\.|[^ \t\n\r$`;|&()<>\\\\'"])*[ \t]+/
  let stripped = command
  let previousStripped = ''
  while (stripped !== previousStripped) {
    previousStripped = stripped
    stripped = stripCommentLines(stripped)
    const m = stripped.match(ENV_VAR_PATTERN)
    if (!m) continue
    if (blocklist?.test(m[1]!)) break
    stripped = stripped.slice(m[0].length)
  }
  return stripped.trim()
}
function filterRulesByContentsMatchingInput(
  input: z.infer<typeof BashTool.inputSchema>,
  rules: Map<string, PermissionRule>,
  matchMode: 'exact' | 'prefix',
  {
    stripAllEnvVars = false,
    skipCompoundCheck = false,
  }: { stripAllEnvVars?: boolean; skipCompoundCheck?: boolean } = {},
): PermissionRule[] {
  const command = input.command.trim()
  const commandWithoutRedirections =
    extractOutputRedirections(command).commandWithoutRedirections
  const commandsForMatching =
    matchMode === 'exact'
      ? [command, commandWithoutRedirections]
      : [commandWithoutRedirections]
  const commandsToTry = commandsForMatching.flatMap(cmd => {
    const strippedCommand = stripSafeWrappers(cmd)
    return strippedCommand !== cmd ? [cmd, strippedCommand] : [cmd]
  })
  if (stripAllEnvVars) {
    const seen = new Set(commandsToTry)
    let startIdx = 0
    while (startIdx < commandsToTry.length) {
      const endIdx = commandsToTry.length
      for (let i = startIdx; i < endIdx; i++) {
        const cmd = commandsToTry[i]
        if (!cmd) {
          continue
        }
        const envStripped = stripAllLeadingEnvVars(cmd)
        if (!seen.has(envStripped)) {
          commandsToTry.push(envStripped)
          seen.add(envStripped)
        }
        const wrapperStripped = stripSafeWrappers(cmd)
        if (!seen.has(wrapperStripped)) {
          commandsToTry.push(wrapperStripped)
          seen.add(wrapperStripped)
        }
      }
      startIdx = endIdx
    }
  }
  const isCompoundCommand = new Map<string, boolean>()
  if (matchMode === 'prefix' && !skipCompoundCheck) {
    for (const cmd of commandsToTry) {
      if (!isCompoundCommand.has(cmd)) {
        isCompoundCommand.set(cmd, splitCommand(cmd).length > 1)
      }
    }
  }
  return Array.from(rules.entries())
    .filter(([ruleContent]) => {
      const bashRule = bashPermissionRule(ruleContent)
      return commandsToTry.some(cmdToMatch => {
        switch (bashRule.type) {
          case 'exact':
            return bashRule.command === cmdToMatch
          case 'prefix':
            switch (matchMode) {
              case 'exact':
                return bashRule.prefix === cmdToMatch
              case 'prefix': {
                if (isCompoundCommand.get(cmdToMatch)) {
                  return false
                }
                if (cmdToMatch === bashRule.prefix) {
                  return true
                }
                if (cmdToMatch.startsWith(bashRule.prefix + ' ')) {
                  return true
                }
                const xargsPrefix = 'xargs ' + bashRule.prefix
                if (cmdToMatch === xargsPrefix) {
                  return true
                }
                return cmdToMatch.startsWith(xargsPrefix + ' ')
              }
            }
            break
          case 'wildcard':
            if (matchMode === 'exact') {
              return false
            }
            if (isCompoundCommand.get(cmdToMatch)) {
              return false
            }
            return matchWildcardPattern(bashRule.pattern, cmdToMatch)
        }
      })
    })
    .map(([, rule]) => rule)
}
function matchingRulesForInput(
  input: z.infer<typeof BashTool.inputSchema>,
  toolPermissionContext: ToolPermissionContext,
  matchMode: 'exact' | 'prefix',
  { skipCompoundCheck = false }: { skipCompoundCheck?: boolean } = {},
) {
  const denyRuleByContents = getRuleByContentsForTool(
    toolPermissionContext,
    BashTool,
    'deny',
  )
  const matchingDenyRules = filterRulesByContentsMatchingInput(
    input,
    denyRuleByContents,
    matchMode,
    { stripAllEnvVars: true, skipCompoundCheck: true },
  )
  const askRuleByContents = getRuleByContentsForTool(
    toolPermissionContext,
    BashTool,
    'ask',
  )
  const matchingAskRules = filterRulesByContentsMatchingInput(
    input,
    askRuleByContents,
    matchMode,
    { stripAllEnvVars: true, skipCompoundCheck: true },
  )
  const allowRuleByContents = getRuleByContentsForTool(
    toolPermissionContext,
    BashTool,
    'allow',
  )
  const matchingAllowRules = filterRulesByContentsMatchingInput(
    input,
    allowRuleByContents,
    matchMode,
    { skipCompoundCheck },
  )
  return {
    matchingDenyRules,
    matchingAskRules,
    matchingAllowRules,
  }
}
export const bashToolCheckExactMatchPermission = (
  input: z.infer<typeof BashTool.inputSchema>,
  toolPermissionContext: ToolPermissionContext,
): PermissionResult => {
  const command = input.command.trim()
  const { matchingDenyRules, matchingAskRules, matchingAllowRules } =
    matchingRulesForInput(input, toolPermissionContext, 'exact')
  if (matchingDenyRules[0] !== undefined) {
    return {
      behavior: 'deny',
      message: `Permission to use ${BashTool.name} with command ${command} has been denied.`,
      decisionReason: {
        type: 'rule',
        rule: matchingDenyRules[0],
      },
    }
  }
  if (matchingAskRules[0] !== undefined) {
    return {
      behavior: 'ask',
      message: createPermissionRequestMessage(BashTool.name),
      decisionReason: {
        type: 'rule',
        rule: matchingAskRules[0],
      },
    }
  }
  if (matchingAllowRules[0] !== undefined) {
    return {
      behavior: 'allow',
      updatedInput: input,
      decisionReason: {
        type: 'rule',
        rule: matchingAllowRules[0],
      },
    }
  }
  const decisionReason = {
    type: 'other' as const,
    reason: 'This command requires approval',
  }
  return {
    behavior: 'passthrough',
    message: createPermissionRequestMessage(BashTool.name, decisionReason),
    decisionReason,
    suggestions: suggestionForExactCommand(command),
  }
}
export const bashToolCheckPermission = (
  input: z.infer<typeof BashTool.inputSchema>,
  toolPermissionContext: ToolPermissionContext,
  compoundCommandHasCd?: boolean,
  astCommand?: SimpleCommand,
): PermissionResult => {
  const command = input.command.trim()
  const exactMatchResult = bashToolCheckExactMatchPermission(
    input,
    toolPermissionContext,
  )
  if (
    exactMatchResult.behavior === 'deny' ||
    exactMatchResult.behavior === 'ask'
  ) {
    return exactMatchResult
  }
  const { matchingDenyRules, matchingAskRules, matchingAllowRules } =
    matchingRulesForInput(input, toolPermissionContext, 'prefix', {
      skipCompoundCheck: astCommand !== undefined,
    })
  if (matchingDenyRules[0] !== undefined) {
    return {
      behavior: 'deny',
      message: `Permission to use ${BashTool.name} with command ${command} has been denied.`,
      decisionReason: {
        type: 'rule',
        rule: matchingDenyRules[0],
      },
    }
  }
  if (matchingAskRules[0] !== undefined) {
    return {
      behavior: 'ask',
      message: createPermissionRequestMessage(BashTool.name),
      decisionReason: {
        type: 'rule',
        rule: matchingAskRules[0],
      },
    }
  }
  const pathResult = checkPathConstraints(
    input,
    getCwd(),
    toolPermissionContext,
    compoundCommandHasCd,
    astCommand?.redirects,
    astCommand ? [astCommand] : undefined,
  )
  if (pathResult.behavior !== 'passthrough') {
    return pathResult
  }
  if (exactMatchResult.behavior === 'allow') {
    return exactMatchResult
  }
  if (matchingAllowRules[0] !== undefined) {
    return {
      behavior: 'allow',
      updatedInput: input,
      decisionReason: {
        type: 'rule',
        rule: matchingAllowRules[0],
      },
    }
  }
  const sedConstraintResult = checkSedConstraints(input, toolPermissionContext)
  if (sedConstraintResult.behavior !== 'passthrough') {
    return sedConstraintResult
  }
  const modeResult = checkPermissionMode(input, toolPermissionContext)
  if (modeResult.behavior !== 'passthrough') {
    return modeResult
  }
  if (BashTool.isReadOnly(input)) {
    return {
      behavior: 'allow',
      updatedInput: input,
      decisionReason: {
        type: 'other',
        reason: 'Read-only command is allowed',
      },
    }
  }
  const decisionReason = {
    type: 'other' as const,
    reason: 'This command requires approval',
  }
  return {
    behavior: 'passthrough',
    message: createPermissionRequestMessage(BashTool.name, decisionReason),
    decisionReason,
    suggestions: suggestionForExactCommand(command),
  }
}
export async function checkCommandAndSuggestRules(
  input: z.infer<typeof BashTool.inputSchema>,
  toolPermissionContext: ToolPermissionContext,
  commandPrefixResult: CommandPrefixResult | null | undefined,
  compoundCommandHasCd?: boolean,
  astParseSucceeded?: boolean,
): Promise<PermissionResult> {
  const exactMatchResult = bashToolCheckExactMatchPermission(
    input,
    toolPermissionContext,
  )
  if (exactMatchResult.behavior !== 'passthrough') {
    return exactMatchResult
  }
  const permissionResult = bashToolCheckPermission(
    input,
    toolPermissionContext,
    compoundCommandHasCd,
  )
  if (
    permissionResult.behavior === 'deny' ||
    permissionResult.behavior === 'ask'
  ) {
    return permissionResult
  }
  if (
    !astParseSucceeded &&
    !isEnvTruthy(process.env.OPEN_CODE_CLI_DISABLE_COMMAND_INJECTION_CHECK)
  ) {
    const safetyResult = await bashCommandIsSafeAsync(input.command)
    if (safetyResult.behavior !== 'passthrough') {
      const decisionReason: PermissionDecisionReason = {
        type: 'other' as const,
        reason:
          safetyResult.behavior === 'ask' && safetyResult.message
            ? safetyResult.message
            : 'This command contains patterns that could pose security risks and requires approval',
      }
      return {
        behavior: 'ask',
        message: createPermissionRequestMessage(BashTool.name, decisionReason),
        decisionReason,
        suggestions: [], // Don't suggest saving a potentially dangerous command
      }
    }
  }
  if (permissionResult.behavior === 'allow') {
    return permissionResult
  }
  const suggestedUpdates = commandPrefixResult?.commandPrefix
    ? suggestionForPrefix(commandPrefixResult.commandPrefix)
    : suggestionForExactCommand(input.command)
  return {
    ...permissionResult,
    suggestions: suggestedUpdates,
  }
}
function checkSandboxAutoAllow(
  input: z.infer<typeof BashTool.inputSchema>,
  toolPermissionContext: ToolPermissionContext,
): PermissionResult {
  const command = input.command.trim()
  const { matchingDenyRules, matchingAskRules } = matchingRulesForInput(
    input,
    toolPermissionContext,
    'prefix',
  )
  if (matchingDenyRules[0] !== undefined) {
    return {
      behavior: 'deny',
      message: `Permission to use ${BashTool.name} with command ${command} has been denied.`,
      decisionReason: {
        type: 'rule',
        rule: matchingDenyRules[0],
      },
    }
  }
  const subcommands = splitCommand(command)
  if (subcommands.length > 1) {
    let firstAskRule: PermissionRule | undefined
    for (const sub of subcommands) {
      const subResult = matchingRulesForInput(
        { command: sub },
        toolPermissionContext,
        'prefix',
      )
      if (subResult.matchingDenyRules[0] !== undefined) {
        return {
          behavior: 'deny',
          message: `Permission to use ${BashTool.name} with command ${command} has been denied.`,
          decisionReason: {
            type: 'rule',
            rule: subResult.matchingDenyRules[0],
          },
        }
      }
      firstAskRule ??= subResult.matchingAskRules[0]
    }
    if (firstAskRule) {
      return {
        behavior: 'ask',
        message: createPermissionRequestMessage(BashTool.name),
        decisionReason: {
          type: 'rule',
          rule: firstAskRule,
        },
      }
    }
  }
  if (matchingAskRules[0] !== undefined) {
    return {
      behavior: 'ask',
      message: createPermissionRequestMessage(BashTool.name),
      decisionReason: {
        type: 'rule',
        rule: matchingAskRules[0],
      },
    }
  }
  return {
    behavior: 'allow',
    updatedInput: input,
    decisionReason: {
      type: 'other',
      reason: 'Auto-allowed with sandbox (autoAllowBashIfSandboxed enabled)',
    },
  }
}
function filterCdCwdSubcommands(
  rawSubcommands: string[],
  astCommands: SimpleCommand[] | undefined,
  cwd: string,
  cwdMingw: string,
): { subcommands: string[]; astCommandsByIdx: (SimpleCommand | undefined)[] } {
  const subcommands: string[] = []
  const astCommandsByIdx: (SimpleCommand | undefined)[] = []
  for (let i = 0; i < rawSubcommands.length; i++) {
    const cmd = rawSubcommands[i]!
    if (cmd === `cd ${cwd}` || cmd === `cd ${cwdMingw}`) continue
    subcommands.push(cmd)
    astCommandsByIdx.push(astCommands?.[i])
  }
  return { subcommands, astCommandsByIdx }
}
function checkEarlyExitDeny(
  input: z.infer<typeof BashTool.inputSchema>,
  toolPermissionContext: ToolPermissionContext,
): PermissionResult | null {
  const exactMatchResult = bashToolCheckExactMatchPermission(
    input,
    toolPermissionContext,
  )
  if (exactMatchResult.behavior !== 'passthrough') {
    return exactMatchResult
  }
  const denyMatch = matchingRulesForInput(
    input,
    toolPermissionContext,
    'prefix',
  ).matchingDenyRules[0]
  if (denyMatch !== undefined) {
    return {
      behavior: 'deny',
      message: `Permission to use ${BashTool.name} with command ${input.command} has been denied.`,
      decisionReason: { type: 'rule', rule: denyMatch },
    }
  }
  return null
}
function checkSemanticsDeny(
  input: z.infer<typeof BashTool.inputSchema>,
  toolPermissionContext: ToolPermissionContext,
  commands: readonly { text: string }[],
): PermissionResult | null {
  const fullCmd = checkEarlyExitDeny(input, toolPermissionContext)
  if (fullCmd !== null) return fullCmd
  for (const cmd of commands) {
    const subDeny = matchingRulesForInput(
      { ...input, command: cmd.text },
      toolPermissionContext,
      'prefix',
    ).matchingDenyRules[0]
    if (subDeny !== undefined) {
      return {
        behavior: 'deny',
        message: `Permission to use ${BashTool.name} with command ${input.command} has been denied.`,
        decisionReason: { type: 'rule', rule: subDeny },
      }
    }
  }
  return null
}
function buildPendingClassifierCheck(
  command: string,
  toolPermissionContext: ToolPermissionContext,
): { command: string; cwd: string; descriptions: string[] } | undefined {
  if (!isClassifierPermissionsEnabled()) {
    return undefined
  }
  if (feature('TRANSCRIPT_CLASSIFIER') && toolPermissionContext.mode === 'auto')
    return undefined
  if (toolPermissionContext.mode === 'bypassPermissions') return undefined
  const allowDescriptions = getBashPromptAllowDescriptions(
    toolPermissionContext,
  )
  if (allowDescriptions.length === 0) return undefined
  return {
    command,
    cwd: getCwd(),
    descriptions: allowDescriptions,
  }
}
const speculativeChecks = new Map<string, Promise<ClassifierResult>>()
export function peekSpeculativeClassifierCheck(
  command: string,
): Promise<ClassifierResult> | undefined {
  return speculativeChecks.get(command)
}
export function startSpeculativeClassifierCheck(
  command: string,
  toolPermissionContext: ToolPermissionContext,
  signal: AbortSignal,
  isNonInteractiveSession: boolean,
): boolean {
  if (!isClassifierPermissionsEnabled()) return false
  if (feature('TRANSCRIPT_CLASSIFIER') && toolPermissionContext.mode === 'auto')
    return false
  if (toolPermissionContext.mode === 'bypassPermissions') return false
  const allowDescriptions = getBashPromptAllowDescriptions(
    toolPermissionContext,
  )
  if (allowDescriptions.length === 0) return false
  const cwd = getCwd()
  const promise = classifyBashCommand(
    command,
    cwd,
    allowDescriptions,
    'allow',
    signal,
    isNonInteractiveSession,
  )
  promise.catch(() => {})
  speculativeChecks.set(command, promise)
  return true
}
export function consumeSpeculativeClassifierCheck(
  command: string,
): Promise<ClassifierResult> | undefined {
  const promise = speculativeChecks.get(command)
  if (promise) {
    speculativeChecks.delete(command)
  }
  return promise
}
export function clearSpeculativeChecks(): void {
  speculativeChecks.clear()
}
export async function awaitClassifierAutoApproval(
  pendingCheck: PendingClassifierCheck,
  signal: AbortSignal,
  isNonInteractiveSession: boolean,
): Promise<PermissionDecisionReason | undefined> {
  const { command, cwd, descriptions } = pendingCheck
  const speculativeResult = consumeSpeculativeClassifierCheck(command)
  const classifierResult = speculativeResult
    ? await speculativeResult
    : await classifyBashCommand(
        command,
        cwd,
        descriptions,
        'allow',
        signal,
        isNonInteractiveSession,
      )
  logClassifierResultForAnts(command, 'allow', descriptions, classifierResult)
  if (
    feature('BASH_CLASSIFIER') &&
    classifierResult.matches &&
    classifierResult.confidence === 'high'
  ) {
    return {
      type: 'classifier',
      classifier: 'bash_allow',
      reason: `Allowed by prompt rule: "${classifierResult.matchedDescription}"`,
    }
  }
  return undefined
}
type AsyncClassifierCheckCallbacks = {
  shouldContinue: () => boolean
  onAllow: (decisionReason: PermissionDecisionReason) => void
  onComplete?: () => void
}
export async function executeAsyncClassifierCheck(
  pendingCheck: { command: string; cwd: string; descriptions: string[] },
  signal: AbortSignal,
  isNonInteractiveSession: boolean,
  callbacks: AsyncClassifierCheckCallbacks,
): Promise<void> {
  const { command, cwd, descriptions } = pendingCheck
  const speculativeResult = consumeSpeculativeClassifierCheck(command)
  let classifierResult: ClassifierResult
  try {
    classifierResult = speculativeResult
      ? await speculativeResult
      : await classifyBashCommand(
          command,
          cwd,
          descriptions,
          'allow',
          signal,
          isNonInteractiveSession,
        )
  } catch (error: unknown) {
    if (error instanceof APIUserAbortError || error instanceof AbortError) {
      callbacks.onComplete?.()
      return
    }
    callbacks.onComplete?.()
    throw error
  }
  logClassifierResultForAnts(command, 'allow', descriptions, classifierResult)
  if (!callbacks.shouldContinue()) return
  if (
    feature('BASH_CLASSIFIER') &&
    classifierResult.matches &&
    classifierResult.confidence === 'high'
  ) {
    callbacks.onAllow({
      type: 'classifier',
      classifier: 'bash_allow',
      reason: `Allowed by prompt rule: "${classifierResult.matchedDescription}"`,
    })
  } else {
    callbacks.onComplete?.()
  }
}
export async function bashToolHasPermission(
  input: z.infer<typeof BashTool.inputSchema>,
  context: ToolUseContext,
  getCommandSubcommandPrefixFn = getCommandSubcommandPrefix,
): Promise<PermissionResult> {
  let appState = context.getAppState()
  const injectionCheckDisabled = isEnvTruthy(
    process.env.OPEN_CODE_CLI_DISABLE_COMMAND_INJECTION_CHECK,
  )
  const shadowEnabled = feature('TREE_SITTER_BASH_SHADOW')
    ? getFeatureValue_CACHED_MAY_BE_STALE('open_code_cli_birch_trellis', true)
    : false
  let astRoot = injectionCheckDisabled
    ? null
    : feature('TREE_SITTER_BASH_SHADOW') && !shadowEnabled
      ? null
      : await parseCommandRaw(input.command)
  let astResult: ParseForSecurityResult = astRoot
    ? parseForSecurityFromAst(input.command, astRoot)
    : { kind: 'parse-unavailable' }
  let astSubcommands: string[] | null = null
  let astRedirects: Redirect[] | undefined
  let astCommands: SimpleCommand[] | undefined
  let shadowLegacySubs: string[] | undefined
  if (feature('TREE_SITTER_BASH_SHADOW')) {
    const available = astResult.kind !== 'parse-unavailable'
    let tooComplex = false
    let semanticFail = false
    let subsDiffer = false
    if (available) {
      tooComplex = astResult.kind === 'too-complex'
      semanticFail =
        astResult.kind === 'simple' && !checkSemantics(astResult.commands).ok
      const tsSubs =
        astResult.kind === 'simple'
          ? astResult.commands.map(c => c.text)
          : undefined
      const legacySubs = splitCommand(input.command)
      shadowLegacySubs = legacySubs
      subsDiffer =
        tsSubs !== undefined &&
        (tsSubs.length !== legacySubs.length ||
          tsSubs.some((s, i) => s !== legacySubs[i]))
    }
    logEvent('open_code_cli_tree_sitter_shadow', {
      available,
      astTooComplex: tooComplex,
      astSemanticFail: semanticFail,
      subsDiffer,
      injectionCheckDisabled,
      killswitchOff: !shadowEnabled,
      cmdOverLength: input.command.length > 10000,
    })
    astResult = { kind: 'parse-unavailable' }
    astRoot = null
  }
  if (astResult.kind === 'too-complex') {
    const earlyExit = checkEarlyExitDeny(input, appState.toolPermissionContext)
    if (earlyExit !== null) return earlyExit
    const decisionReason: PermissionDecisionReason = {
      type: 'other' as const,
      reason: astResult.reason,
    }
    logEvent('open_code_cli_bash_ast_too_complex', {
      nodeTypeId: nodeTypeId(astResult.nodeType),
    })
    return {
      behavior: 'ask',
      decisionReason,
      message: createPermissionRequestMessage(BashTool.name, decisionReason),
      suggestions: [],
      ...(feature('BASH_CLASSIFIER')
        ? {
            pendingClassifierCheck: buildPendingClassifierCheck(
              input.command,
              appState.toolPermissionContext,
            ),
          }
        : {}),
    }
  }
  if (astResult.kind === 'simple') {
    const sem = checkSemantics(astResult.commands)
    if (!sem.ok) {
      const earlyExit = checkSemanticsDeny(
        input,
        appState.toolPermissionContext,
        astResult.commands,
      )
      if (earlyExit !== null) return earlyExit
      const decisionReason: PermissionDecisionReason = {
        type: 'other' as const,
        reason: sem.reason,
      }
      return {
        behavior: 'ask',
        decisionReason,
        message: createPermissionRequestMessage(BashTool.name, decisionReason),
        suggestions: [],
      }
    }
    astSubcommands = astResult.commands.map(c => c.text)
    astRedirects = astResult.commands.flatMap(c => c.redirects)
    astCommands = astResult.commands
  }
  if (astResult.kind === 'parse-unavailable') {
    logForDebugging(
      'bashToolHasPermission: tree-sitter unavailable, using legacy shell-quote path',
    )
    const parseResult = tryParseShellCommand(input.command)
    if (!parseResult.success) {
      const decisionReason = {
        type: 'other' as const,
        reason: `Command contains malformed syntax that cannot be parsed: ${parseResult.error}`,
      }
      return {
        behavior: 'ask',
        decisionReason,
        message: createPermissionRequestMessage(BashTool.name, decisionReason),
      }
    }
  }
  if (
    SandboxManager.isSandboxingEnabled() &&
    SandboxManager.isAutoAllowBashIfSandboxedEnabled() &&
    shouldUseSandbox(input)
  ) {
    const sandboxAutoAllowResult = checkSandboxAutoAllow(
      input,
      appState.toolPermissionContext,
    )
    if (sandboxAutoAllowResult.behavior !== 'passthrough') {
      return sandboxAutoAllowResult
    }
  }
  const exactMatchResult = bashToolCheckExactMatchPermission(
    input,
    appState.toolPermissionContext,
  )
  if (exactMatchResult.behavior === 'deny') {
    return exactMatchResult
  }
  if (
    isClassifierPermissionsEnabled() &&
    !(
      feature('TRANSCRIPT_CLASSIFIER') &&
      appState.toolPermissionContext.mode === 'auto'
    )
  ) {
    const denyDescriptions = getBashPromptDenyDescriptions(
      appState.toolPermissionContext,
    )
    const askDescriptions = getBashPromptAskDescriptions(
      appState.toolPermissionContext,
    )
    const hasDeny = denyDescriptions.length > 0
    const hasAsk = askDescriptions.length > 0
    if (hasDeny || hasAsk) {
      const [denyResult, askResult] = await Promise.all([
        hasDeny
          ? classifyBashCommand(
              input.command,
              getCwd(),
              denyDescriptions,
              'deny',
              context.abortController.signal,
              context.options.isNonInteractiveSession,
            )
          : null,
        hasAsk
          ? classifyBashCommand(
              input.command,
              getCwd(),
              askDescriptions,
              'ask',
              context.abortController.signal,
              context.options.isNonInteractiveSession,
            )
          : null,
      ])
      if (context.abortController.signal.aborted) {
        throw new AbortError()
      }
      if (denyResult) {
        logClassifierResultForAnts(
          input.command,
          'deny',
          denyDescriptions,
          denyResult,
        )
      }
      if (askResult) {
        logClassifierResultForAnts(
          input.command,
          'ask',
          askDescriptions,
          askResult,
        )
      }
      if (denyResult?.matches && denyResult.confidence === 'high') {
        return {
          behavior: 'deny',
          message: `Denied by Bash prompt rule: "${denyResult.matchedDescription}"`,
          decisionReason: {
            type: 'other',
            reason: `Denied by Bash prompt rule: "${denyResult.matchedDescription}"`,
          },
        }
      }
      if (askResult?.matches && askResult.confidence === 'high') {
        let suggestions: PermissionUpdate[]
        if (getCommandSubcommandPrefixFn === getCommandSubcommandPrefix) {
          suggestions = suggestionForExactCommand(input.command)
        } else {
          const commandPrefixResult = await getCommandSubcommandPrefixFn(
            input.command,
            context.abortController.signal,
            context.options.isNonInteractiveSession,
          )
          if (context.abortController.signal.aborted) {
            throw new AbortError()
          }
          suggestions = commandPrefixResult?.commandPrefix
            ? suggestionForPrefix(commandPrefixResult.commandPrefix)
            : suggestionForExactCommand(input.command)
        }
        return {
          behavior: 'ask',
          message: createPermissionRequestMessage(BashTool.name),
          decisionReason: {
            type: 'other',
            reason: `Required by Bash prompt rule: "${askResult.matchedDescription}"`,
          },
          suggestions,
          ...(feature('BASH_CLASSIFIER')
            ? {
                pendingClassifierCheck: buildPendingClassifierCheck(
                  input.command,
                  appState.toolPermissionContext,
                ),
              }
            : {}),
        }
      }
    }
  }
  const commandOperatorResult = await checkCommandOperatorPermissions(
    input,
    (i: z.infer<typeof BashTool.inputSchema>) =>
      bashToolHasPermission(i, context, getCommandSubcommandPrefixFn),
    { isNormalizedCdCommand, isNormalizedGitCommand },
    astRoot,
  )
  if (commandOperatorResult.behavior !== 'passthrough') {
    if (commandOperatorResult.behavior === 'allow') {
      const safetyResult =
        astSubcommands === null
          ? await bashCommandIsSafeAsync(input.command)
          : null
      if (
        safetyResult !== null &&
        safetyResult.behavior !== 'passthrough' &&
        safetyResult.behavior !== 'allow'
      ) {
        appState = context.getAppState()
        return {
          behavior: 'ask',
          message: createPermissionRequestMessage(BashTool.name, {
            type: 'other',
            reason:
              safetyResult.message ??
              'Command contains patterns that require approval',
          }),
          decisionReason: {
            type: 'other',
            reason:
              safetyResult.message ??
              'Command contains patterns that require approval',
          },
          ...(feature('BASH_CLASSIFIER')
            ? {
                pendingClassifierCheck: buildPendingClassifierCheck(
                  input.command,
                  appState.toolPermissionContext,
                ),
              }
            : {}),
        }
      }
      appState = context.getAppState()
      const pathResult = checkPathConstraints(
        input,
        getCwd(),
        appState.toolPermissionContext,
        commandHasAnyCd(input.command),
        astRedirects,
        astCommands,
      )
      if (pathResult.behavior !== 'passthrough') {
        return pathResult
      }
    }
    if (commandOperatorResult.behavior === 'ask') {
      appState = context.getAppState()
      return {
        ...commandOperatorResult,
        ...(feature('BASH_CLASSIFIER')
          ? {
              pendingClassifierCheck: buildPendingClassifierCheck(
                input.command,
                appState.toolPermissionContext,
              ),
            }
          : {}),
      }
    }
    return commandOperatorResult
  }
  if (
    astSubcommands === null &&
    !isEnvTruthy(process.env.OPEN_CODE_CLI_DISABLE_COMMAND_INJECTION_CHECK)
  ) {
    const originalCommandSafetyResult = await bashCommandIsSafeAsync(
      input.command,
    )
    if (
      originalCommandSafetyResult.behavior === 'ask' &&
      originalCommandSafetyResult.isBashSecurityCheckForMisparsing
    ) {
      const remainder = stripSafeHeredocSubstitutions(input.command)
      const remainderResult =
        remainder !== null ? await bashCommandIsSafeAsync(remainder) : null
      if (
        remainder === null ||
        (remainderResult?.behavior === 'ask' &&
          remainderResult.isBashSecurityCheckForMisparsing)
      ) {
        appState = context.getAppState()
        const exactMatchResult = bashToolCheckExactMatchPermission(
          input,
          appState.toolPermissionContext,
        )
        if (exactMatchResult.behavior === 'allow') {
          return exactMatchResult
        }
        const decisionReason: PermissionDecisionReason = {
          type: 'other' as const,
          reason: originalCommandSafetyResult.message,
        }
        return {
          behavior: 'ask',
          message: createPermissionRequestMessage(
            BashTool.name,
            decisionReason,
          ),
          decisionReason,
          suggestions: [], // Don't suggest saving a potentially dangerous command
          ...(feature('BASH_CLASSIFIER')
            ? {
                pendingClassifierCheck: buildPendingClassifierCheck(
                  input.command,
                  appState.toolPermissionContext,
                ),
              }
            : {}),
        }
      }
    }
  }
  const cwd = getCwd()
  const cwdMingw =
    getPlatform() === 'windows' ? windowsPathToPosixPath(cwd) : cwd
  const rawSubcommands =
    astSubcommands ?? shadowLegacySubs ?? splitCommand(input.command)
  const { subcommands, astCommandsByIdx } = filterCdCwdSubcommands(
    rawSubcommands,
    astCommands,
    cwd,
    cwdMingw,
  )
  if (
    astSubcommands === null &&
    subcommands.length > MAX_SUBCOMMANDS_FOR_SECURITY_CHECK
  ) {
    logForDebugging(
      `bashPermissions: ${subcommands.length} subcommands exceeds cap (${MAX_SUBCOMMANDS_FOR_SECURITY_CHECK}) — returning ask`,
      { level: 'debug' },
    )
    const decisionReason = {
      type: 'other' as const,
      reason: `Command splits into ${subcommands.length} subcommands, too many to safety-check individually`,
    }
    return {
      behavior: 'ask',
      message: createPermissionRequestMessage(BashTool.name, decisionReason),
      decisionReason,
    }
  }
  const cdCommands = subcommands.filter(subCommand =>
    isNormalizedCdCommand(subCommand),
  )
  if (cdCommands.length > 1) {
    const decisionReason = {
      type: 'other' as const,
      reason:
        'Multiple directory changes in one command require approval for clarity',
    }
    return {
      behavior: 'ask',
      decisionReason,
      message: createPermissionRequestMessage(BashTool.name, decisionReason),
    }
  }
  const compoundCommandHasCd = cdCommands.length > 0
  if (compoundCommandHasCd) {
    const hasGitCommand = subcommands.some(cmd =>
      isNormalizedGitCommand(cmd.trim()),
    )
    if (hasGitCommand) {
      const decisionReason = {
        type: 'other' as const,
        reason:
          'Compound commands with cd and git require approval to prevent bare repository attacks',
      }
      return {
        behavior: 'ask',
        decisionReason,
        message: createPermissionRequestMessage(BashTool.name, decisionReason),
      }
    }
  }
  appState = context.getAppState() 
  const subcommandPermissionDecisions = subcommands.map((command, i) =>
    bashToolCheckPermission(
      { command },
      appState.toolPermissionContext,
      compoundCommandHasCd,
      astCommandsByIdx[i],
    ),
  )
  const deniedSubresult = subcommandPermissionDecisions.find(
    _ => _.behavior === 'deny',
  )
  if (deniedSubresult !== undefined) {
    return {
      behavior: 'deny',
      message: `Permission to use ${BashTool.name} with command ${input.command} has been denied.`,
      decisionReason: {
        type: 'subcommandResults',
        reasons: new Map(
          subcommandPermissionDecisions.map((result, i) => [
            subcommands[i]!,
            result,
          ]),
        ),
      },
    }
  }
  const pathResult = checkPathConstraints(
    input,
    getCwd(),
    appState.toolPermissionContext,
    compoundCommandHasCd,
    astRedirects,
    astCommands,
  )
  if (pathResult.behavior === 'deny') {
    return pathResult
  }
  const askSubresult = subcommandPermissionDecisions.find(
    _ => _.behavior === 'ask',
  )
  const nonAllowCount = count(
    subcommandPermissionDecisions,
    _ => _.behavior !== 'allow',
  )
  if (pathResult.behavior === 'ask' && askSubresult === undefined) {
    return pathResult
  }
  if (askSubresult !== undefined && nonAllowCount === 1) {
    return {
      ...askSubresult,
      ...(feature('BASH_CLASSIFIER')
        ? {
            pendingClassifierCheck: buildPendingClassifierCheck(
              input.command,
              appState.toolPermissionContext,
            ),
          }
        : {}),
    }
  }
  if (exactMatchResult.behavior === 'allow') {
    return exactMatchResult
  }
  let hasPossibleCommandInjection = false
  if (
    astSubcommands === null &&
    !isEnvTruthy(process.env.OPEN_CODE_CLI_DISABLE_COMMAND_INJECTION_CHECK)
  ) {
    let divergenceCount = 0
    const onDivergence = () => {
      divergenceCount++
    }
    const results = await Promise.all(
      subcommands.map(c => bashCommandIsSafeAsync(c, onDivergence)),
    )
    hasPossibleCommandInjection = results.some(
      r => r.behavior !== 'passthrough',
    )
    if (divergenceCount > 0) {
      logEvent('open_code_cli_tree_sitter_security_divergence', {
        quoteContextDivergence: true,
        count: divergenceCount,
      })
    }
  }
  if (
    subcommandPermissionDecisions.every(_ => _.behavior === 'allow') &&
    !hasPossibleCommandInjection
  ) {
    return {
      behavior: 'allow',
      updatedInput: input,
      decisionReason: {
        type: 'subcommandResults',
        reasons: new Map(
          subcommandPermissionDecisions.map((result, i) => [
            subcommands[i]!,
            result,
          ]),
        ),
      },
    }
  }
  let commandSubcommandPrefix: Awaited<
    ReturnType<typeof getCommandSubcommandPrefixFn>
  > = null
  if (getCommandSubcommandPrefixFn !== getCommandSubcommandPrefix) {
    commandSubcommandPrefix = await getCommandSubcommandPrefixFn(
      input.command,
      context.abortController.signal,
      context.options.isNonInteractiveSession,
    )
    if (context.abortController.signal.aborted) {
      throw new AbortError()
    }
  }
  appState = context.getAppState() 
  if (subcommands.length === 1) {
    const result = await checkCommandAndSuggestRules(
      { command: subcommands[0]! },
      appState.toolPermissionContext,
      commandSubcommandPrefix,
      compoundCommandHasCd,
      astSubcommands !== null,
    )
    if (result.behavior === 'ask' || result.behavior === 'passthrough') {
      return {
        ...result,
        ...(feature('BASH_CLASSIFIER')
          ? {
              pendingClassifierCheck: buildPendingClassifierCheck(
                input.command,
                appState.toolPermissionContext,
              ),
            }
          : {}),
      }
    }
    return result
  }
  const subcommandResults: Map<string, PermissionResult> = new Map()
  for (const subcommand of subcommands) {
    subcommandResults.set(
      subcommand,
      await checkCommandAndSuggestRules(
        {
          ...input,
          command: subcommand,
        },
        appState.toolPermissionContext,
        commandSubcommandPrefix?.subcommandPrefixes.get(subcommand),
        compoundCommandHasCd,
        astSubcommands !== null,
      ),
    )
  }
  if (
    subcommands.every(subcommand => {
      const permissionResult = subcommandResults.get(subcommand)
      return permissionResult?.behavior === 'allow'
    })
  ) {
    return {
      behavior: 'allow',
      updatedInput: input,
      decisionReason: {
        type: 'subcommandResults',
        reasons: subcommandResults,
      },
    }
  }
  const collectedRules: Map<string, PermissionRuleValue> = new Map()
  for (const [subcommand, permissionResult] of subcommandResults) {
    if (
      permissionResult.behavior === 'ask' ||
      permissionResult.behavior === 'passthrough'
    ) {
      const updates =
        'suggestions' in permissionResult
          ? permissionResult.suggestions
          : undefined
      const rules = extractRules(updates)
      for (const rule of rules) {
        const ruleKey = permissionRuleValueToString(rule)
        collectedRules.set(ruleKey, rule)
      }
      if (
        permissionResult.behavior === 'ask' &&
        rules.length === 0 &&
        permissionResult.decisionReason?.type !== 'rule'
      ) {
        for (const rule of extractRules(
          suggestionForExactCommand(subcommand),
        )) {
          const ruleKey = permissionRuleValueToString(rule)
          collectedRules.set(ruleKey, rule)
        }
      }
    }
  }
  const decisionReason = {
    type: 'subcommandResults' as const,
    reasons: subcommandResults,
  }
  const cappedRules = Array.from(collectedRules.values()).slice(
    0,
    MAX_SUGGESTED_RULES_FOR_COMPOUND,
  )
  const suggestedUpdates: PermissionUpdate[] | undefined =
    cappedRules.length > 0
      ? [
          {
            type: 'addRules',
            rules: cappedRules,
            behavior: 'allow',
            destination: 'localSettings',
          },
        ]
      : undefined
  return {
    behavior: askSubresult !== undefined ? 'ask' : 'passthrough',
    message: createPermissionRequestMessage(BashTool.name, decisionReason),
    decisionReason,
    suggestions: suggestedUpdates,
    ...(feature('BASH_CLASSIFIER')
      ? {
          pendingClassifierCheck: buildPendingClassifierCheck(
            input.command,
            appState.toolPermissionContext,
          ),
        }
      : {}),
  }
}
export function isNormalizedGitCommand(command: string): boolean {
  if (command.startsWith('git ') || command === 'git') {
    return true
  }
  const stripped = stripSafeWrappers(command)
  const parsed = tryParseShellCommand(stripped)
  if (parsed.success && parsed.tokens.length > 0) {
    if (parsed.tokens[0] === 'git') {
      return true
    }
    if (parsed.tokens[0] === 'xargs' && parsed.tokens.includes('git')) {
      return true
    }
    return false
  }
  return /^git(?:\s|$)/.test(stripped)
}
export function isNormalizedCdCommand(command: string): boolean {
  const stripped = stripSafeWrappers(command)
  const parsed = tryParseShellCommand(stripped)
  if (parsed.success && parsed.tokens.length > 0) {
    const cmd = parsed.tokens[0]
    return cmd === 'cd' || cmd === 'pushd' || cmd === 'popd'
  }
  return /^(?:cd|pushd|popd)(?:\s|$)/.test(stripped)
}
export function commandHasAnyCd(command: string): boolean {
  return splitCommand(command).some(subcmd =>
    isNormalizedCdCommand(subcmd.trim()),
  )
}
