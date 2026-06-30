import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  resolveEffectiveMaxTurns,
  DEFAULT_MAX_TURNS,
} from '../query/boundedAutonomy.js'

// Bundled with BOUNDED_AUTONOMY on.
test('defaults undefined maxTurns to DEFAULT_MAX_TURNS when flag on', () => {
  assert.equal(resolveEffectiveMaxTurns(undefined), DEFAULT_MAX_TURNS)
})

test('preserves an explicit maxTurns', () => {
  assert.equal(resolveEffectiveMaxTurns(5), 5)
})

test('DEFAULT_MAX_TURNS is a finite positive cap', () => {
  assert.ok(DEFAULT_MAX_TURNS > 0 && Number.isFinite(DEFAULT_MAX_TURNS))
})
