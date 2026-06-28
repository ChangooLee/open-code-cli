import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeInput } from '../query/loopNormalize.js'
import { detectNoProgress } from '../query/loopDetection.js'

function toolMsg(name: string, input: unknown) {
  return { message: { content: [{ type: 'tool_use', name, input }] } }
}

// --- Pure normalizeInput behavior ---

test('drops a volatile timestamp so two calls collapse to one signature', () => {
  const a = normalizeInput({ command: 'ls', timestamp: 111 })
  const b = normalizeInput({ command: 'ls', timestamp: 222 })
  assert.equal(a, b)
})

test('drops a range of well-known volatile keys', () => {
  const a = normalizeInput({
    q: 'x',
    requestId: 'r1',
    trace_id: 't1',
    nonce: 'n1',
    attempt: 1,
  })
  const b = normalizeInput({
    q: 'x',
    requestId: 'r2',
    trace_id: 't2',
    nonce: 'n2',
    attempt: 9,
  })
  assert.equal(a, b)
  // The non-volatile field survives.
  assert.ok(a.includes('"q":"x"'))
})

test('volatile-key matching is case-insensitive', () => {
  const a = normalizeInput({ keep: 1, TimeStamp: 1, RequestID: 'a' })
  const b = normalizeInput({ keep: 1, TimeStamp: 2, RequestID: 'b' })
  assert.equal(a, b)
})

test('strips volatile keys recursively inside nested objects and arrays', () => {
  const a = normalizeInput({
    outer: { inner: { value: 5, ts: 1 } },
    items: [{ id: 'keep', nonce: 'a' }],
  })
  const b = normalizeInput({
    outer: { inner: { value: 5, ts: 99 } },
    items: [{ id: 'keep', nonce: 'z' }],
  })
  assert.equal(a, b)
  assert.ok(a.includes('"value":5'))
  assert.ok(a.includes('"id":"keep"'))
})

test('does NOT collapse calls that differ in a non-volatile field', () => {
  const a = normalizeInput({ command: 'ls', ts: 1 })
  const b = normalizeInput({ command: 'pwd', ts: 1 })
  assert.notEqual(a, b)
})

test('key ordering does not affect the normalized signature', () => {
  const a = normalizeInput({ a: 1, b: 2, c: 3 })
  const b = normalizeInput({ c: 3, b: 2, a: 1 })
  assert.equal(a, b)
})

test('non-object inputs pass through deterministically', () => {
  assert.equal(normalizeInput('hello'), '"hello"')
  assert.equal(normalizeInput(42), '42')
  assert.equal(normalizeInput(null), 'null')
})

test('a cyclic input does not hang and still normalizes', () => {
  const obj: any = { command: 'ls' }
  obj.self = obj
  // Should not throw / hang; produces some stable string.
  const sig = normalizeInput(obj)
  assert.equal(typeof sig, 'string')
  assert.ok(sig.includes('"command":"ls"'))
})

// --- Integration through detectNoProgress (AGENT_LOOP_DETECTION_NORMALIZE on) ---

test('identical-run check now fires when only a volatile field varies', () => {
  // Five "same" Bash calls that previously looked distinct because of a fresh
  // timestamp each time — now collapse and trip the identical-run threshold.
  const msgs = Array.from({ length: 5 }, (_, i) =>
    toolMsg('Bash', { command: 'npm test', timestamp: Date.now() + i }),
  )
  const r = detectNoProgress(msgs)
  assert.equal(r.stop, true)
  assert.equal(r.toolName, 'Bash')
  assert.equal(r.count, 5)
})

test('volatile-only variation does not over-fire on genuinely different calls', () => {
  // Different non-volatile commands -> no identical run despite shared volatile.
  const msgs = [
    toolMsg('Bash', { command: 'a', ts: 1 }),
    toolMsg('Bash', { command: 'b', ts: 2 }),
    toolMsg('Bash', { command: 'c', ts: 3 }),
    toolMsg('Bash', { command: 'd', ts: 4 }),
    toolMsg('Bash', { command: 'e', ts: 5 }),
  ]
  assert.equal(detectNoProgress(msgs).stop, false)
})
