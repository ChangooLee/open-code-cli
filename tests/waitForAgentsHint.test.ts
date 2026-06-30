import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildWaitForAgentsHint,
  insertWaitForAgentsHint,
} from '../coordinator/waitForAgentsHint.js'

test('buildWaitForAgentsHint returns empty string when join tool disabled', () => {
  assert.equal(buildWaitForAgentsHint(false, 'WaitForAgents', 'Agent'), '')
})

test('buildWaitForAgentsHint references the join tool, agent tool, and join semantics', () => {
  const hint = buildWaitForAgentsHint(true, 'WaitForAgents', 'Agent')
  assert.ok(hint.includes('WaitForAgents'), 'mentions the join tool name')
  assert.ok(hint.includes('Agent'), 'mentions the spawn tool name')
  assert.ok(hint.includes('agent_ids'), 'references the join input field')
  assert.ok(
    /terminal/.test(hint),
    'describes blocking until workers are terminal',
  )
  // Must NOT discourage normal async parallelism.
  assert.ok(
    /concurrently/.test(hint),
    'preserves the concurrent-launch guidance',
  )
})

test('buildWaitForAgentsHint uses the provided tool names verbatim', () => {
  const hint = buildWaitForAgentsHint(true, 'JoinTool', 'SpawnTool')
  assert.ok(hint.includes('JoinTool'))
  assert.ok(hint.includes('SpawnTool'))
  assert.ok(!hint.includes('WaitForAgents'))
})

test('insertWaitForAgentsHint is a no-op for an empty hint', () => {
  const prompt = '## 4. Task Workflow\nbody\n## 5. Next\nmore'
  assert.equal(insertWaitForAgentsHint(prompt, '', '## 4. Task Workflow'), prompt)
})

test('insertWaitForAgentsHint inserts before the NEXT heading after the anchor', () => {
  const prompt = '## 4. Task Workflow\nbody\n## 5. Next\nmore'
  const out = insertWaitForAgentsHint(prompt, 'HINTLINE', '## 4. Task Workflow')
  // Hint lands inside section 4, before section 5.
  assert.ok(out.includes('body\nHINTLINE\n## 5. Next'))
  // Section 5 content is preserved and follows the hint.
  assert.ok(out.indexOf('HINTLINE') < out.indexOf('## 5. Next'))
  assert.ok(out.indexOf('## 4. Task Workflow') < out.indexOf('HINTLINE'))
})

test('insertWaitForAgentsHint appends to the end when anchor is missing', () => {
  const prompt = '## 1. Only\nbody'
  const out = insertWaitForAgentsHint(prompt, 'HINTLINE', '## 4. Task Workflow')
  assert.ok(out.endsWith('HINTLINE'))
  assert.ok(out.startsWith(prompt))
})

test('insertWaitForAgentsHint appends to the end when anchor is the last heading', () => {
  const prompt = '## 3. Mid\nbody\n## 4. Task Workflow\ntrailing'
  const out = insertWaitForAgentsHint(prompt, 'HINTLINE', '## 4. Task Workflow')
  assert.ok(out.endsWith('HINTLINE'))
  // Original content fully preserved.
  assert.ok(out.includes('## 4. Task Workflow\ntrailing'))
})

test('end-to-end: full hint injected into a coordinator-shaped prompt keeps both sections intact', () => {
  const prompt =
    '## 4. Task Workflow\nParallelism is your superpower.\n## 5. Writing Worker Prompts\nWorkers can not see your conversation.'
  const hint = buildWaitForAgentsHint(true, 'WaitForAgents', 'Agent')
  const out = insertWaitForAgentsHint(prompt, hint, '## 4. Task Workflow')
  assert.ok(out.includes('Parallelism is your superpower.'))
  assert.ok(out.includes('Workers can not see your conversation.'))
  assert.ok(
    out.indexOf('WaitForAgents') < out.indexOf('## 5. Writing Worker Prompts'),
  )
  assert.ok(
    out.indexOf('## 4. Task Workflow') < out.indexOf('WaitForAgents'),
  )
})
