import assert from 'node:assert/strict';
import test from 'node:test';
import { format, getActionLabel, getRecoveryActionOptions, localize } from '../scripts/i18n.js';
import { installGlobals } from './foundry-mock.mjs';

installGlobals();

test('localize: builds LISAS_ANGRY_INIT key and uses game.i18n', () => {
  assert.equal(localize('Dialogs.ActionType'), 'LISAS_ANGRY_INIT.Dialogs.ActionType');
});

test('localize: falls back to key when i18n is missing', () => {
  const prev = globalThis.game.i18n;
  globalThis.game.i18n = null;
  assert.equal(localize('X.Y'), 'LISAS_ANGRY_INIT.X.Y');
  globalThis.game.i18n = prev;
});

test('format: passes data through game.i18n.format', () => {
  const out = format('Combat.InitiativeRollFlavor', { phase: 3 });
  assert.match(out, /InitiativeRollFlavor/);
  assert.match(out, /"phase":3/);
});

test('format: falls back to key when format is missing', () => {
  const prev = globalThis.game.i18n;
  globalThis.game.i18n = {};
  assert.equal(format('A.B', { n: 1 }), 'LISAS_ANGRY_INIT.A.B');
  globalThis.game.i18n = prev;
});

test('getActionLabel: maps known action types', () => {
  assert.equal(getActionLabel('attack'), 'LISAS_ANGRY_INIT.Actions.Attack');
  assert.equal(getActionLabel('cantrip'), 'LISAS_ANGRY_INIT.Actions.Cantrip');
  assert.equal(getActionLabel('spell'), 'LISAS_ANGRY_INIT.Actions.Spell');
  assert.equal(getActionLabel('action'), 'LISAS_ANGRY_INIT.Actions.Action');
  assert.equal(getActionLabel('bonusAction'), 'LISAS_ANGRY_INIT.Actions.BonusAction');
  assert.equal(getActionLabel('reaction'), 'LISAS_ANGRY_INIT.Actions.Reaction');
  assert.equal(getActionLabel('movement'), 'LISAS_ANGRY_INIT.Actions.Movement');
});

test('getActionLabel: unknown type falls back to Attack', () => {
  assert.equal(getActionLabel('weird'), 'LISAS_ANGRY_INIT.Actions.Attack');
});

test('getRecoveryActionOptions: marks selected action and lists all options', () => {
  const html = getRecoveryActionOptions('spell');
  assert.match(html, /value="spell" selected/);
  assert.match(html, /value="attack"/);
  assert.match(html, /value="bonusAction"/);
  assert.match(html, /value="movement"/);
});

test('getRecoveryActionOptions: defaults selected to attack', () => {
  const html = getRecoveryActionOptions();
  assert.match(html, /value="attack" selected/);
});
