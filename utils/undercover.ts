import { getRepoClassCached } from './commitAttribution.js'
import { getGlobalConfig } from './config.js'
import { isEnvTruthy } from './envUtils.js'
export function isUndercover(): boolean {
  if (process.env.USER_TYPE === 'ant') {
    if (isEnvTruthy(process.env.OPEN_CODE_CLI_UNDERCOVER)) return true
    return getRepoClassCached() !== 'internal'
  }
  return false
}
export function getUndercoverInstructions(): string {
  if (process.env.USER_TYPE === 'ant') {
    return `## UNDERCOVER MODE — CRITICAL
You are operating UNDERCOVER in a PUBLIC/OPEN-SOURCE repository. Your commit
messages, PR titles, and PR bodies MUST NOT contain ANY OpenAICompatible-internal
information. Do not blow your cover.
NEVER include in commit messages or PR descriptions:
- Internal model codenames (animal names, etc.)
- Unreleased model version numbers (e.g., opus-4-7, sonnet-4-8)
- Internal repo or project names (e.g., open-code-cli-internal, openai-compatibles/…)
- Internal tooling, Slack channels, or short links (e.g., go/cc, #open-code-cli-…)
- The phrase "Open Code CLI" or any mention that you are an AI
- Any hint of what model or version you are
- Co-Authored-By lines or any other attribution
Write commit messages as a human developer would — describe only what the code
change does.
GOOD:
- "Fix race condition in file watcher initialization"
- "Add support for custom key bindings"
- "Refactor parser for better error messages"
BAD (never write these):
- "Fix bug found while testing with Open Code CLI Capybara"
- "1-shotted by openai/gpt-4.1"
- "Generated with Open Code CLI"
- "Co-Authored-By: configured model 4.6 <…>"
`
  }
  return ''
}
export function shouldShowUndercoverAutoNotice(): boolean {
  if (process.env.USER_TYPE === 'ant') {
    if (isEnvTruthy(process.env.OPEN_CODE_CLI_UNDERCOVER)) return false
    if (!isUndercover()) return false
    if (getGlobalConfig().hasSeenUndercoverAutoNotice) return false
    return true
  }
  return false
}
