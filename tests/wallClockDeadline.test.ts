import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  resolveDeadlineMs,
  checkDeadline,
} from '../query/wallClockDeadline.js'

// resolveDeadlineMs: parses the env-sourced wall-clock deadline (ms).
test('resolveDeadlineMs: undefined/empty/invalid -> null', () => {
  assert.equal(resolveDeadlineMs(undefined), null)
  assert.equal(resolveDeadlineMs(''), null)
  assert.equal(resolveDeadlineMs('   '), null)
  assert.equal(resolveDeadlineMs('abc'), null)
  assert.equal(resolveDeadlineMs('0'), null)
  assert.equal(resolveDeadlineMs('-5000'), null)
  assert.equal(resolveDeadlineMs('NaN'), null)
  assert.equal(resolveDeadlineMs('Infinity'), null)
})

test('resolveDeadlineMs: positive numbers parse (floored)', () => {
  assert.equal(resolveDeadlineMs('1000'), 1000)
  assert.equal(resolveDeadlineMs(' 300000 '), 300000)
  assert.equal(resolveDeadlineMs('1500.9'), 1500)
})

// checkDeadline: null/non-positive deadline never expires (default behavior).
test('checkDeadline: null deadline never expires', () => {
  const d = checkDeadline(1000, null, 999999999)
  assert.equal(d.expired, false)
})

test('checkDeadline: non-positive deadline never expires', () => {
  assert.equal(checkDeadline(0, 0, 100000).expired, false)
  assert.equal(checkDeadline(0, -1, 100000).expired, false)
})

// Within the window: not expired.
test('checkDeadline: elapsed below deadline -> not expired', () => {
  const d = checkDeadline(1000, 5000, 1000 + 4999)
  assert.equal(d.expired, false)
})

// At/over the window: expired, reports elapsed + deadline.
test('checkDeadline: elapsed at deadline -> expired', () => {
  const d = checkDeadline(1000, 5000, 1000 + 5000)
  assert.equal(d.expired, true)
  if (d.expired) {
    assert.equal(d.elapsedMs, 5000)
    assert.equal(d.deadlineMs, 5000)
  }
})

test('checkDeadline: elapsed over deadline -> expired with true elapsed', () => {
  const d = checkDeadline(1000, 5000, 1000 + 8200)
  assert.equal(d.expired, true)
  if (d.expired) {
    assert.equal(d.elapsedMs, 8200)
    assert.equal(d.deadlineMs, 5000)
  }
})

// Clock skew / now earlier than start: negative elapsed never expires.
test('checkDeadline: now before start (clock skew) -> not expired', () => {
  const d = checkDeadline(10000, 5000, 9000)
  assert.equal(d.expired, false)
})
