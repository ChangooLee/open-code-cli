export const DISCOVER_SKILLS_TOOL_NAME = 'DiscoverSkills'

export function getDiscoverSkillsPrompt(): string {
  return `Searches the available skills for ones relevant to the current task.

- Use this tool to find skills by keyword when the full skill listing is deferred.
- Returns matching skill names and descriptions.`
}
