import { test } from 'node:test'
import assert from 'node:assert/strict'
import { repairToolJson } from '../utils/repairToolJson.js'

test('repairs markdown-fenced JSON', () => {
  assert.deepEqual(repairToolJson('```json\n{"pattern":"*.md"}\n```'), {
    pattern: '*.md',
  })
})

test('repairs trailing commas', () => {
  assert.deepEqual(repairToolJson('{"a":1,"b":2,}'), { a: 1, b: 2 })
})

test('extracts the first JSON object from surrounding prose', () => {
  assert.deepEqual(repairToolJson('here you go: {"x":1} done'), { x: 1 })
})

test('returns undefined for unrepairable input', () => {
  assert.equal(repairToolJson('not json at all'), undefined)
})

test('returns undefined for empty input', () => {
  assert.equal(repairToolJson(''), undefined)
})
