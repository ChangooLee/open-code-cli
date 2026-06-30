import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  completeAgentTask,
  failAgentTask,
} from '../tasks/LocalAgentTask/LocalAgentTask.js'
import { appendSubagentMarkers } from '../tools/AgentTool/subagentMarkers.js'
import {
  awaitInFlightBackgroundChildren,
  extractBackgroundAgentSignals,
  evaluateVerificationGate,
} from '../query/verificationGate.js'
import { sleep } from '../utils/sleep.js'

// LIVE async-spawn proof (in-process, no synthetic task records).
//
// asyncJoinIntegration.test.ts fakes the whole thing: a setTimeout flips a
// hand-written object with a hand-set status/endTime/result.content. This test
// instead drives the REAL production data path and mocks only the model output:
//
//   a real async model-output stream is pumped by the real lifecycle loop ->
//   the real appendSubagentMarkers (the exact function finalizeAgentTool calls)
//   builds the result content from the real subagent messages -> the real
//   completeAgentTask/failAgentTask transitions the task in a real setAppState
//   store with a real endTime -> the parent's real await-join barrier, polling
//   concurrently on the event loop, reaps the live running->terminal transition
//   -> the real gate reads the real extracted signals.
//
// So the records the gate inspects are produced by production transition code,
// not fabricated — the exact gap the recalibration flagged.

type Block =
  | { type: 'tool_use'; id: string; name: string; input: any }
  | { type: 'text'; text: string }

function asstMsg(blocks: Block[]): any {
  return {
    type: 'assistant',
    requestId: 'req-1',
    message: {
      id: 'm-1',
      role: 'assistant',
      content: blocks,
      usage: {
        prompt_tokens: 1,
        completion_tokens: 1,
        cached_tokens: 0,
      },
    },
  }
}

function runningTask(id: string): any {
  return {
    type: 'local_agent',
    id,
    status: 'running',
    isBackgrounded: true,
    agentType: 'general-purpose',
    prompt: 'delegated work',
    retrieved: false,
    lastReportedToolCount: 0,
    lastReportedTokenCount: 0,
    pendingMessages: [],
    retain: false,
    diskLoaded: false,
  }
}

// A real model-output stream: makes `edits` Write calls (each after a real
// await, so the task is genuinely in-flight while the parent polls), a final
// text message, then returns the terminal reason — or throws if `crash`.
function modelStream(edits: number, terminalReason?: string, crash = false) {
  return (async function* () {
    for (let i = 0; i < edits; i++) {
      await sleep(15)
      yield asstMsg([
        { type: 'tool_use', id: `w${i}`, name: 'Write', input: { file_path: `f${i}.txt`, content: 'x' } },
      ])
    }
    await sleep(15)
    if (crash) throw new Error('subagent crashed mid-run')
    yield asstMsg([{ type: 'text', text: 'subagent done' }])
    return terminalReason
  })()
}

// Drive the real lifecycle pump + real transition in the background, exactly as
// runAsyncAgentLifecycle does: consume the stream, build the result content via
// the real marker function, then call the real completeAgentTask/failAgentTask.
function startLiveSubagent(opts: {
  id: string
  edits: number
  terminalReason?: string
  crash?: boolean
}) {
  let state: any = { tasks: { [opts.id]: runningTask(opts.id) } }
  const setAppState = (f: (prev: any) => any) => {
    state = f(state)
  }
  const stream = modelStream(opts.edits, opts.terminalReason, opts.crash)

  const life = (async () => {
    const agentMessages: any[] = []
    try {
      while (true) {
        const next = await stream.next()
        if (next.done) {
          const content = appendSubagentMarkers(
            [{ type: 'text', text: 'subagent done' }],
            agentMessages,
            next.value as string | undefined,
          )
          completeAgentTask(
            { agentId: opts.id, content, totalToolUseCount: agentMessages.length, totalDurationMs: 1, totalTokens: 1, usage: {} } as any,
            setAppState,
          )
          return
        }
        agentMessages.push(next.value)
      }
    } catch (e) {
      failAgentTask(opts.id, e instanceof Error ? e.message : String(e), setAppState)
    }
  })()

  return {
    life,
    getTasks: () => state.tasks,
    getStatus: () => state.tasks[opts.id]?.status,
  }
}

