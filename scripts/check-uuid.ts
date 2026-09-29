// Self-check for the uuid() fallback used where crypto.randomUUID is unavailable. Run: npm run check
import assert from 'node:assert/strict'
import { uuid } from '../src/lib/browser.ts'

const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const noRandomUUID = { getRandomValues: crypto.getRandomValues.bind(crypto) }

const ids = new Set(Array.from({ length: 1000 }, () => uuid(noRandomUUID)))
assert.equal(ids.size, 1000)
for (const id of ids) assert.match(id, V4)

// All-ones and all-zeros bytes still get the version and variant bits right.
assert.equal(uuid({ getRandomValues: <T extends ArrayBufferView | null>(a: T) => (a as Uint8Array).fill(255) as T }), 'ffffffff-ffff-4fff-bfff-ffffffffffff')
assert.equal(uuid({ getRandomValues: <T extends ArrayBufferView | null>(a: T) => (a as Uint8Array).fill(0) as T }), '00000000-0000-4000-8000-000000000000')

console.log('uuid ok')
