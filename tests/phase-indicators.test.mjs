// PhaseIndicatorsSystem's setTokenIndicator/removeTokenIndicator try to sync a
// flag onto the live canvas token (`canvas.tokens.get(tokenId)`), which only
// exists inside a running Foundry client. Stub a minimal `canvas` global so
// the bookkeeping half of this class (what this test suite covers) can run
// outside Foundry; the token-flag sync itself needs a live client to verify.
globalThis.canvas = { tokens: { get: () => null } };

import assert from 'node:assert/strict';
import test from 'node:test';
import { PhaseIndicatorsSystem } from '../scripts/phase-indicators.js';

test('setTokenIndicator: stores phase data for a valid phase', () => {
  const system = new PhaseIndicatorsSystem();
  assert.equal(system.setTokenIndicator('token-1', 5), true);

  const indicator = system.getTokenIndicator('token-1');
  assert.equal(indicator.tokenId, 'token-1');
  assert.equal(indicator.phase, 5);
  assert.equal(indicator.phaseData.name, 'Phase 5');
  assert.ok(Number.isFinite(indicator.updatedAt));
});

test('setTokenIndicator: rejects a phase outside 1-10', () => {
  const system = new PhaseIndicatorsSystem();
  assert.equal(system.setTokenIndicator('token-1', 0), false);
  assert.equal(system.setTokenIndicator('token-1', 11), false);
  assert.equal(system.getTokenIndicator('token-1'), null);
});

test('getTokenIndicator: unknown token returns null', () => {
  const system = new PhaseIndicatorsSystem();
  assert.equal(system.getTokenIndicator('does-not-exist'), null);
});

test('removeTokenIndicator: clears a stored indicator', () => {
  const system = new PhaseIndicatorsSystem();
  system.setTokenIndicator('token-1', 3);
  system.removeTokenIndicator('token-1');
  assert.equal(system.getTokenIndicator('token-1'), null);
});

test('getAllIndicators: returns every stored indicator keyed by token id', () => {
  const system = new PhaseIndicatorsSystem();
  system.setTokenIndicator('token-1', 2);
  system.setTokenIndicator('token-2', 7);

  const all = system.getAllIndicators();
  assert.equal(Object.keys(all).length, 2);
  assert.equal(all['token-1'].phase, 2);
  assert.equal(all['token-2'].phase, 7);
});

test('getStatistics: counts tokens with an active indicator', () => {
  const system = new PhaseIndicatorsSystem();
  system.setTokenIndicator('token-1', 2);
  system.setTokenIndicator('token-2', 7);
  system.removeTokenIndicator('token-1');

  assert.equal(system.getStatistics().tokensWithIndicators, 1);
});
