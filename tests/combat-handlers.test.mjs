// Slice C: combat automation functional tests for lisas-angry-initiative.
// Targets the pure-function surface: getActionTypeFromItem classifies an item
// into one of {cantrip, spell, dash, disengage, dodge, hide, item}. Stateful
// flows (onRollDamage, onCombatUpdate, sortCombatantsByPhase, etc.) require a
// Foundry combat mock and are out of scope here.
import assert from 'node:assert/strict';
import test from 'node:test';
import { getActionTypeFromItem } from '../scripts/combat-handlers.js';

test('getActionTypeFromItem: cantrip when spell level is 0', () => {
  assert.equal(getActionTypeFromItem({ type: 'spell', system: { level: 0 } }), 'cantrip');
});

test('getActionTypeFromItem: spell when spell level is 1+', () => {
  assert.equal(getActionTypeFromItem({ type: 'spell', system: { level: 1 } }), 'spell');
  assert.equal(getActionTypeFromItem({ type: 'spell', system: { level: 9 } }), 'spell');
});

test('getActionTypeFromItem: dash/disengage/dodge/hide by item name', () => {
  assert.equal(getActionTypeFromItem({ name: 'Dash' }), 'dash');
  assert.equal(getActionTypeFromItem({ name: 'Disengage' }), 'disengage');
  assert.equal(getActionTypeFromItem({ name: 'Dodge' }), 'dodge');
  assert.equal(getActionTypeFromItem({ name: 'Hide' }), 'hide');
});

test('getActionTypeFromItem: name match is case-insensitive', () => {
  assert.equal(getActionTypeFromItem({ name: 'DASH' }), 'dash');
  assert.equal(getActionTypeFromItem({ name: 'dodge action' }), 'dodge');
});

test('getActionTypeFromItem: falls back to "item" for unrecognized inputs', () => {
  assert.equal(getActionTypeFromItem({ name: 'Sword' }), 'item');
  assert.equal(getActionTypeFromItem({}), 'item');
  assert.equal(getActionTypeFromItem(null), 'item');
  assert.equal(getActionTypeFromItem(undefined), 'item');
});

test('getActionTypeFromItem: spell classification wins over name', () => {
  // A spell named "Dash" should classify as cantrip (level 0) or spell,
  // not "dash" — type takes precedence over name.
  assert.equal(
    getActionTypeFromItem({ type: 'spell', system: { level: 0 }, name: 'Dash' }),
    'cantrip',
  );
  assert.equal(
    getActionTypeFromItem({ type: 'spell', system: { level: 2 }, name: 'Dash' }),
    'spell',
  );
});