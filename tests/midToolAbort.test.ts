import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  checkMidToolAbort,
  formatMidToolAbortError,
} from '../utils/midToolAbort.js'

// checkMidToolAbort: a non-aborted signal does not trip.
test('checkMidToolAbort: non-aborted signal -> not aborted', () => {
  assert.deepEqual(checkMidToolAbort({ aborted: false }), {
    aborted: false,
    reason: null,
  })
})

// checkMidToolAbort: an aborted signal trips with reason 'signal'.
test('checkMidToolAbort: aborted signal -> aborted', () => {
  assert.deepEqual(checkMidToolAbort({ aborted: true }), {
    aborted: true,
    reason: 'signal',
  })
})

// checkMidToolAbort: null/undefined signal is treated as not aborted (safe default).
test('checkMidToolAbort: missing signal -> not aborted', () => {
  assert.deepEqual(checkMidToolAbort(null), { aborted: false, reason: null })
  assert.deepEqual(checkMidToolAbort(undefined), {
    aborted: false,
    reason: null,
  })
})

// checkMidToolAbort: works with a real AbortController signal (interface compatibility).
test('checkMidToolAbort: integrates with a real AbortController', () => {
  const ac = new AbortController()
  assert.equal(checkMidToolAbort(ac.signal).aborted, false)
  ac.abort()
  assert.equal(checkMidToolAbort(ac.signal).aborted, true)
  assert.equal(checkMidToolAbort(ac.signal).reason, 'signal')
})

// checkMidToolAbort: a non-boolean aborted value is not treated as aborted.
test('checkMidToolAbort: non-true aborted value does not trip', () => {
  // Only a strict boolean true should trip the checkpoint.
  assert.equal(
    checkMidToolAbort({ aborted: 1 as unknown as boolean }).aborted,
    false,
  )
  assert.equal(
    checkMidToolAbort({ aborted: 'yes' as unknown as boolean }).aborted,
    false,
  )
})

// formatMidToolAbortError: includes the supplied context.
test('formatMidToolAbortError: embeds context', () => {
  const msg = formatMidToolAbortError('MCP server wait')
  assert.match(msg, /Aborted by parent/)
  assert.match(msg, /MCP server wait/)
})

// formatMidToolAbortError: blank/whitespace context falls back to a generic word.
test('formatMidToolAbortError: blank context falls back', () => {
  assert.equal(
    formatMidToolAbortError(''),
    'Aborted by parent during operation.',
  )
  assert.equal(
    formatMidToolAbortError('   '),
    'Aborted by parent during operation.',
  )
})
