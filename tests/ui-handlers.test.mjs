/**
 * @jsdom
 */
import assert from 'node:assert/strict';
import test, { before, beforeEach } from 'node:test';
import { JSDOM } from 'jsdom';
import { FLAGS, MODULE_ID, SETTINGS } from '../scripts/constants.js';
import {
  createGameMock,
  createUiMock,
  installGlobals,
  makeCombat,
  makeCombatant
} from './foundry-mock.mjs';

// ui-handlers uses real DOM nodes via querySelector; provide jsdom if missing
before(() => {
  if (typeof globalThis.document === 'undefined') {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    globalThis.window = dom.window;
    globalThis.document = dom.window.document;
    globalThis.HTMLElement = dom.window.HTMLElement;
    globalThis.Node = dom.window.Node;
    globalThis.NodeList = dom.window.NodeList;
  }
});

const { game } = installGlobals();

let registerSettings;
let onRenderChatMessageAttack;
let onRenderCombatTracker;

before(async () => {
  // Re-install $ after document exists
  const mock = await import('./foundry-mock.mjs');
  mock.installGlobals();
  const mod = await import('../scripts/ui-handlers.js');
  registerSettings = mod.registerSettings;
  onRenderChatMessageAttack = mod.onRenderChatMessageAttack;
  onRenderCombatTracker = mod.onRenderCombatTracker;
});

beforeEach(() => {
  game.settings.set(MODULE_ID, SETTINGS.ENABLE_CORE, true);
  game.settings.set(MODULE_ID, SETTINGS.SHOW_PHASE_VISUALS, true);
  game.user = { id: 'gm-1', isGM: true, active: true };
  game.combat = null;
  document.body.innerHTML = '';
});

test('registerSettings: registers all five world settings', () => {
  const g = createGameMock();
  globalThis.game = g;
  const api = { cleanup: async () => {} };
  registerSettings(api);
  const keys = g.settings._registrations.map((r) => r.key);
  assert.deepEqual(keys, [
    SETTINGS.ENABLE_CORE,
    SETTINGS.AUTO_SIZE_INIT_DIE,
    SETTINGS.BLOCK_REACTIONS,
    SETTINGS.KNOCKBACK_THRESHOLD,
    SETTINGS.SHOW_PHASE_VISUALS
  ]);
  globalThis.game = game;
});

test('registerSettings: ENABLE_CORE onChange triggers cleanup when GM confirms disable', async () => {
  const g = createGameMock();
  globalThis.game = g;
  globalThis.game.user = { id: 'gm-1', isGM: true };
  let cleaned = false;
  registerSettings({
    cleanup: async () => {
      cleaned = true;
    }
  });
  const field = g.settings._registrations.find((r) => r.key === SETTINGS.ENABLE_CORE);
  globalThis.foundry = globalThis.foundry || { applications: { api: {} } };
  globalThis.foundry.applications = globalThis.foundry.applications || { api: {} };
  globalThis.foundry.applications.api = globalThis.foundry.applications.api || {};
  globalThis.foundry.applications.api.DialogV2 = { confirm: async () => true };
  await field.data.onChange(false);
  assert.equal(cleaned, true);
  globalThis.game = game;
});

test('registerSettings: ENABLE_CORE onChange no-ops when enabling or non-GM', async () => {
  const g = createGameMock();
  globalThis.game = g;
  let cleaned = 0;
  registerSettings({
    cleanup: async () => {
      cleaned += 1;
    }
  });
  const field = g.settings._registrations.find((r) => r.key === SETTINGS.ENABLE_CORE);
  await field.data.onChange(true);
  globalThis.game.user = { isGM: false };
  await field.data.onChange(false);
  assert.equal(cleaned, 0);
  globalThis.foundry.applications.api.DialogV2 = { confirm: async () => false };
  globalThis.game.user = { isGM: true };
  await field.data.onChange(false);
  assert.equal(cleaned, 0);
  globalThis.game = game;
});

test('onRenderChatMessageAttack: early returns for disabled core / non-attack', () => {
  game.settings.set(MODULE_ID, SETTINGS.ENABLE_CORE, false);
  onRenderChatMessageAttack({}, { flags: { dnd5e: { roll: { type: 'attack' } } } }, document.createElement('div'));
  game.settings.set(MODULE_ID, SETTINGS.ENABLE_CORE, true);
  onRenderChatMessageAttack({}, { flags: { dnd5e: { roll: { type: 'damage' } } }, flavor: 'Damage' }, document.createElement('div'));
});

