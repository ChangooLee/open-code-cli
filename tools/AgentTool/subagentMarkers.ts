import { isFileMutatingBashCommand } from '../../query/verificationGate.js'

// The verification markers a subagent's result carries back to the parent gate.
// Extracted as a pure, dependency-light module so both finalizeAgentTool and
// the live async-spawn integration test share the exact same marker semantics
// (the test cannot import finalizeAgentTool itself without dragging in the
// AgentTool<->agentToolUtils init cycle).

const SUBAGENT_EDIT_TOOL_NAMES = new Set([
  'Edit',
  'Write',
  'NotebookEdit',
  'MultiEdit',
])

// Count file modifications a subagent made: edit-tool calls plus file-mutating
// Bash commands (sed -i, redirects, cp/mv, ...), mirroring the parent gate.
export function countSubagentEdits(agentMessages: any[]): number {
  let count = 0
  for (const m of agentMessages) {
    const blocks = m?.type === 'assistant' ? m?.message?.content : undefined
    if (!Array.isArray(blocks)) continue
    for (const b of blocks) {
      if (b?.type === 'tool_use' && SUBAGENT_EDIT_TOOL_NAMES.has(b.name)) {
        count++
      } else if (
        b?.type === 'tool_use' &&
        b.name === 'Bash' &&
        isFileMutatingBashCommand(b?.input?.command)
      ) {
        count++
      }
    }
  }
  return count
}

// A subagent that ran out of its own verification budget or made no progress
// reports failure to the parent, forcing the parent gate even if edit count
// alone would be below threshold.
export function subagentReasonFailed(terminalReason?: string): boolean {
  return (
    terminalReason === 'verification_failed' || terminalReason === 'no_progress'
  )
}

// Append the verification markers (edit count, failure flag) the parent gate
// reads from a delegated subagent's result. Pure: returns a new array.
export function appendSubagentMarkers<T>(
  content: T[],
  agentMessages: any[],
  terminalReason?: string,
): T[] {
  let out = content
  const edits = countSubagentEdits(agentMessages)
  if (edits > 0) {
    out = [
      ...out,
      { type: 'text', text: `<subagent_edits>${edits}</subagent_edits>` } as any,
    ]
  }
  if (subagentReasonFailed(terminalReason)) {
    out = [
      ...out,
      { type: 'text', text: '<subagent_verification_failed/>' } as any,
    ]
  }
  return out
}
