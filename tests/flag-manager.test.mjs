import assert from 'node:assert/strict';
import test, { beforeEach } from 'node:test';
import { clearAllFlags, getFlag, setFlag, setPhase } from '../scripts/flag-manager.js';
import { FLAGS, MODULE_ID } from '../scripts/constants.js';
import { integrationHooksSystem } from '../scripts/integration-hooks.js';
import { phaseIndicatorsSystem } from '../scripts/phase-indicators.js';
import { installGlobals, makeCombatant } from './foundry-mock.mjs';

const { game } = installGlobals();

beforeEach(() => {
  phaseIndicatorsSystem.tokenIndicators.clear();
  for (const id of integrationHooksSystem.getAllHooks
    ? Object.keys(integrationHooksSystem.getAllHooks())
    : []) {
    // no-op; fireHook is safe with empty handlers
  }
  game.settings.set(MODULE_ID, 'showPhaseVisuals', true);
  game.user = { id: 'gm-1', isGM: true, active: true };
});

test('getFlag: returns null for missing combatant', () => {
  assert.equal(getFlag(null, FLAGS.CURRENT_PHASE), null);
});

test('getFlag: reads combatant flag', async () => {
  const c = makeCombatant();
  await c.setFlag(MODULE_ID, FLAGS.CURRENT_PHASE, 4);
  assert.equal(getFlag(c, FLAGS.CURRENT_PHASE), 4);
});

test('getFlag: returns null and logs when getFlag throws', () => {
  const c = {
    getFlag() {
      throw new Error('boom');
    }
  };
  const errors = [];
  const prev = console.error;
  console.error = (...a) => errors.push(a);
  assert.equal(getFlag(c, FLAGS.CURRENT_PHASE), null);
  assert.ok(errors.length > 0);
  console.error = prev;
});

test('setFlag: no-ops when combatant is missing', async () => {
  assert.equal(await setFlag(null, FLAGS.CURRENT_PHASE, 1), undefined);
});

test('setFlag: writes value and returns result', async () => {
  const c = makeCombatant();
  const result = await setFlag(c, FLAGS.LAST_ACTION, 'attack');
  assert.equal(result, 'attack');
  assert.equal(getFlag(c, FLAGS.LAST_ACTION), 'attack');
});

test('setFlag: phase change fires before/after hooks and sets token indicator for GM', async () => {
  const c = makeCombatant({ tokenId: 'tok-A' });
  const events = [];
  const before = (ctx) => events.push(['before', ctx.phase, ctx.previousPhase]);
  const after = (ctx) => events.push(['after', ctx.phase, ctx.previousPhase]);
  integrationHooksSystem.registerHook('beforePhaseChange', before);
  integrationHooksSystem.registerHook('afterPhaseChange', after);

  await setFlag(c, FLAGS.CURRENT_PHASE, 3);

  assert.deepEqual(events, [
    ['before', 3, null],
    ['after', 3, null]
  ]);
  assert.equal(phaseIndicatorsSystem.getTokenIndicator('tok-A')?.phase, 3);

  integrationHooksSystem.unregisterHook('beforePhaseChange', before);
  integrationHooksSystem.unregisterHook('afterPhaseChange', after);
});

test('setFlag: skips token indicator when phase visuals disabled', async () => {
  game.settings.set(MODULE_ID, 'showPhaseVisuals', false);
  const c = makeCombatant({ tokenId: 'tok-B' });
  await setFlag(c, FLAGS.CURRENT_PHASE, 2);
  assert.equal(phaseIndicatorsSystem.getTokenIndicator('tok-B'), null);
});

test('setFlag: phaseVisualsEnabled returns false when settings.get throws', async () => {
  const prev = game.settings.get;
  game.settings.get = () => {
    throw new Error('no settings');
  };
  const c = makeCombatant({ tokenId: 'tok-C' });
  await setFlag(c, FLAGS.CURRENT_PHASE, 5);
  assert.equal(phaseIndicatorsSystem.getTokenIndicator('tok-C'), null);
  game.settings.get = prev;
});

test('setFlag: mayWrite false when game.user access throws', async () => {
  const prevUser = game.user;
  Object.defineProperty(game, 'user', {
    get() {
      throw new Error('user gone');
    },
    configurable: true
  });
  const c = makeCombatant({ tokenId: 'tok-D' });
  await setFlag(c, FLAGS.CURRENT_PHASE, 6);
  assert.equal(phaseIndicatorsSystem.getTokenIndicator('tok-D'), null);
  Object.defineProperty(game, 'user', { value: prevUser, configurable: true, writable: true });
});

test('setFlag: owner (non-GM) can still write indicator', async () => {
  game.user = { id: 'p1', isGM: false, active: true };
  const c = makeCombatant({ tokenId: 'tok-E', isOwner: true });
  await setFlag(c, FLAGS.CURRENT_PHASE, 4);
  assert.equal(phaseIndicatorsSystem.getTokenIndicator('tok-E')?.phase, 4);
});

test('setFlag: returns undefined and logs when setFlag throws', async () => {
  const c = makeCombatant();
  c.setFlag = async () => {
    throw new Error('write failed');
  };
  const errors = [];
  const prev = console.error;
  console.error = (...a) => errors.push(a);
  assert.equal(await setFlag(c, FLAGS.CURRENT_PHASE, 1), undefined);
  assert.ok(errors.length > 0);
  console.error = prev;
});

test('setFlag: uses tokenId when token object missing', async () => {
  const c = makeCombatant({ token: null, tokenId: 'tok-F' });
  await setFlag(c, FLAGS.CURRENT_PHASE, 7);
  assert.equal(phaseIndicatorsSystem.getTokenIndicator('tok-F')?.phase, 7);
});

test('setPhase: current phase path', async () => {
  const c = makeCombatant();
  await setPhase(c, 8, false);
  assert.equal(getFlag(c, FLAGS.CURRENT_PHASE), 8);
});

test('setPhase: next phase path sets recovering', async () => {
  const c = makeCombatant();
  await setPhase(c, 2, true);
  assert.equal(getFlag(c, FLAGS.NEXT_PHASE), 2);
  assert.equal(getFlag(c, FLAGS.RECOVERING), true);
});

test('clearAllFlags: no-ops without combatant', async () => {
  await clearAllFlags(null);
});

test('clearAllFlags: unsets all flags and removes indicator', async () => {
  const c = makeCombatant({ tokenId: 'tok-G' });
  await setFlag(c, FLAGS.CURRENT_PHASE, 3);
  await setFlag(c, FLAGS.LAST_ACTION, 'attack');
  assert.ok(phaseIndicatorsSystem.getTokenIndicator('tok-G'));

  await clearAllFlags(c);

  assert.equal(getFlag(c, FLAGS.CURRENT_PHASE), undefined);
  assert.equal(phaseIndicatorsSystem.getTokenIndicator('tok-G'), null);
});

test('clearAllFlags: swallows unsetFlag errors', async () => {
  const c = makeCombatant({ tokenId: null, token: null });
  c.unsetFlag = async () => {
    throw new Error('never set');
  };
  await clearAllFlags(c);
});
