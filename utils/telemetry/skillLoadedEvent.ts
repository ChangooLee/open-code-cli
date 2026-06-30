import { getSkillToolCommands } from '../../commands.js'
import {
  type AnalyticsScalarMetadata,
  type AnalyticsPiiScalarMetadata,
  logEvent,
} from '../../services/analytics/index.js'
import { getCharBudget } from '../../tools/SkillTool/prompt.js'
export async function logSkillsLoaded(
  cwd: string,
  contextWindowTokens: number,
): Promise<void> {
  const skills = await getSkillToolCommands(cwd)
  const skillBudget = getCharBudget(contextWindowTokens)
  for (const skill of skills) {
    if (skill.type !== 'prompt') continue
    logEvent('open_code_cli_skill_loaded', {
      _PROTO_skill_name:
        skill.name as AnalyticsPiiScalarMetadata,
      skill_source:
        skill.source as AnalyticsScalarMetadata,
      skill_loaded_from:
        skill.loadedFrom as AnalyticsScalarMetadata,
      skill_budget: skillBudget,
      ...(skill.kind && {
        skill_kind:
          skill.kind as AnalyticsScalarMetadata,
      }),
    })
  }
}
