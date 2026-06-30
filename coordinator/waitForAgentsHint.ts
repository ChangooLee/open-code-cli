export function buildWaitForAgentsHint(
  joinToolEnabled: boolean,
  waitForAgentsToolName: string,
  agentToolName: string,
): string {
  if (!joinToolEnabled) {
    return ''
  }
  return `### Structural join (${waitForAgentsToolName})
When a step genuinely cannot proceed until specific parallel workers finish — for example, synthesizing results that depend on ALL of several research workers, or gating a verification worker on an implementation worker — do not poll in prose or guess from notifications. Call **${waitForAgentsToolName}** with the \`agent_ids\` returned by your ${agentToolName} launches to block deterministically until every listed worker is terminal (completed/failed/killed) or the timeout elapses; it returns each worker's status and result. This is a hard join, not a substitute for normal async flow — keep launching independent workers concurrently and let notifications arrive; reach for ${waitForAgentsToolName} only when correctness requires all of a specific set before you continue.`
}

export function insertWaitForAgentsHint(
  prompt: string,
  hint: string,
  afterHeading: string,
): string {
  if (!hint) {
    return prompt
  }
  const idx = prompt.indexOf(afterHeading)
  if (idx === -1) {
    return `${prompt}\n${hint}`
  }
  const nextHeadingIdx = prompt.indexOf('\n## ', idx + afterHeading.length)
  if (nextHeadingIdx === -1) {
    return `${prompt}\n${hint}`
  }
  return `${prompt.slice(0, nextHeadingIdx)}\n${hint}${prompt.slice(nextHeadingIdx)}`
}
