import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  createBudgetTracker,
  checkTokenBudget,
  resolveSubagentBudget,
} from '../query/tokenBudget.js'

// resolveSubagentBudget: parses the env-sourced subagent budget.
test('resolveSubagentBudget: undefined/empty/invalid -> null', () => {
  assert.equal(resolveSubagentBudget(undefined), null)
  assert.equal(resolveSubagentBudget(''), null)
  assert.equal(resolveSubagentBudget('   '), null)
  assert.equal(resolveSubagentBudget('abc'), null)
  assert.equal(resolveSubagentBudget('0'), null)
  assert.equal(resolveSubagentBudget('-100'), null)
  assert.equal(resolveSubagentBudget('NaN'), null)
})

test('resolveSubagentBudget: positive numbers parse (floored)', () => {
  assert.equal(resolveSubagentBudget('1000'), 1000)
  assert.equal(resolveSubagentBudget(' 50000 '), 50000)
  assert.equal(resolveSubagentBudget('1234.9'), 1234)
})

// Backward-compatible default behavior: subagent with no subagent budget
// (undefined) keeps the historical short-circuit -> stop, no event.
test('subagent without subagent budget still short-circuits to stop', () => {
  const tracker = createBudgetTracker()
  const d = checkTokenBudget(tracker, 'agent-1', null, 5000)
  assert.equal(d.action, 'stop')
  assert.equal((d as { completionEvent: unknown }).completionEvent, null)
  // tracker untouched
  assert.equal(tracker.continuationCount, 0)
})

test('subagent passing explicit null/0 subagent budget short-circuits', () => {
  const t1 = createBudgetTracker()
  assert.equal(checkTokenBudget(t1, 'agent-1', null, 5000, null).action, 'stop')
  const t2 = createBudgetTracker()
  assert.equal(checkTokenBudget(t2, 'agent-1', null, 5000, 0).action, 'stop')
  assert.equal(t1.continuationCount, 0)
})

// New behavior: subagent WITH a positive subagent budget gets its own
// continue/stop enforcement, independent of the (null) main-agent budget.
test('subagent under budget gets a continue nudge against its own budget', () => {
  const tracker = createBudgetTracker()
  // 1000 of a 10000 budget -> 10%, well under the 90% completion threshold
  const d = checkTokenBudget(tracker, 'agent-1', null, 1000, 10000)
  assert.equal(d.action, 'continue')
  if (d.action === 'continue') {
    assert.equal(d.budget, 10000)
    assert.equal(d.pct, 10)
    assert.equal(d.turnTokens, 1000)
    assert.equal(d.continuationCount, 1)
    assert.match(d.nudgeMessage, /token target/)
  }
  assert.equal(tracker.continuationCount, 1)
})

test('subagent at/over completion threshold stops with a completion event', () => {
  const tracker = createBudgetTracker()
  // first call continues (10%)
  checkTokenBudget(tracker, 'agent-1', null, 1000, 10000)
  // now jump to 95% -> over 0.9 threshold, and continuationCount>0 -> event
  const d = checkTokenBudget(tracker, 'agent-1', null, 9500, 10000)
  assert.equal(d.action, 'stop')
  if (d.action === 'stop') {
    assert.notEqual(d.completionEvent, null)
    assert.equal(d.completionEvent!.budget, 10000)
    assert.equal(d.completionEvent!.pct, 95)
    assert.equal(d.completionEvent!.diminishingReturns, false)
  }
})

test('subagent budget does not affect the main-agent (agentId undefined) path', () => {
  const tracker = createBudgetTracker()
  // No agentId, null main budget -> stop regardless of subagentBudget arg
  const d = checkTokenBudget(tracker, undefined, null, 1000, 10000)
  assert.equal(d.action, 'stop')
  assert.equal((d as { completionEvent: unknown }).completionEvent, null)
})

test('main agent with a real budget still works (regression)', () => {
  const tracker = createBudgetTracker()
  const d = checkTokenBudget(tracker, undefined, 10000, 1000)
  assert.equal(d.action, 'continue')
})
