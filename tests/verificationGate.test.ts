import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  evaluateVerificationGate,
  buildVerificationDirective,
} from '../query/verificationGate.js'

const edits = (n: number) => ({
  message: {
    content: Array.from({ length: n }, () => ({
      type: 'tool_use',
      name: 'Edit',
      input: {},
    })),
  },
})
const toolResult = (text: string) => ({
  message: { content: [{ type: 'tool_result', content: text }] },
})
const directive = () => ({ message: { content: buildVerificationDirective(3) } })

// Bundled with VERIFY_IMPLEMENTATION_BEFORE_COMPLETION on.
test('blocks completion after 3+ edits with no verification verdict', () => {
  const r = evaluateVerificationGate([edits(3)])
  assert.equal(r.blockCompletion, true)
  assert.equal(r.editCount, 3)
})

test('does not block trivial work (<3 edits)', () => {
  assert.equal(evaluateVerificationGate([edits(2)]).blockCompletion, false)
})

test('does not block once a VERDICT: PASS verdict is present', () => {
  const r = evaluateVerificationGate([edits(3), toolResult('VERDICT: PASS')])
  assert.equal(r.blockCompletion, false)
})

// Documents the bounded give-up surfaced by the audit: after MAX_VERIFY_DIRECTIVES
// directives the gate stops blocking (graceful degradation, not hard enforcement).
test('KNOWN LIMITATION: gives up blocking after 3 directives', () => {
  const r = evaluateVerificationGate([
    edits(3),
    directive(),
    directive(),
    directive(),
  ])
  assert.equal(r.blockCompletion, false)
})
