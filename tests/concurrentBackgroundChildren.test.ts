import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  awaitInFlightBackgroundChildren,
  extractBackgroundAgentSignals,
  evaluateVerificationGate,
} from '../query/verificationGate.js'

// CONCURRENT-CHILD BARRIER SCALING (in-process, deterministic):
// asyncJoinIntegration.test.ts proves the barrier + signal-extraction + gate
// compose for a SINGLE background subagent. Production runs MANY background
// children at once (the orchestrator can spawn several at a time), and the
// barrier must wait for ALL of them while the aggregator must sum edits across
// every terminal child and OR their failure flags. These tests pin that
// multi-child behavior: the barrier only releases once the LAST in-flight
// child is terminal, and the signals reflect the union of every child's work.

const queryStartedAt = 100

function runningBgTask() {
  return {
    type: 'local_agent',
    isBackgrounded: true,
    status: 'running' as string,
    endTime: undefined as number | undefined,
  }
}

function completedWithEdits(n: number, endTime: number) {
  return {
    type: 'local_agent',
    isBackgrounded: true,
    status: 'completed',
    endTime,
    result: {
      content: [{ type: 'text', text: `done\n<subagent_edits>${n}</subagent_edits>` }],
    },
  }
}

function failedChild(endTime: number) {
  return {
    type: 'local_agent',
    isBackgrounded: true,
    status: 'failed',
    endTime,
    result: {
      content: [
        { type: 'text', text: 'partial\n<subagent_verification_failed/>' },
      ],
    },
  }
}

test('barrier waits for the LAST of several in-flight children to finish', async () => {
  // Three background children finishing at staggered times; the barrier must
  // not release after the first/second completes — only once ALL are terminal.
  const tasks: Record<string, any> = {
    a: runningBgTask(),
    b: runningBgTask(),
    c: runningBgTask(),
  }
  const timers = [
    setTimeout(() => {
      tasks.a = completedWithEdits(2, queryStartedAt + 1)
    }, 30),
    setTimeout(() => {
      tasks.b = completedWithEdits(3, queryStartedAt + 1)
    }, 60),
    setTimeout(() => {
      tasks.c = completedWithEdits(1, queryStartedAt + 1)
    }, 90),
  ]
  try {
    await awaitInFlightBackgroundChildren(() => tasks, () => false, 3000, 5)
    // Every child must be terminal once the barrier releases.
    for (const key of ['a', 'b', 'c']) {
      assert.notEqual(tasks[key].status, 'running', `${key} still running`)
      assert.notEqual(tasks[key].status, 'pending', `${key} still pending`)
    }
  } finally {
    timers.forEach(clearTimeout)
  }
})

test('signals AGGREGATE edits across multiple completed children', async () => {
  const tasks: Record<string, any> = {
    a: completedWithEdits(2, queryStartedAt + 1),
    b: completedWithEdits(3, queryStartedAt + 1),
    c: completedWithEdits(4, queryStartedAt + 1),
  }
  const signals = extractBackgroundAgentSignals(tasks, queryStartedAt)
  assert.equal(signals.edits, 9)
  assert.equal(signals.failed, false)
  // 9 edits, no verification -> gate blocks.
  assert.equal(evaluateVerificationGate([], signals).action, 'block')
})

test('ANY failed child trips the failure flag even when others succeed', async () => {
  const tasks: Record<string, any> = {
    a: completedWithEdits(1, queryStartedAt + 1),
    b: failedChild(queryStartedAt + 1),
    c: completedWithEdits(1, queryStartedAt + 1),
  }
  const signals = extractBackgroundAgentSignals(tasks, queryStartedAt)
  // Only 2 edits (< threshold) but a failed child must still block via the
  // any-failed signal — failure is not gated behind the edit threshold.
  assert.equal(signals.edits, 2)
  assert.equal(signals.failed, true)
  assert.equal(evaluateVerificationGate([], signals).action, 'block')
})

test('multiple failed children still report a single OR-ed failure (no double-count)', async () => {
  const tasks: Record<string, any> = {
    a: failedChild(queryStartedAt + 1),
    b: failedChild(queryStartedAt + 1),
  }
  const signals = extractBackgroundAgentSignals(tasks, queryStartedAt)
  assert.equal(signals.failed, true)
  assert.equal(signals.edits, 0)
})

test('all-clean concurrent children do not block', async () => {
  const tasks: Record<string, any> = {
    a: {
      type: 'local_agent',
      isBackgrounded: true,
      status: 'completed',
      endTime: queryStartedAt + 1,
      result: { content: [{ type: 'text', text: 'verified, no markers' }] },
    },
    b: {
      type: 'local_agent',
      isBackgrounded: true,
      status: 'completed',
      endTime: queryStartedAt + 1,
      result: { content: [{ type: 'text', text: 'also clean' }] },
    },
  }
  const signals = extractBackgroundAgentSignals(tasks, queryStartedAt)
  assert.deepEqual(signals, { edits: 0, failed: false })
  assert.equal(evaluateVerificationGate([], signals).action, 'allow')
})

test('aggregation counts only CURRENT-session children, mixing stale and fresh', async () => {
  // One child became terminal BEFORE this query started (stale) and one
  // during it (fresh). Only the fresh child's edits/failure must count.
  const tasks: Record<string, any> = {
    stale: {
      type: 'local_agent',
      isBackgrounded: true,
      status: 'failed',
      endTime: queryStartedAt - 50,
      result: {
        content: [
          { type: 'text', text: 'old\n<subagent_edits>9</subagent_edits>\n<subagent_verification_failed/>' },
        ],
      },
    },
    fresh: completedWithEdits(2, queryStartedAt + 5),
  }
  const signals = extractBackgroundAgentSignals(tasks, queryStartedAt)
  assert.equal(signals.edits, 2)
  assert.equal(signals.failed, false)
})

test('barrier releases as soon as no child is in-flight even if others are terminal', async () => {
  // Mixed pool: one already-terminal child plus two still running. The barrier
  // must keep waiting for the two running ones (not release because one is
  // already done), then release once both finish.
  const tasks: Record<string, any> = {
    done: completedWithEdits(1, queryStartedAt + 1),
    r1: runningBgTask(),
    r2: runningBgTask(),
  }
  const timers = [
    setTimeout(() => {
      tasks.r1 = completedWithEdits(2, queryStartedAt + 1)
    }, 40),
    setTimeout(() => {
      tasks.r2 = failedChild(queryStartedAt + 1)
    }, 70),
  ]
  try {
    const t0 = Date.now()
    await awaitInFlightBackgroundChildren(() => tasks, () => false, 3000, 5)
    // Should not have released before the slowest running child (~70ms).
    assert.ok(Date.now() - t0 >= 60, 'released too early')
    const signals = extractBackgroundAgentSignals(tasks, queryStartedAt)
    assert.equal(signals.edits, 3)
    assert.equal(signals.failed, true)
  } finally {
    timers.forEach(clearTimeout)
  }
})

test('barrier times out if ANY child stays stuck, even when others finished', async () => {
  const tasks: Record<string, any> = {
    done: completedWithEdits(1, queryStartedAt + 1),
    stuck: runningBgTask(),
  }
  const t0 = Date.now()
  await awaitInFlightBackgroundChildren(() => tasks, () => false, 150, 10)
  // Must respect the timeout (the stuck child never finishes).
  assert.ok(Date.now() - t0 >= 150 && Date.now() - t0 < 1500)
  // The finished child's signal is still readable; the stuck one contributes
  // nothing (never terminal).
  const signals = extractBackgroundAgentSignals(tasks, queryStartedAt)
  assert.equal(signals.edits, 1)
})
