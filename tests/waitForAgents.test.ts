import { test } from 'node:test'
import assert from 'node:assert/strict'
import { WaitForAgentsTool } from '../tools/WaitForAgentsTool/WaitForAgentsTool.js'

function ctx(tasks: Record<string, any>) {
  return {
    getAppState: () => ({ tasks }),
    abortController: new AbortController(),
  } as any
}

// Regression test for the audit-found false-positive join defect.
test('a missing id is not_found and does NOT count as terminal', async () => {
  const r = await WaitForAgentsTool.call(
    { agent_ids: ['ghost1', 'ghost2'], timeout: 50 } as any,
    ctx({}),
    undefined as any,
    undefined as any,
  )
  assert.equal(r.data.all_terminal, false)
  assert.equal(r.data.timed_out, true)
  assert.deepEqual(
    r.data.agents.map((a: any) => a.status),
    ['not_found', 'not_found'],
  )
})

test('a completed agent yields all_terminal with its result', async () => {
  const tasks = {
    a: {
      status: 'completed',
      type: 'local_agent',
      result: { content: [{ type: 'text', text: 'done-result' }] },
    },
  }
  const r = await WaitForAgentsTool.call(
    { agent_ids: ['a'], timeout: 1000 } as any,
    ctx(tasks),
    undefined as any,
    undefined as any,
  )
  assert.equal(r.data.all_terminal, true)
  assert.equal(r.data.timed_out, false)
  assert.equal(r.data.agents[0].status, 'completed')
  assert.match(r.data.agents[0].result, /done-result/)
})

test('a still-running agent times out (never falsely terminal)', async () => {
  const tasks = { a: { status: 'running', type: 'local_agent' } }
  const r = await WaitForAgentsTool.call(
    { agent_ids: ['a'], timeout: 50 } as any,
    ctx(tasks),
    undefined as any,
    undefined as any,
  )
  assert.equal(r.data.all_terminal, false)
  assert.equal(r.data.timed_out, true)
})
