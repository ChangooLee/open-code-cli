import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  awaitInFlightBackgroundChildren,
  extractBackgroundAgentSignals,
  evaluateVerificationGate,
} from '../query/verificationGate.js'

// INTEGRATION (in-process, deterministic): proves the three pieces the audit
// flagged as sharing an unproven dependency actually COMPOSE for a background
// subagent — the parent's await-join barrier reaps an in-flight child, then
// the gate sees the now-terminal, unverified-blocking state. This is what the
// headless e2e could not exercise (headless never drives background agents to
// terminal); here a concurrent timer plays the role of runAsyncAgentLifecycle
// transitioning the task to completed with the marker that finalizeAgentTool
// injects (the same marker the sync-delegated e2e proves end-to-end).

const queryStartedAt = 100

function runningBgTask() {
  return {
    type: 'local_agent',
    isBackgrounded: true,
    status: 'running',
    endTime: undefined as number | undefined,
  }
}

test('barrier reaps a concurrently-FAILING background child, then the gate blocks', async () => {
  const tasks: Record<string, any> = { bg: runningBgTask() }
  // Background subagent finishes shortly after the parent reaches completion,
  // failing its own verification (marker injected by finalizeAgentTool).
  const timer = setTimeout(() => {
    tasks.bg = {
      type: 'local_agent',
      isBackgrounded: true,
      status: 'failed',
      endTime: queryStartedAt + 1,
      result: {
        content: [
          { type: 'text', text: 'partial work\n<subagent_verification_failed/>' },
        ],
      },
    }
  }, 40)
  try {
    // Parent would complete now — barrier blocks until the child is terminal.
    await awaitInFlightBackgroundChildren(() => tasks, () => false, 3000, 5)
    // Child is now terminal: it must NOT still be running/pending.
    assert.notEqual(tasks.bg.status, 'running')
    const signals = extractBackgroundAgentSignals(tasks, queryStartedAt)
    assert.equal(signals.failed, true)
    const gate = evaluateVerificationGate([], signals)
    assert.equal(gate.action, 'block')
  } finally {
    clearTimeout(timer)
  }
})

test('barrier reaps a concurrently-EDITING background child, then the gate blocks on its edits', async () => {
  const tasks: Record<string, any> = { bg: runningBgTask() }
  const timer = setTimeout(() => {
    tasks.bg = {
      type: 'local_agent',
      isBackgrounded: true,
      status: 'completed',
      endTime: queryStartedAt + 1,
      result: {
        content: [{ type: 'text', text: 'done\n<subagent_edits>4</subagent_edits>' }],
      },
    }
  }, 40)
  try {
    await awaitInFlightBackgroundChildren(() => tasks, () => false, 3000, 5)
    const signals = extractBackgroundAgentSignals(tasks, queryStartedAt)
    assert.equal(signals.edits, 4)
    assert.equal(evaluateVerificationGate([], signals).action, 'block')
  } finally {
    clearTimeout(timer)
  }
})

test('a background child that finishes VERIFIED (no marker) does not block', async () => {
  const tasks: Record<string, any> = { bg: runningBgTask() }
  const timer = setTimeout(() => {
    tasks.bg = {
      type: 'local_agent',
      isBackgrounded: true,
      status: 'completed',
      endTime: queryStartedAt + 1,
      result: { content: [{ type: 'text', text: 'all verified, no markers' }] },
    }
  }, 40)
  try {
    await awaitInFlightBackgroundChildren(() => tasks, () => false, 3000, 5)
    const signals = extractBackgroundAgentSignals(tasks, queryStartedAt)
    assert.deepEqual(signals, { edits: 0, failed: false })
    assert.equal(evaluateVerificationGate([], signals).action, 'allow')
  } finally {
    clearTimeout(timer)
  }
})

// A child that NEVER finishes must not hang the parent forever — barrier times
// out, and (because the child never reached terminal) it does not gate.
test('barrier times out on a stuck child without hanging or false-gating', async () => {
  const tasks: Record<string, any> = { bg: runningBgTask() }
  const t0 = Date.now()
  await awaitInFlightBackgroundChildren(() => tasks, () => false, 150, 10)
  assert.ok(Date.now() - t0 >= 150 && Date.now() - t0 < 1500)
  const signals = extractBackgroundAgentSignals(tasks, queryStartedAt)
  assert.deepEqual(signals, { edits: 0, failed: false })
})
