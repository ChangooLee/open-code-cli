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

// Bundled with AGENT_LOOP_DETECTION_OSCILLATION on: A,B,A,B,... alternation
// (a period-2 cycle) that never forms a 5-identical run is now detected.
test('stops on a sustained A,B,A,B oscillation (period-2 cycle)', () => {
  const msgs: any[] = []
  for (let i = 0; i < 10; i++) {
    msgs.push(toolMsg('Glob', { pattern: i % 2 === 0 ? '*.md' : '*.ts' }))
  }
  const r = detectNoProgress(msgs)
  assert.equal(r.stop, true)
  // Same tool name on both legs collapses to a single name.
  assert.equal(r.toolName, 'Glob')
})

test('oscillation reports both tool names when they differ', () => {
  const msgs: any[] = []
  for (let i = 0; i < 8; i++) {
    msgs.push(
      i % 2 === 0
        ? toolMsg('Read', { file_path: 'a' })
        : toolMsg('Bash', { command: 'ls' }),
    )
  }
  const r = detectNoProgress(msgs)
  assert.equal(r.stop, true)
  // The two legs are the last-two signatures: ...Read, Bash -> "Read,Bash".
  assert.equal(r.toolName, 'Read,Bash')
})

test('does not flag oscillation below the cycle threshold', () => {
  // Only 2 full A,B cycles (A,B,A,B) — below the 3-cycle threshold.
  const msgs = [
    toolMsg('Glob', { pattern: '*.md' }),
    toolMsg('Glob', { pattern: '*.ts' }),
    toolMsg('Glob', { pattern: '*.md' }),
    toolMsg('Glob', { pattern: '*.ts' }),
  ]
  assert.equal(detectNoProgress(msgs).stop, false)
})

test('does not flag genuine varied progress as oscillation', () => {
  const msgs = [
    toolMsg('Read', { file_path: 'a' }),
    toolMsg('Edit', { file_path: 'a' }),
    toolMsg('Read', { file_path: 'b' }),
    toolMsg('Bash', { command: 'npm test' }),
    toolMsg('Read', { file_path: 'c' }),
    toolMsg('Edit', { file_path: 'c' }),
    toolMsg('Bash', { command: 'npm run build' }),
  ]
  assert.equal(detectNoProgress(msgs).stop, false)
})

test('oscillation only considers the trailing window, not stale history', () => {
  // A long stretch of real progress, then a fresh oscillation at the tail.
  const msgs: any[] = [
    toolMsg('Read', { file_path: 'x' }),
    toolMsg('Edit', { file_path: 'x' }),
    toolMsg('Bash', { command: 'npm test' }),
  ]
  for (let i = 0; i < 8; i++) {
    msgs.push(toolMsg('Glob', { pattern: i % 2 === 0 ? '*.md' : '*.ts' }))
  }
  const r = detectNoProgress(msgs)
  assert.equal(r.stop, true)
  assert.equal(r.toolName, 'Glob')
})

test('an identical run still takes precedence over oscillation', () => {
  const msgs = Array.from({ length: 6 }, () =>
    toolMsg('Glob', { pattern: '*.md' }),
  )
  const r = detectNoProgress(msgs)
  assert.equal(r.stop, true)
  assert.equal(r.toolName, 'Glob')
  assert.equal(r.count, 6)
})
