import type { CustomAgentDefinition } from '../../../tools/AgentTool/loadAgentsDir.js'
import type { AgentMemoryScope } from '../../../tools/AgentTool/agentMemory.js'
import type { SettingSource } from '../../../utils/settings/constants.js'

/**
 * Mutable data collected across the "create agent" wizard steps.
 *
 * Steps read these as fully populated (the provider seeds an empty object and
 * casts), so the fields consumed when assembling the final agent are required.
 */
export type AgentWizardData = {
  agentType: string
  whenToUse: string
  systemPrompt: string
  location: SettingSource
  selectedTools?: string[]
  selectedModel?: string
  selectedColor?: string
  selectedMemory?: AgentMemoryScope
  generationPrompt?: string
  wasGenerated?: boolean
  finalAgent?: CustomAgentDefinition
}
