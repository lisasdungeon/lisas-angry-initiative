// PhaseIndicatorsSystem's setTokenIndicator/removeTokenIndicator try to sync a
// flag onto the live canvas token (`canvas.tokens.get(tokenId)`). Stub canvas
// so both the bookkeeping half and the token-flag write/clear paths run here.
const tokenFlags = new Map();
const liveTokens = new Map();

function makeTokenDoc(id) {
  return {
    setFlag(module, key, value) {
      tokenFlags.set(`${id}:${module}.${key}`, value);
      return Promise.resolve(value);
    },
    unsetFlag(module, key) {
      tokenFlags.delete(`${id}:${module}.${key}`);
      return Promise.resolve();
    }
  };
}

globalThis.canvas = {
  tokens: {
    get(tokenId) {
      return liveTokens.get(tokenId) ?? null;
    }
  }
};

import assert from 'node:assert/strict';
import test from 'node:test';
import { MODULE_ID } from '../scripts/constants.js';
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

test('_updateTokenVisuals: writes phase flag when canvas token exists', () => {
  liveTokens.set('live-1', { document: makeTokenDoc('live-1') });
  const system = new PhaseIndicatorsSystem();
  system.setTokenIndicator('live-1', 4);
  assert.equal(tokenFlags.get(`live-1:${MODULE_ID}.phase`), 4);
  liveTokens.delete('live-1');
});

test('_updateTokenVisuals: no-ops when token has no document', () => {
  liveTokens.set('nodoc', {});
  const system = new PhaseIndicatorsSystem();
  assert.doesNotThrow(() => system.setTokenIndicator('nodoc', 3));
  liveTokens.delete('nodoc');
});

test('_clearTokenVisuals: unsets phase flag when canvas token exists', () => {
  liveTokens.set('live-2', { document: makeTokenDoc('live-2') });
  const system = new PhaseIndicatorsSystem();
  system.setTokenIndicator('live-2', 2);
  system.removeTokenIndicator('live-2');
  assert.equal(tokenFlags.has(`live-2:${MODULE_ID}.phase`), false);
  liveTokens.delete('live-2');
});

test('_clearTokenVisuals: no-ops when canvas token is missing', () => {
  const system = new PhaseIndicatorsSystem();
  assert.doesNotThrow(() => system.removeTokenIndicator('ghost'));
});

test('createPhaseDisplayUI: returns combat tracker markup', () => {
  const system = new PhaseIndicatorsSystem();
  const html = system.createPhaseDisplayUI();
  assert.match(html, /ld-angry-init-combat-tracker/);
  assert.match(html, /ld-combatants-list/);
  assert.match(html, /Lisa's Angry Initiative/);
});
