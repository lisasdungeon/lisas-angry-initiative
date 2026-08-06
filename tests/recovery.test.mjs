import assert from 'node:assert/strict';
import test, { beforeEach } from 'node:test';
import { promptRecoveryRoll, rollRecovery } from '../scripts/recovery.js';
import { FLAGS, MODULE_ID, SETTINGS } from '../scripts/constants.js';
import { recoveryHistorySystem } from '../scripts/recovery-history.js';
import { installGlobals, makeCombatant, MockRoll } from './foundry-mock.mjs';

const { game } = installGlobals();

const moduleApi = {
  applyAdvancedModifiers(die) {
    return die;
  },
  async rollRecovery(combatant, actionType, options) {
    return rollRecovery(moduleApi, combatant, actionType, options);
  }
};

beforeEach(() => {
  game.settings.set(MODULE_ID, SETTINGS.ENABLE_CORE, true);
  recoveryHistorySystem.clearAllHistory();
  globalThis.Roll = class extends MockRoll {
    constructor(formula) {
      super(formula);
      this.total = 4;
    }
  };
  globalThis.foundry.applications.api.DialogV2.wait = async () => null;
});

test('promptRecoveryRoll: returns null without combatant actor', async () => {
  assert.equal(await promptRecoveryRoll(moduleApi, null, 'attack'), null);
  assert.equal(await promptRecoveryRoll(moduleApi, {}, 'attack'), null);
});

test('promptRecoveryRoll: returns null when dialog is closed', async () => {
  const c = makeCombatant();
  globalThis.foundry.applications.api.DialogV2.wait = async () => null;
  assert.equal(await promptRecoveryRoll(moduleApi, c, 'attack'), null);
});

test('promptRecoveryRoll: rolls with dialog result fields', async () => {
  const c = makeCombatant({
    actor: {
      id: 'a1',
      items: [{ type: 'weapon', system: { equipped: true, damage: { parts: [['1d8', 'slashing']] } } }],
      statuses: []
    }
  });
  // Invoke real DialogV2 button callback + close paths so nested funcs are covered
  globalThis.foundry.applications.api.DialogV2.wait = async (opts) => {
    const fromCallback = opts.buttons[0].callback(null, {
      form: { _object: {
        actionType: 'cantrip',
        isCheckedAttack: true,
        hasBonusAction: false,
        applyConditions: false
      } }
    });
    assert.equal(fromCallback.actionType, 'cantrip');
    assert.equal(opts.close(), null);
    return fromCallback;
  };
  const result = await promptRecoveryRoll(moduleApi, c, 'attack', {});
  assert.equal(result, 4);
  assert.equal(c.getFlag(MODULE_ID, FLAGS.NEXT_PHASE), 4);
  assert.equal(c.getFlag(MODULE_ID, FLAGS.RECOVERING), true);
});

test('promptRecoveryRoll: uses lastAction when dialog omits actionType', async () => {
  const c = makeCombatant({
    actor: { id: 'a1', items: [], statuses: [] }
  });
  globalThis.foundry.applications.api.DialogV2.wait = async () => ({});
  const result = await promptRecoveryRoll(moduleApi, c, 'spell', { baseDamageDie: 'd8' });
  assert.equal(result, 4);
});

test('rollRecovery: returns null when core disabled or combatant missing', async () => {
  assert.equal(await rollRecovery(moduleApi, null, 'attack'), null);
  game.settings.set(MODULE_ID, SETTINGS.ENABLE_CORE, false);
  assert.equal(await rollRecovery(moduleApi, makeCombatant(), 'attack'), null);
  game.settings.set(MODULE_ID, SETTINGS.ENABLE_CORE, true);
});

test('rollRecovery: attack uses weapon die and records history', async () => {
  const c = makeCombatant({
    id: 'hist-1',
    actor: {
      id: 'a1',
      items: [{ type: 'weapon', system: { equipped: true, damage: { parts: [['1d10', 'slashing']] } } }],
      statuses: ['blessed']
    }
  });
  const result = await rollRecovery(moduleApi, c, 'attack', {});
  assert.equal(result, 4);
  const hist = recoveryHistorySystem.getHistory('hist-1');
  assert.equal(hist.length, 1);
  assert.equal(hist[0].actionType, 'attack');
  assert.equal(hist[0].nextPhase, 4);
});

test('rollRecovery: applyConditions path calls applyAdvancedModifiers', async () => {
  const c = makeCombatant({
    actor: { id: 'a1', items: [], statuses: ['stunned'] }
  });
  let called = false;
  const api = {
    applyAdvancedModifiers(die) {
      called = true;
      return die;
    }
  };
  await rollRecovery(api, c, 'cantrip', { applyConditions: true });
  assert.equal(called, true);
});

test('rollRecovery: applyConditions without applyAdvancedModifiers still rolls', async () => {
  const c = makeCombatant({ actor: { id: 'a1', items: [], statuses: [] } });
  const result = await rollRecovery({}, c, 'cantrip', { applyConditions: true });
  assert.equal(result, 4);
});

test('rollRecovery: fixed phase path for bonus action creates chat and no roll die', async () => {
  const messages = [];
  globalThis.ChatMessage.create = async (data) => {
    messages.push(data);
    return data;
  };
  const c = makeCombatant({ actor: { id: 'a1', items: [], statuses: [] } });
  const result = await rollRecovery(moduleApi, c, 'bonusAction', { initiativeDie: 'd8' });
  assert.equal(result, 1);
  assert.equal(messages.length, 1);
  assert.equal(c.getFlag(MODULE_ID, FLAGS.NEXT_PHASE), 1);
});

test('rollRecovery: applyImmediately sets current phase and initiative', async () => {
  const c = makeCombatant({ actor: { id: 'a1', items: [], statuses: [] } });
  const result = await rollRecovery(moduleApi, c, 'cantrip', { applyImmediately: true });
  assert.equal(result, 4);
  assert.equal(c.getFlag(MODULE_ID, FLAGS.CURRENT_PHASE), 4);
  assert.equal(c.getFlag(MODULE_ID, FLAGS.RECOVERING), false);
  assert.equal(c.initiative, (11 - 4) * 10);
});

test('rollRecovery: weapon-attack aliases use weapon die path', async () => {
  const c = makeCombatant({
    actor: {
      id: 'a1',
      items: [{ type: 'weapon', system: { equipped: true, damage: { parts: [['1d6', 'p']] } } }],
      statuses: []
    }
  });
  for (const action of ['weapon-attack', 'mwak', 'rwak']) {
    recoveryHistorySystem.clearAllHistory();
    const result = await rollRecovery(moduleApi, c, action, {});
    assert.equal(result, 4, action);
  }
});

test('rollRecovery: caps rolled total at 10', async () => {
  globalThis.Roll = class extends MockRoll {
    constructor(formula) {
      super(formula);
      this.total = 20;
    }
  };
  const c = makeCombatant({ actor: { id: 'a1', items: [], statuses: [] } });
  const result = await rollRecovery(moduleApi, c, 'cantrip', {});
  assert.equal(result, 10);
});
