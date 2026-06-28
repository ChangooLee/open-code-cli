import { test } from 'node:test'
import assert from 'node:assert/strict'
import { detectNoProgress } from '../query/loopDetection.js'

function toolMsg(name: string, input: unknown) {
  return { message: { content: [{ type: 'tool_use', name, input }] } }
}

// Bundled with AGENT_LOOP_DETECTION on.
test('stops after 5 identical consecutive tool calls', () => {
  const msgs = Array.from({ length: 5 }, () =>
    toolMsg('Glob', { pattern: '*.md' }),
  )
  const r = detectNoProgress(msgs)
  assert.equal(r.stop, true)
  assert.equal(r.count, 5)
  assert.equal(r.toolName, 'Glob')
})

test('does not stop at 4 identical calls', () => {
  const msgs = Array.from({ length: 4 }, () =>
    toolMsg('Glob', { pattern: '*.md' }),
  )
  assert.equal(detectNoProgress(msgs).stop, false)
})

test('does not stop when the trailing run is broken by a different call', () => {
  const msgs = [
    ...Array.from({ length: 4 }, () => toolMsg('Glob', { pattern: '*.md' })),
    toolMsg('Read', { file_path: 'x' }),
  ]
  assert.equal(detectNoProgress(msgs).stop, false)
})

// Documents a known limitation surfaced by the adversarial audit: oscillation
// (A,B,A,B,...) never forms a 5-identical run and is NOT detected.
test('KNOWN LIMITATION: oscillating two calls is not detected', () => {
  const msgs: any[] = []
  for (let i = 0; i < 10; i++) {
    msgs.push(toolMsg('Glob', { pattern: i % 2 === 0 ? '*.md' : '*.ts' }))
  }
  assert.equal(detectNoProgress(msgs).stop, false)
})
