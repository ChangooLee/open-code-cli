import { feature } from 'bun:bundle'
import {
  AGENT_TOOL_NAME,
  VERIFICATION_AGENT_TYPE,
} from '../tools/AgentTool/constants.js'

const EDIT_TOOL_NAMES = new Set([
  'Edit',
  'Write',
  'NotebookEdit',
  'MultiEdit',
])
const NONTRIVIAL_EDIT_THRESHOLD = 3
const MAX_VERIFY_DIRECTIVES = 3
const DIRECTIVE_MARKER = 'independent verification verdict'

function contentBlocks(m: any): any[] {
  const c = m?.message?.content
  return Array.isArray(c) ? c : []
}

function toolResultText(block: any): string {
  const c = block?.content
  if (typeof c === 'string') {
    return c
  }
  if (Array.isArray(c)) {
    return c
      .map((x: any) => (typeof x?.text === 'string' ? x.text : ''))
      .join('\n')
  }
  return ''
}

export type VerificationGateAction = 'allow' | 'block' | 'fail'

export function evaluateVerificationGate(messages: any[]): {
  action: VerificationGateAction
  editCount: number
} {
  if (!feature('VERIFY_IMPLEMENTATION_BEFORE_COMPLETION')) {
    return { action: 'allow', editCount: 0 }
  }
  let editCount = 0
  let directiveCount = 0
  // tool_use ids of Agent calls that spawned the verification subagent. A
  // VERDICT: PASS only counts when it comes back as THAT call's tool_result —
  // so an unrelated Bash log echoing the string cannot fake a pass.
  const verifierToolUseIds = new Set<string>()
  for (const m of messages) {
    const raw = (m as any)?.message?.content
    if (typeof raw === 'string' && raw.includes(DIRECTIVE_MARKER)) {
      directiveCount++
    }
    for (const block of contentBlocks(m)) {
      if (block?.type === 'tool_use') {
        if (EDIT_TOOL_NAMES.has(block.name)) {
          editCount++
        }
        if (
          block.name === AGENT_TOOL_NAME &&
          block?.input?.subagent_type === VERIFICATION_AGENT_TYPE &&
          typeof block.id === 'string'
        ) {
          verifierToolUseIds.add(block.id)
        }
      } else if (block?.type === 'tool_result') {
        // Edits made by a subagent are reported back via a marker in the
        // Agent tool_result so the parent gate is not blind to delegated work.
        const m = toolResultText(block).match(
          /<subagent_edits>(\d+)<\/subagent_edits>/,
        )
        if (m) {
          editCount += Number(m[1])
        }
      } else if (
        block?.type === 'text' &&
        typeof block.text === 'string' &&
        block.text.includes(DIRECTIVE_MARKER)
      ) {
        directiveCount++
      }
    }
  }
  let passVerdict = false
  for (const m of messages) {
    for (const block of contentBlocks(m)) {
      if (
        block?.type === 'tool_result' &&
        typeof block.tool_use_id === 'string' &&
        verifierToolUseIds.has(block.tool_use_id) &&
        /VERDICT:\s*PASS/.test(toolResultText(block))
      ) {
        passVerdict = true
      }
    }
  }
  const nonTrivial = editCount >= NONTRIVIAL_EDIT_THRESHOLD
  if (!nonTrivial || passVerdict) {
    return { action: 'allow', editCount }
  }
  // Non-trivial work, not verified: keep blocking and re-prompting for
  // verification. Do NOT silently complete after a few tries — once the
  // directive budget is exhausted the task FAILS explicitly rather than
  // reporting success unverified. (The model-call cap is the ultimate
  // backstop if the model ignores the directives entirely.)
  if (directiveCount < MAX_VERIFY_DIRECTIVES) {
    return { action: 'block', editCount }
  }
  return { action: 'fail', editCount }
}

export function buildVerificationDirective(editCount: number): string {
  return `You have made ${editCount} file modifications this session but have not obtained an independent verification verdict. You MUST NOT report completion yet. Call the ${AGENT_TOOL_NAME} tool with subagent_type="${VERIFICATION_AGENT_TYPE}", passing the original task, the files you changed, and the approach you took. The verifier must run actual build/test commands and end its report with "VERDICT: PASS" before you may finish. If it returns FAIL, fix the issues and verify again.`
}
