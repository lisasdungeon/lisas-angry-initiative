// Covers LisasAngryInitiative.applyAdvancedModifiers  -  the previously-orphaned
// condition/bonus-action/checked-attack die adjustment logic that rollRecovery()
// now calls for the condition-adjustment branch (recovery.js). Importing the
// class module is safe in Node: every Foundry global it touches (game, Hooks,
// ui, canvas) is referenced inside method bodies, never at module load time.
import assert from 'node:assert/strict';
import test from 'node:test';
import LisasAngryInitiative from '../scripts/lisas-angry-initiative-class.js';

test('applyAdvancedModifiers: bonus action upsizes the die by one step', () => {
  assert.equal(LisasAngryInitiative.applyAdvancedModifiers('d6', null, { bonusAction: true }), 'd8');
});

test('applyAdvancedModifiers: checked attack downsizes the die by one step', () => {
  assert.equal(LisasAngryInitiative.applyAdvancedModifiers('d8', null, { checkedAttack: true }), 'd6');
  assert.equal(LisasAngryInitiative.applyAdvancedModifiers('d8', null, { isCheckedAttack: true }), 'd6');
});

test('applyAdvancedModifiers: with no options, the die passes through unchanged', () => {
  assert.equal(LisasAngryInitiative.applyAdvancedModifiers('d8', null, {}), 'd8');
});

test('applyAdvancedModifiers: without applyConditions, actor statuses are ignored', () => {
  const combatant = { actor: { statuses: ['stunned'] } };
  assert.equal(LisasAngryInitiative.applyAdvancedModifiers('d8', combatant, {}), 'd8');
});

test('applyAdvancedModifiers: stunned/paralyzed downsize by 2 steps', () => {
  const stunned = { actor: { statuses: ['stunned'] } };
  assert.equal(LisasAngryInitiative.applyAdvancedModifiers('d12', stunned, { applyConditions: true }), 'd8');

  const paralyzed = { actor: { statuses: ['paralyzed'] } };
  assert.equal(LisasAngryInitiative.applyAdvancedModifiers('d12', paralyzed, { applyConditions: true }), 'd8');
});

test('applyAdvancedModifiers: exhaustion/restrained downsize by 1 step, prone has no effect', () => {
  assert.equal(
    LisasAngryInitiative.applyAdvancedModifiers('d8', { actor: { statuses: ['exhaustion'] } }, { applyConditions: true }),
    'd6'
  );
  assert.equal(
    LisasAngryInitiative.applyAdvancedModifiers('d8', { actor: { statuses: ['restrained'] } }, { applyConditions: true }),
    'd6'
  );
  assert.equal(
    LisasAngryInitiative.applyAdvancedModifiers('d8', { actor: { statuses: ['prone'] } }, { applyConditions: true }),
    'd8'
  );
});

test('applyAdvancedModifiers: inspired/blessed/haste each upsize by 1 step', () => {
  for (const status of ['inspired', 'blessed', 'haste']) {
    assert.equal(
      LisasAngryInitiative.applyAdvancedModifiers('d6', { actor: { statuses: [status] } }, { applyConditions: true }),
      'd8',
      `expected ${status} to upsize`
    );
  }
});

test('applyAdvancedModifiers: multiple conditions stack, in list order', () => {
  const combatant = { actor: { statuses: ['exhaustion', 'blessed'] } };
  // d8 -1 (exhaustion) = d6, then +1 (blessed) = d8: net no change, but via two steps.
  assert.equal(LisasAngryInitiative.applyAdvancedModifiers('d8', combatant, { applyConditions: true }), 'd8');
});

test('applyAdvancedModifiers: an unrecognized status is ignored, not an error', () => {
  const combatant = { actor: { statuses: ['invisible'] } };
  assert.equal(LisasAngryInitiative.applyAdvancedModifiers('d8', combatant, { applyConditions: true }), 'd8');
});

test('applyAdvancedModifiers: applyConditions with no combatant does not throw', () => {
  assert.equal(LisasAngryInitiative.applyAdvancedModifiers('d8', null, { applyConditions: true }), 'd8');
});

test('applyAdvancedModifiers: combines bonus action, checked attack, and conditions', () => {
  const combatant = { actor: { statuses: ['inspired'] } };
  // d6 -> bonusAction upsize -> d8 -> checkedAttack downsize -> d6 -> inspired upsize -> d8
  assert.equal(
    LisasAngryInitiative.applyAdvancedModifiers('d6', combatant, {
      bonusAction: true,
      checkedAttack: true,
      applyConditions: true,
    }),
    'd8'
  );
});