test('onRenderChatMessageAttack: detects attack via flavor and rolls options', () => {
  const c = makeCombatant({ actor: { id: 'spk' } });
  game.combat = makeCombat([c]);
  const root = document.createElement('div');
  root.innerHTML = '<div class="message-content"></div>';
  onRenderChatMessageAttack(
    { rollRecovery: async () => {} },
    { flavor: 'Sword Attack', speaker: { actor: 'spk' } },
    root
  );
  assert.ok(root.querySelector('.ld-angry-initiative-attack-menu'));

  root.innerHTML = '<div class="message-content"></div>';
  onRenderChatMessageAttack(
    { rollRecovery: async () => {} },
    {
      rolls: [{ options: { flavor: 'Melee Attack' } }],
      speaker: { actor: 'spk' }
    },
    root
  );
  assert.ok(root.querySelector('.ld-angry-initiative-roll-recovery'));
});

test('onRenderChatMessageAttack: no combatant means no menu', () => {
  game.combat = makeCombat([]);
  const root = document.createElement('div');
  root.innerHTML = '<div class="message-content"></div>';
  onRenderChatMessageAttack(
    {},
    { flags: { dnd5e: { roll: { type: 'attack' } } }, speaker: { actor: 'missing' } },
    root
  );
  assert.equal(root.querySelector('.ld-angry-initiative-attack-menu'), null);
});

test('onRenderChatMessageAttack: recovery button rolls with selected die', async () => {
  const c = makeCombatant({ actor: { id: 'spk' } });
  game.combat = makeCombat([c]);
  const root = document.createElement('div');
  root.innerHTML = '<div class="message-content"></div>';
  let seen = null;
  onRenderChatMessageAttack(
    {
      rollRecovery: async (combatant, action, options) => {
        seen = { combatant, action, options };
      }
    },
    { flags: { dnd5e: { roll: { type: 'attack' } } }, speaker: { actor: 'spk' } },
    root
  );
  const select = root.querySelector('.ld-angry-initiative-rec-die');
  assert.ok(select, 'recovery die select should exist');
  select.value = 'd12';
  const btn = root.querySelector('.ld-angry-initiative-roll-recovery');
  assert.ok(btn, 'recovery button should exist');
  btn.click();
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(seen.action, 'attack');
  assert.equal(seen.options.baseDamageDie, 'd12');
  assert.equal(seen.combatant.id, c.id);
});

test('onRenderChatMessageAttack: accepts jquery-like html root', () => {
  const c = makeCombatant({ actor: { id: 'spk' } });
  game.combat = makeCombat([c]);
  const root = document.createElement('div');
  root.innerHTML = '<div class="message-content"></div>';
  const jq = globalThis.$(root);
  onRenderChatMessageAttack(
    { rollRecovery: async () => {} },
    { flags: { dnd5e: { roll: { type: 'attack' } } }, speaker: { actor: 'spk' } },
    jq
  );
  assert.ok(root.querySelector('.ld-angry-initiative-attack-menu'));
});

test('onRenderCombatTracker: early return when visuals off', () => {
  game.settings.set(MODULE_ID, SETTINGS.SHOW_PHASE_VISUALS, false);
  const html = document.createElement('div');
  onRenderCombatTracker({}, {}, html);
});

test('onRenderCombatTracker: paints phase label and recovery button for GM', async () => {
  const c = makeCombatant({ id: 'c-vis', actor: { id: 'a1', system: { traits: { size: 'medium' } }, items: [] } });
  await c.setFlag(MODULE_ID, FLAGS.CURRENT_PHASE, 4);
  await c.setFlag(MODULE_ID, FLAGS.RECOVERING, false);
  game.combat = makeCombat([c]);

  const html = document.createElement('div');
  html.innerHTML = `
    <li class="combatant" data-combatant-id="c-vis">
      <div class="token-initiative"></div>
      <div class="combatant-controls"><a class="other"></a></div>
    </li>
  `;
  const tracker = { viewed: { combatants: { get: (id) => (id === 'c-vis' ? c : null) } } };
  let prompted = null;
  onRenderCombatTracker(
    {
      promptRecoveryRoll: async (combatant, lastAction, options) => {
        prompted = { combatant, lastAction, options };
      }
    },
    tracker,
    html
  );
  const span = html.querySelector('.phase-display');
  assert.ok(span);
  assert.match(span.textContent, /phase/i);
  const btn = html.querySelector('.recovery-roll-btn');
  assert.ok(btn);
  btn.click();
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(prompted.combatant.id, 'c-vis');
  assert.equal(prompted.lastAction, 'attack');
});

