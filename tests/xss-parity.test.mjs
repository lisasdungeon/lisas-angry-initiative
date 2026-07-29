// Slice C: cross-module xss-parity test.
// Asserts that this module's per-module escapeHtml copy produces byte-identical
// output to the canonical implementation at ld-spellbook/core/utils/escapeHtml.js.
// Any drift surfaces loudly in CI.
import assert from 'node:assert/strict';
import test from 'node:test';
import { escapeHtml as canonicalEscapeHtml } from '../../ld-spellbook/core/utils/escapeHtml.js';
import { escapeHtml as moduleEscapeHtml } from '../scripts/utils/escapeHtml.js';


const PARITY_INPUTS = [
  '',
  'Tom & Jerry',
  'Tom & Jerry < Friends',
  '"quoted"',
  "don't",
  'back`tick',
  '<script>alert(1)</script>',
  '<img src=x onerror=alert(1)>',
  '&lt;',
  null,
  undefined,
  42,
  -3.14,
  Infinity,
  NaN,
  true,
  false,
  0,
  { toString: () => '<bad>' },
];

test('escapeHtml parity: this module vs canonical', () => {
  for (const input of PARITY_INPUTS) {
    assert.equal(
      moduleEscapeHtml(input),
      canonicalEscapeHtml(input),
      `divergence on input ${JSON.stringify(input)}`
    );
  }
});
