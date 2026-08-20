import assert from 'node:assert/strict';
import test, { beforeEach } from 'node:test';
import LisasAngryInitiative from '../scripts/lisas-angry-initiative-class.js';
import { FLAGS, MODULE_ID, MODULE_INFO, SETTINGS } from '../scripts/constants.js';
import {
  installGlobals,
  makeCombat,
  makeCombatant
} from './foundry-mock.mjs';

const { game, ui, Hooks } = installGlobals();

beforeEach(() => {
  LisasAngryInitiative.isInitialized = false;
  game.settings.set(MODULE_ID, SETTINGS.ENABLE_CORE, true);
  game.settings.set(MODULE_ID, SETTINGS.SHOW_PHASE_VISUALS, true);
  game.user = { id: 'gm-1', isGM: true, active: true };
  game.combat = null;
  ui._calls.info.length = 0;
  // Stable module object so registerApi can assign .api permanently
  const mod = { id: MODULE_ID, api: null };
  game.modules = {
    get(id) {
      return id === MODULE_ID ? mod : null;
    }
  };
});

test('init: registers settings, hooks, api once', () => {
  LisasAngryInitiative.init();
  assert.equal(LisasAngryInitiative.isInitialized, true);
  assert.ok(Hooks.count('createCombat') >= 1);
  assert.ok(Hooks.count('dnd5e.rollAttack') >= 1);
  assert.ok(game.modules.get(MODULE_ID).api);

  const hookCount = Hooks.count('createCombat');
  LisasAngryInitiative.init();
  assert.equal(Hooks.count('createCombat'), hookCount);
});

test('registerApi: no-ops when module not found', () => {
  game.modules = { get: () => null };
  LisasAngryInitiative.registerApi();
});

test('getVersion / getStatistics', () => {
  assert.equal(LisasAngryInitiative.getVersion(), MODULE_INFO.version);
  const stats = LisasAngryInitiative.getStatistics();
  assert.ok(stats.recovery);
  assert.ok(stats.variants);
  assert.ok(stats.tables);
  assert.ok(stats.hooks);
  assert.ok(stats.indicators);
});

test('getFlag / setFlag / setPhase wrappers', async () => {
  const c = makeCombatant();
  await LisasAngryInitiative.setFlag(c, FLAGS.LAST_ACTION, 'spell');
  assert.equal(LisasAngryInitiative.getFlag(c, FLAGS.LAST_ACTION), 'spell');
  await LisasAngryInitiative.setPhase(c, 5, false);
  assert.equal(LisasAngryInitiative.getFlag(c, FLAGS.CURRENT_PHASE), 5);
  await LisasAngryInitiative.setPhase(c, 2, true);
  assert.equal(LisasAngryInitiative.getFlag(c, FLAGS.NEXT_PHASE), 2);
});

test('rollRecovery / promptRecoveryRoll wrappers', async () => {
  globalThis.foundry.applications.api.DialogV2.wait = async () => null;
  const c = makeCombatant({ actor: { id: 'a1', items: [], statuses: [] } });
  assert.equal(await LisasAngryInitiative.promptRecoveryRoll(c, 'attack'), null);

  globalThis.Roll = class {
    constructor() {
      this.total = 3;
    }
    async evaluate() {
      return this;
    }
    async toMessage() {
      return {};
    }
  };
  const result = await LisasAngryInitiative.rollRecovery(c, 'cantrip', {});
  assert.equal(result, 3);
});

test('resetSettings: restores defaults and notifies', async () => {
  game.settings.set(MODULE_ID, SETTINGS.ENABLE_CORE, false);
  game.settings.set(MODULE_ID, SETTINGS.KNOCKBACK_THRESHOLD, 9);
  await LisasAngryInitiative.resetSettings();
  assert.equal(game.settings.get(MODULE_ID, SETTINGS.ENABLE_CORE), true);
  assert.equal(game.settings.get(MODULE_ID, SETTINGS.AUTO_SIZE_INIT_DIE), true);
  assert.equal(game.settings.get(MODULE_ID, SETTINGS.BLOCK_REACTIONS), true);
  assert.equal(game.settings.get(MODULE_ID, SETTINGS.KNOCKBACK_THRESHOLD), 0);
  assert.equal(game.settings.get(MODULE_ID, SETTINGS.SHOW_PHASE_VISUALS), true);
  assert.ok(ui._calls.info.length > 0);
});

test('cleanup: no-ops without combat', async () => {
  game.combat = null;
  await LisasAngryInitiative.cleanup();
  assert.equal(ui._calls.info.length, 0);
});

test('cleanup: clears flags for every combatant', async () => {
  const c = makeCombatant({ tokenId: 'tok-clean' });
  await LisasAngryInitiative.setFlag(c, FLAGS.CURRENT_PHASE, 3);
  game.combat = makeCombat([c]);
  await LisasAngryInitiative.cleanup();
  assert.equal(c.getFlag(MODULE_ID, FLAGS.CURRENT_PHASE), undefined);
  assert.ok(ui._calls.info.length > 0);
});

