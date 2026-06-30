import { feature } from 'bun:bundle'
import {
  clearInvokedSkills,
  setLastEmittedDate,
} from '../../bootstrap/state.js'
import { clearCommandsCache } from '../../commands.js'
import { getOnSessionStartDate } from '../../constants/common.js'
import {
  getGitStatus,
  getSystemContext,
  getUserContext,
  setSystemPromptInjection,
} from '../../context.js'
import { clearFileSuggestionCaches } from '../../hooks/fileSuggestions.js'
import { clearAllPendingCallbacks } from '../../hooks/useSwarmPermissionPoller.js'
import { clearAllDumpState } from '../../services/api/dumpPrompts.js'
import { resetPromptCacheInvalidation } from '../../services/api/promptCacheInvalidation.js'
import { clearAllSessions } from '../../services/api/sessionIngress.js'
import { runAfterContextCompactCleanup } from '../../services/compact/postCompactCleanup.js'
import { resetAllLSPDiagnosticState } from '../../services/lsp/LSPDiagnosticRegistry.js'
import { clearTrackedMagicDocs } from '../../services/MagicDocs/magicDocs.js'
import { clearDynamicSkills } from '../../skills/loadSkillsDir.js'
import { resetSentSkillNames } from '../../utils/attachments.js'
import { clearCommandPrefixCaches } from '../../utils/bash/commands.js'
import { resetGetMemoryFilesCache } from '../../utils/projectMd.js'
import { clearRepositoryCaches } from '../../utils/detectRepository.js'
import { clearResolveGitDirCache } from '../../utils/git/gitFilesystem.js'
import { clearStoredImagePaths } from '../../utils/imageStore.js'
import { clearSessionEnvVars } from '../../utils/sessionEnvVars.js'
export function clearSessionCaches(
  preservedAgentIds: ReadonlySet<string> = new Set(),
): void {
  const hasPreserved = preservedAgentIds.size > 0
  getUserContext.cache.clear?.()
  getSystemContext.cache.clear?.()
  getGitStatus.cache.clear?.()
  getOnSessionStartDate.cache.clear?.()
  clearFileSuggestionCaches()
  clearCommandsCache()
  if (!hasPreserved) resetPromptCacheInvalidation()
  setSystemPromptInjection(null)
  setLastEmittedDate(null)
  runAfterContextCompactCleanup()
  resetSentSkillNames()
  resetGetMemoryFilesCache('session_start')
  clearStoredImagePaths()
  clearAllSessions()
  if (!hasPreserved) clearAllPendingCallbacks()
  if (process.env.USER_TYPE === 'ant') {
    void import('../../tools/TungstenTool/TungstenTool.js').then(
      ({ clearSessionsWithTungstenUsage, resetInitializationState }) => {
        clearSessionsWithTungstenUsage()
        resetInitializationState()
      },
    )
  }
  if (feature('COMMIT_ATTRIBUTION')) {
    void import('../../utils/attributionHooks.js').then(
      ({ clearAttributionCaches }) => clearAttributionCaches(),
    )
  }
  clearRepositoryCaches()
  clearCommandPrefixCaches()
  if (!hasPreserved) clearAllDumpState()
  clearInvokedSkills(preservedAgentIds)
  clearResolveGitDirCache()
  clearDynamicSkills()
  resetAllLSPDiagnosticState()
  clearTrackedMagicDocs()
  clearSessionEnvVars()
  void import('../../tools/WebFetchTool/utils.js').then(
    ({ clearWebFetchCache }) => clearWebFetchCache(),
  )
  void import('../../tools/CapabilitySearchTool/CapabilitySearchTool.js').then(
    ({ clearCapabilitySearchDescriptionCache }) => clearCapabilitySearchDescriptionCache(),
  )
  void import('../../tools/AgentTool/loadAgentsDir.js').then(
    ({ clearAgentDefinitionsCache }) => clearAgentDefinitionsCache(),
  )
  void import('../../tools/SkillTool/prompt.js').then(({ clearPromptCache }) =>
    clearPromptCache(),
  )
}