test('onRenderCombatTracker: recovering label uses next phase', async () => {
  const c = makeCombatant({ id: 'c-rec' });
  await c.setFlag(MODULE_ID, FLAGS.CURRENT_PHASE, 2);
  await c.setFlag(MODULE_ID, FLAGS.RECOVERING, true);
  await c.setFlag(MODULE_ID, FLAGS.NEXT_PHASE, 6);
  game.combat = makeCombat([c]);
  const html = document.createElement('div');
  html.innerHTML = `
    <li class="combatant" data-combatant-id="c-rec">
      <div class="combatant-initiative"></div>
      <div class="combatant-controls"></div>
    </li>
  `;
  onRenderCombatTracker({}, { viewed: null }, html);
  assert.match(html.querySelector('.phase-display').textContent, /6/);
});

test('onRenderCombatTracker: derives phase from initiative when flag missing', () => {
  const c = makeCombatant({ id: 'c-init', initiative: 70 });
  game.combat = makeCombat([c]);
  const html = document.createElement('div');
  html.innerHTML = `
    <li class="combatant" data-combatant-id="c-init">
      <div class="token-initiative"></div>
      <div class="combatant-controls"></div>
    </li>
  `;
  onRenderCombatTracker({}, {}, html);
  // phase = 11 - floor(70/10) = 4
  assert.ok(html.querySelector('.phase-4'));
});

test('onRenderCombatTracker: skips unknown combatant and non-owner players', async () => {
  game.user = { id: 'p1', isGM: false };
  const owned = makeCombatant({ id: 'owned', isOwner: false });
  await owned.setFlag(MODULE_ID, FLAGS.CURRENT_PHASE, 1);
  game.combat = makeCombat([owned]);
  const html = document.createElement('div');
  html.innerHTML = `
    <li class="combatant" data-combatant-id="missing">
      <div class="token-initiative"></div>
      <div class="combatant-controls"></div>
    </li>
    <li class="combatant" data-combatant-id="owned">
      <div class="token-initiative"></div>
      <div class="combatant-controls"></div>
    </li>
  `;
  onRenderCombatTracker({}, {}, html);
  assert.equal(html.querySelector('.recovery-roll-btn'), null);
});

test('onRenderCombatTracker: attack lastAction supplies weapon die options', async () => {
  const c = makeCombatant({
    id: 'c-atk',
    isOwner: true,
    actor: {
      id: 'a1',
      system: { traits: { size: 'medium' } },
      items: [{ type: 'weapon', system: { equipped: true, damage: { parts: [['1d10', 's']] } } }]
    }
  });
  await c.setFlag(MODULE_ID, FLAGS.CURRENT_PHASE, 1);
  await c.setFlag(MODULE_ID, FLAGS.LAST_ACTION, 'attack');
  await c.setFlag(MODULE_ID, FLAGS.INITIATIVE_DIE, 'd8');
  game.combat = makeCombat([c]);
  game.user = { id: 'p1', isGM: false };
  const html = document.createElement('div');
  html.innerHTML = `
    <li class="combatant" data-combatant-id="c-atk">
      <div class="token-initiative"></div>
      <div class="combatant-controls"></div>
    </li>
  `;
  let opts = null;
  onRenderCombatTracker(
    {
      promptRecoveryRoll: async (_c, _a, options) => {
        opts = options;
      }
    },
    {},
    html
  );
  const btn = html.querySelector('.recovery-roll-btn');
  assert.ok(btn);
  btn.click();
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(opts.baseDamageDie, 'd10');
  assert.equal(opts.initiativeDie, 'd8');
});

test('onRenderCombatTracker: skips adding second recovery button', async () => {
  const c = makeCombatant({ id: 'c-dup' });
  await c.setFlag(MODULE_ID, FLAGS.CURRENT_PHASE, 1);
  game.combat = makeCombat([c]);
  const html = document.createElement('div');
  html.innerHTML = `
    <li class="combatant" data-combatant-id="c-dup">
      <div class="token-initiative"></div>
      <div class="combatant-controls"><a class="recovery-roll-btn"></a></div>
    </li>
  `;
  onRenderCombatTracker({}, {}, html);
  assert.equal(html.querySelectorAll('.recovery-roll-btn').length, 1);
});