test('public API exposes subsystem methods after init', async () => {
  LisasAngryInitiative.init();
  const api = game.modules.get(MODULE_ID).api;
  assert.equal(typeof api.getRecoveryDie, 'function');
  assert.equal(typeof api.registerHook, 'function');
  assert.equal(typeof api.getActiveVariant, 'function');
  assert.equal(typeof api.createTable, 'function');
  assert.equal(typeof api.getTokenIndicator, 'function');
  assert.equal(typeof api.getHistory, 'function');
  assert.equal(typeof api.getVersion, 'function');

  // Call every bound API method so function coverage includes the bound wrappers
  assert.ok(api.getRecoveryDie('cantrip'));
  assert.ok(api.getInitiativeDieBySize({ system: { traits: { size: 'medium' } } }));
  assert.equal(api.upsizeDie('d6'), 'd8');
  assert.equal(api.downsizeDie('d6'), 'd4');
  assert.equal(api.applyAdvancedModifiers('d6', null, {}), 'd6');

  const c = makeCombatant();
  await api.setFlag(c, FLAGS.CURRENT_PHASE, 1);
  assert.equal(api.getFlag(c, FLAGS.CURRENT_PHASE), 1);
  await api.setPhase(c, 2, false);

  globalThis.Roll = class {
    constructor() { this.total = 2; }
    async evaluate() { return this; }
    async toMessage() { return {}; }
  };
  assert.equal(await api.rollRecovery(c, 'cantrip', {}), 2);

  globalThis.foundry.applications.api.DialogV2.wait = async () => null;
  assert.equal(await api.promptRecoveryRoll(c, 'attack'), null);

  api.getHistory(c.id);
  api.clearHistory(c.id);
  api.clearAllHistory();
  await api.resetSettings();
  game.combat = makeCombat([c]);
  await api.cleanup();
  game.combat = null;

  assert.ok(api.getActiveVariant());
  api.setActiveVariant('standard');
  assert.ok(api.getAllVariants());
  api.createCustomVariant('tmp-v', { name: 'Tmp', phases: 6, minRecovery: 1, maxRecovery: 6 });
  api.deleteCustomVariant('tmp-v');
  assert.ok(api.getPhaseCount() > 0);
  assert.ok(api.constrainPhase(99));
  assert.ok(api.constrainRecovery(99));

  const table = api.createTable('tmp-table', { name: 'T', rules: { attack: { die: 'd6' } } });
  api.getRecoveryDieFromTable(table.id, 'attack');
  api.getAllTables();
  api.updateTableRules(table.id, { attack: { die: 'd8' } });
  api.deleteTable(table.id);

  const hook = () => {};
  api.registerHook('afterPhaseChange', hook);
  api.fireHook('afterPhaseChange', {});
  api.unregisterHook('afterPhaseChange', hook);
  api.getAllHooks();

  api.setTokenIndicator('tok-api', 3);
  api.getTokenIndicator('tok-api');
  api.getAllIndicators();
  api.createPhaseDisplayUI();
  api.removeTokenIndicator('tok-api');

  assert.equal(api.getVersion(), MODULE_INFO.version);
  assert.ok(api.getStatistics());
});

test('registerHooks: handlers are callable through Hooks', async () => {
  // Fresh hooks mock to isolate  -  fire every registered wrapper for func coverage
  const hooks = (await import('./foundry-mock.mjs')).createHooksMock();
  globalThis.Hooks = hooks;
  LisasAngryInitiative.isInitialized = false;
  LisasAngryInitiative.init();

  const logs = [];
  const prev = console.log;
  console.log = (...a) => logs.push(a.join(' '));
  await hooks.getHandlers('deleteCombat')[0]();
  assert.ok(logs.some((l) => l.includes('Combat ended')));
  console.log = prev;

  game.user.isGM = false;
  await hooks.getHandlers('createCombat')[0](makeCombat([]));
  game.user.isGM = true;

  // Exercise remaining hook wrappers (early-return paths are fine)
  const emptyCombat = makeCombat([]);
  const combatant = makeCombatant({ actor: { id: 'a1' } });
  game.combat = makeCombat([combatant]);
  game.settings.set(MODULE_ID, SETTINGS.ENABLE_CORE, false);

  await hooks.getHandlers('createCombatant')[0](combatant);
  await hooks.getHandlers('updateCombat')[0](emptyCombat, {}, {}, 'gm-1');
  await hooks.getHandlers('updateCombatant')[0](combatant, {});

  // Minimal html stub  -  no jsdom required for early-return render paths
  const htmlStub = {
    jquery: true,
    length: 0,
    find: () => ({ each: () => {}, remove: () => {}, append: () => {} })
  };
  hooks.getHandlers('renderCombatTracker')[0]({}, htmlStub);
  hooks.getHandlers('renderChatMessage')[0]({ flags: {}, flavor: '' }, htmlStub);
  hooks.getHandlers('dnd5e.preUseItem')[0]({ actor: { id: 'a1' } });
  await hooks.getHandlers('dnd5e.useItem')[0]({ actor: { id: 'a1' }, name: 'x' });
  await hooks.getHandlers('dnd5e.rollAttack')[0]({ actor: { id: 'a1' } });
  await hooks.getHandlers('dnd5e.rollDamage')[0]({ actor: { id: 'a1' } });
  hooks.getHandlers('dnd5e.preRollInitiative')[0]({ id: 'a1', system: { attributes: { init: {} } } }, {});
  await hooks.getHandlers('dnd5e.rollInitiative')[0]({ id: 'a1' }, { total: 5 });

  game.settings.set(MODULE_ID, SETTINGS.ENABLE_CORE, true);
  game.combat = null;
});