test('LIVE: barrier reaps a real background child making edits, then the gate blocks', async () => {
  const sinceMs = Date.now()
  const h = startLiveSubagent({ id: 'bg-edits', edits: 4 })

  // Synchronously after kickoff the real stream is mid-flight: still running.
  assert.equal(h.getStatus(), 'running')

  // Real barrier polls the real store until the lifecycle transitions it.
  await awaitInFlightBackgroundChildren(h.getTasks, () => false, 3000, 5)
  assert.equal(h.getStatus(), 'completed')
  await h.life

  // Markers were built by the real appendSubagentMarkers from real messages,
  // and completeAgentTask placed them with a real endTime.
  const t = h.getTasks()['bg-edits']
  assert.equal(typeof t.endTime, 'number')
  const signals = extractBackgroundAgentSignals(h.getTasks(), sinceMs)
  assert.equal(signals.edits, 4)
  assert.equal(signals.failed, false)
  assert.equal(evaluateVerificationGate([], signals).action, 'block')
})

test('LIVE: a real child that self-reports verification failure gates the parent', async () => {
  const sinceMs = Date.now()
  const h = startLiveSubagent({ id: 'bg-fail', edits: 1, terminalReason: 'verification_failed' })
  assert.equal(h.getStatus(), 'running')

  await awaitInFlightBackgroundChildren(h.getTasks, () => false, 3000, 5)
  assert.equal(h.getStatus(), 'completed')
  await h.life

  const signals = extractBackgroundAgentSignals(h.getTasks(), sinceMs)
  assert.equal(signals.failed, true)
  assert.equal(evaluateVerificationGate([], signals).action, 'block')
})

test('LIVE: a real child that finishes clean (no edits) does not gate', async () => {
  const sinceMs = Date.now()
  const h = startLiveSubagent({ id: 'bg-clean', edits: 0 })

  await awaitInFlightBackgroundChildren(h.getTasks, () => false, 3000, 5)
  assert.equal(h.getStatus(), 'completed')
  await h.life

  const signals = extractBackgroundAgentSignals(h.getTasks(), sinceMs)
  assert.deepEqual(signals, { edits: 0, failed: false })
  assert.equal(evaluateVerificationGate([], signals).action, 'allow')
})

test('LIVE: a real child that crashes mid-run transitions to failed without a marker (no false gate)', async () => {
  const sinceMs = Date.now()
  const h = startLiveSubagent({ id: 'bg-crash', edits: 2, crash: true })

  await awaitInFlightBackgroundChildren(h.getTasks, () => false, 3000, 5)
  assert.equal(h.getStatus(), 'failed')
  await h.life

  // A hard crash produces no result.content, hence no marker — matching prod:
  // it does not gate (only self-reported failure/edits do).
  const signals = extractBackgroundAgentSignals(h.getTasks(), sinceMs)
  assert.deepEqual(signals, { edits: 0, failed: false })
})

// The barrier must scope to THIS query session: a real child terminal BEFORE
// the session window must not gate a later, unrelated query.
test('LIVE: a child terminal before the session window does not gate', async () => {
  const h = startLiveSubagent({ id: 'bg-prior', edits: 5 })
  await awaitInFlightBackgroundChildren(h.getTasks, () => false, 3000, 5)
  await h.life
  const laterOnSessionStart = Date.now() + 1000
  const signals = extractBackgroundAgentSignals(h.getTasks(), laterOnSessionStart)
  assert.deepEqual(signals, { edits: 0, failed: false })
})
