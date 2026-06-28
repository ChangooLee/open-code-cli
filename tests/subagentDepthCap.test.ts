import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_MAX_SUBAGENT_DEPTH,
  resolveMaxSubagentDepth,
  checkSubagentDepth,
  formatDepthCapError,
} from '../utils/subagentDepthCap.js'

// resolveMaxSubagentDepth: env parsing with a safe default.
test('resolveMaxSubagentDepth: undefined/empty/invalid -> default', () => {
  assert.equal(resolveMaxSubagentDepth(undefined), DEFAULT_MAX_SUBAGENT_DEPTH)
  assert.equal(resolveMaxSubagentDepth(''), DEFAULT_MAX_SUBAGENT_DEPTH)
  assert.equal(resolveMaxSubagentDepth('   '), DEFAULT_MAX_SUBAGENT_DEPTH)
  assert.equal(resolveMaxSubagentDepth('abc'), DEFAULT_MAX_SUBAGENT_DEPTH)
  assert.equal(resolveMaxSubagentDepth('NaN'), DEFAULT_MAX_SUBAGENT_DEPTH)
  assert.equal(resolveMaxSubagentDepth('Infinity'), DEFAULT_MAX_SUBAGENT_DEPTH)
  assert.equal(resolveMaxSubagentDepth('-1'), DEFAULT_MAX_SUBAGENT_DEPTH)
})

test('resolveMaxSubagentDepth: valid values parse (floored), 0 allowed', () => {
  assert.equal(resolveMaxSubagentDepth('0'), 0)
  assert.equal(resolveMaxSubagentDepth('1'), 1)
  assert.equal(resolveMaxSubagentDepth(' 5 '), 5)
  assert.equal(resolveMaxSubagentDepth('2.9'), 2)
})

// checkSubagentDepth: blocks once current depth reaches the max.
test('checkSubagentDepth: below max is allowed', () => {
  assert.deepEqual(checkSubagentDepth(0, 3), { blocked: false })
  assert.deepEqual(checkSubagentDepth(2, 3), { blocked: false })
})

test('checkSubagentDepth: at or above max is blocked with detail', () => {
  assert.deepEqual(checkSubagentDepth(3, 3), {
    blocked: true,
    currentDepth: 3,
    maxDepth: 3,
  })
  assert.deepEqual(checkSubagentDepth(5, 3), {
    blocked: true,
    currentDepth: 5,
    maxDepth: 3,
  })
})

test('checkSubagentDepth: undefined/non-finite current depth treated as 0', () => {
  assert.deepEqual(checkSubagentDepth(undefined, 3), { blocked: false })
  assert.deepEqual(checkSubagentDepth(NaN, 3), { blocked: false })
  // with maxDepth 0, even a depth-0 (top-level) spawn is blocked
  assert.deepEqual(checkSubagentDepth(undefined, 0), {
    blocked: true,
    currentDepth: 0,
    maxDepth: 0,
  })
})

test('checkSubagentDepth: non-finite/negative maxDepth disables the cap', () => {
  assert.deepEqual(checkSubagentDepth(100, Infinity), { blocked: false })
  assert.deepEqual(checkSubagentDepth(100, -1), { blocked: false })
})

test('formatDepthCapError: mentions both numbers and refuses to spawn', () => {
  const msg = formatDepthCapError(4, 3)
  assert.match(msg, /depth 4/)
  assert.match(msg, /max 3/)
  assert.match(msg, /Refusing to spawn/)
})
