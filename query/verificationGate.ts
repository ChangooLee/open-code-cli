import { feature } from 'bun:bundle'
import {
  AGENT_TOOL_NAME,
  VERIFICATION_AGENT_TYPE,
} from '../tools/AgentTool/constants.js'
import { sleep } from '../utils/sleep.js'

export const BACKGROUND_JOIN_TIMEOUT_MS = 120_000

// Before the parent reports completion, reap in-flight background subagents so
// their (possibly unverified) work is terminal and visible to the gate — a
// real join barrier, not "scan whatever happens to be terminal". Bounded by a
// timeout and the abort signal so it can never hang the parent forever.
export async function awaitInFlightBackgroundChildren(
  getTasks: () => Record<string, any> | undefined,
  isAborted: () => boolean,
  timeoutMs: number,
  sleepMs = 100,
): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    if (isAborted()) {
      return
    }
    const tasks = getTasks() ?? {}
    const inflight = Object.values(tasks).some(
      (t: any) =>
        t?.type === 'local_agent' &&
        t?.isBackgrounded &&
        (t?.status === 'running' || t?.status === 'pending'),
    )
    if (!inflight) {
      return
    }
    await sleep(sleepMs)
  }
}

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

export type BackgroundAgentSignals = { edits: number; failed: boolean }

// Background/async subagents never return a tool_result into the parent's
// message stream (their result is stored as a task), so the marker scan below
// cannot see them. The caller extracts equivalent signals straight from the
// completed background task results and passes them in. Reading genuine task
// results (not arbitrary tool_result text) keeps this spoof-resistant.
export function extractBackgroundAgentSignals(
  tasks: Record<string, any> | undefined,
  sinceMs?: number,
): BackgroundAgentSignals {
  let edits = 0
  let failed = false
  for (const t of Object.values(tasks ?? {})) {
    if (
      (t as any)?.type !== 'local_agent' ||
      !(t as any)?.isBackgrounded ||
      ((t as any)?.status !== 'completed' && (t as any)?.status !== 'failed')
    ) {
      continue
    }
    // Only count work that became terminal during the CURRENT query session.
    // Without this, a failed background task from a PRIOR turn would re-block
    // every later (unrelated) query until it evicts.
    if (sinceMs !== undefined) {
      const endTime = (t as any)?.endTime
      if (typeof endTime !== 'number' || endTime < sinceMs) {
        continue
      }
    }
    const content = (t as any)?.result?.content
    const text = Array.isArray(content)
      ? content.map((b: any) => (typeof b?.text === 'string' ? b.text : '')).join('\n')
      : ''
    const m = text.match(/<subagent_edits>(\d+)<\/subagent_edits>/)
    if (m) {
      edits += Number(m[1])
    }
    if (text.includes('<subagent_verification_failed/>')) {
      failed = true
    }
  }
  return { edits, failed }
}

export function evaluateVerificationGate(
  messages: any[],
  backgroundSignals?: BackgroundAgentSignals,
): {
  action: VerificationGateAction
  editCount: number
} {
  if (!feature('VERIFY_IMPLEMENTATION_BEFORE_COMPLETION')) {
    return { action: 'allow', editCount: 0 }
  }
  let editCount = backgroundSignals?.edits ?? 0
  let directiveCount = 0
  let subagentFailed = backgroundSignals?.failed ?? false
  // tool_use ids of Agent calls (any subagent), and of the verification
  // subagent specifically. Delegated-work and PASS markers only count when
  // they come back as THAT Agent call's tool_result — so an unrelated Bash
  // log echoing the strings cannot fake edits, a failure, or a pass.
  const agentToolUseIds = new Set<string>()
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
        if (block.name === AGENT_TOOL_NAME && typeof block.id === 'string') {
          agentToolUseIds.add(block.id)
          if (block?.input?.subagent_type === VERIFICATION_AGENT_TYPE) {
            verifierToolUseIds.add(block.id)
          }
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
        block?.type !== 'tool_result' ||
        typeof block.tool_use_id !== 'string'
      ) {
        continue
      }
      const text = toolResultText(block)
      // Delegated-work markers count only from a genuine Agent subagent result.
      if (agentToolUseIds.has(block.tool_use_id)) {
        const em = text.match(/<subagent_edits>(\d+)<\/subagent_edits>/)
        if (em) {
          editCount += Number(em[1])
        }
        if (text.includes('<subagent_verification_failed/>')) {
          subagentFailed = true
        }
      }
      if (
        verifierToolUseIds.has(block.tool_use_id) &&
        /VERDICT:\s*PASS/.test(text)
      ) {
        passVerdict = true
      }
    }
  }
  const nonTrivial = editCount >= NONTRIVIAL_EDIT_THRESHOLD || subagentFailed
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
