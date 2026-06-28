import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  safeReactiveCall,
  safeReactiveCallAsync,
} from '../services/compact/reactiveCompactSafe.js'

// safeReactiveCall: returns the value when fn succeeds (transparent pass-through).
test('safeReactiveCall: returns fn() value on success', () => {
  assert.equal(
    safeReactiveCall(() => true, false),
    true,
  )
  assert.equal(
    safeReactiveCall(() => 42, -1),
    42,
  )
  assert.equal(
    safeReactiveCall(() => 'ok', 'fallback'),
    'ok',
  )
})

// safeReactiveCall: a throwing fn (e.g. the 'not implemented' stub) returns the
// fallback instead of propagating, so enabling a stub flag cannot crash callers.
test('safeReactiveCall: throwing fn returns fallback', () => {
  const result = safeReactiveCall(() => {
    throw new Error('not implemented')
  }, false)
  assert.equal(result, false)
})

test('safeReactiveCall: fallback is the exact value provided', () => {
  const sentinel = { kind: 'fallback' as const }
  const result = safeReactiveCall<typeof sentinel | null>(() => {
    throw new Error('boom')
  }, sentinel)
  assert.equal(result, sentinel)
})

// safeReactiveCall: onError is invoked with the thrown error exactly once.
test('safeReactiveCall: onError receives the error once on throw', () => {
  const errs: unknown[] = []
  const err = new Error('stub failed')
  const result = safeReactiveCall(
    () => {
      throw err
    },
    'fb',
    e => errs.push(e),
  )
  assert.equal(result, 'fb')
  assert.equal(errs.length, 1)
  assert.equal(errs[0], err)
})

// safeReactiveCall: onError is NOT invoked on success.
test('safeReactiveCall: onError not called on success', () => {
  let called = 0
  const result = safeReactiveCall(
    () => 7,
    0,
    () => {
      called++
    },
  )
  assert.equal(result, 7)
  assert.equal(called, 0)
})

// safeReactiveCall: a falsy successful value is passed through, not replaced by fallback.
test('safeReactiveCall: falsy success value passes through (not fallback)', () => {
  assert.equal(
    safeReactiveCall(() => false, true),
    false,
  )
  assert.equal(
    safeReactiveCall(() => 0, 99),
    0,
  )
  assert.equal(
    safeReactiveCall<null | string>(() => null, 'x'),
    null,
  )
})

// safeReactiveCallAsync: resolves to fn() value on success.
test('safeReactiveCallAsync: returns resolved value on success', async () => {
  const result = await safeReactiveCallAsync(async () => ({ ok: 1 }), null)
  assert.deepEqual(result, { ok: 1 })
})

// safeReactiveCallAsync: a rejected promise (or sync throw) returns the fallback.
test('safeReactiveCallAsync: rejection returns fallback', async () => {
  const result = await safeReactiveCallAsync<null | number>(async () => {
    throw new Error('not implemented')
  }, null)
  assert.equal(result, null)
})

test('safeReactiveCallAsync: synchronous throw inside fn returns fallback', async () => {
  const result = await safeReactiveCallAsync<null | number>(() => {
    throw new Error('sync throw')
  }, null)
  assert.equal(result, null)
})

// safeReactiveCallAsync: onError receives the error once on rejection.
test('safeReactiveCallAsync: onError receives error once on rejection', async () => {
  const errs: unknown[] = []
  const err = new Error('async stub failed')
  const result = await safeReactiveCallAsync<null | string>(
    async () => {
      throw err
    },
    null,
    e => errs.push(e),
  )
  assert.equal(result, null)
  assert.equal(errs.length, 1)
  assert.equal(errs[0], err)
})

test('safeReactiveCallAsync: onError not called on success', async () => {
  let called = 0
  const result = await safeReactiveCallAsync(
    async () => 'value',
    'fb',
    () => {
      called++
    },
  )
  assert.equal(result, 'value')
  assert.equal(called, 0)
})
