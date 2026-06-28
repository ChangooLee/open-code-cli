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
const MAX_VERIFY_CYCLES = 3
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

export function evaluateVerificationGate(messages: any[]): {
  blockCompletion: boolean
  editCount: number
} {
  if (!feature('VERIFY_IMPLEMENTATION_BEFORE_COMPLETION')) {
    return { blockCompletion: false, editCount: 0 }
  }
  let editCount = 0
  let verifyCycles = 0
  let passVerdict = false
  let directiveCount = 0
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
          block?.input?.subagent_type === VERIFICATION_AGENT_TYPE
        ) {
          verifyCycles++
        }
      } else if (block?.type === 'tool_result') {
        if (/VERDICT:\s*PASS/.test(toolResultText(block))) {
          passVerdict = true
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
  const nonTrivial = editCount >= NONTRIVIAL_EDIT_THRESHOLD
  const blockCompletion =
    nonTrivial &&
    !passVerdict &&
    verifyCycles < MAX_VERIFY_CYCLES &&
    directiveCount < MAX_VERIFY_DIRECTIVES
  return { blockCompletion, editCount }
}

export function buildVerificationDirective(editCount: number): string {
  return `You have made ${editCount} file modifications this session but have not obtained an independent verification verdict. You MUST NOT report completion yet. Call the ${AGENT_TOOL_NAME} tool with subagent_type="${VERIFICATION_AGENT_TYPE}", passing the original task, the files you changed, and the approach you took. The verifier must run actual build/test commands and end its report with "VERDICT: PASS" before you may finish. If it returns FAIL, fix the issues and verify again.`
}
