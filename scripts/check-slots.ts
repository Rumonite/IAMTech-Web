// Self-check for slotsFor(). Run: npm run check
import assert from 'node:assert/strict'
import { slotsFor } from '../src/lib/business.ts'

const past = new Date(2000, 0, 1)
const hours = (day: string, now = past) => slotsFor(day, now).map((s) => s.getHours())

assert.deepEqual(hours('2026-10-04'), []) // Sunday: closed
assert.deepEqual(hours('2026-10-05'), [10, 11, 12, 13, 14, 15, 16, 17]) // Monday 10–18
assert.deepEqual(hours('2026-10-10'), [10, 11, 12, 13, 14, 15]) // Saturday 10–16
assert.deepEqual(hours('2026-10-05', new Date(2026, 9, 5, 13, 30)), [14, 15, 16, 17]) // earlier slots today dropped
console.log('slots ok')
