import assert from 'node:assert/strict';
import test from 'node:test';
import {
  downsizeDie,
  getActorWeaponDamageDie,
  getInitiativeDieBySize,
  getRecoveryDie,
  upsizeDie,
} from '../scripts/dice-utils.js';

test('upsizeDie: steps through d4 -> d6 -> d8 -> d10 -> d12', () => {
  assert.equal(upsizeDie('d4'), 'd6');
  assert.equal(upsizeDie('d6'), 'd8');
  assert.equal(upsizeDie('d8'), 'd10');
  assert.equal(upsizeDie('d10'), 'd12');
});

test('upsizeDie: caps at d12', () => {
  assert.equal(upsizeDie('d12'), 'd12');
});

test('upsizeDie: unknown die is left unchanged', () => {
  assert.equal(upsizeDie('d20'), 'd20');
});

test('downsizeDie: steps through d12 -> d10 -> d8 -> d6 -> d4', () => {
  assert.equal(downsizeDie('d12'), 'd10');
  assert.equal(downsizeDie('d10'), 'd8');
  assert.equal(downsizeDie('d8'), 'd6');
  assert.equal(downsizeDie('d6'), 'd4');
});

test('downsizeDie: floors at d4', () => {
  assert.equal(downsizeDie('d4'), 'd4');
});

test('downsizeDie: unknown die floors to d4', () => {
  assert.equal(downsizeDie('d20'), 'd4');
});

test('getInitiativeDieBySize: maps every creature size to its die', () => {
  const sizeOf = (size) => ({ system: { traits: { size } } });
  assert.equal(getInitiativeDieBySize(sizeOf('tiny')), 'd4');
  assert.equal(getInitiativeDieBySize(sizeOf('small')), 'd6');
  assert.equal(getInitiativeDieBySize(sizeOf('medium')), 'd8');
  assert.equal(getInitiativeDieBySize(sizeOf('large')), 'd10');
  assert.equal(getInitiativeDieBySize(sizeOf('huge')), 'd12');
  assert.equal(getInitiativeDieBySize(sizeOf('gargantuan')), 'd12');
});

test('getInitiativeDieBySize: defaults to medium (d8) for missing/unknown size', () => {
  assert.equal(getInitiativeDieBySize({}), 'd8');
  assert.equal(getInitiativeDieBySize(null), 'd8');
  assert.equal(getInitiativeDieBySize({ system: { traits: { size: 'colossal' } } }), 'd8');
});

test('getActorWeaponDamageDie: reads the equipped weapon\'s damage die', () => {
  const actor = {
    items: [
      { type: 'weapon', system: { equipped: false, damage: { parts: [['1d4', 'piercing']] } } },
      { type: 'weapon', system: { equipped: true, damage: { parts: [['1d8', 'slashing']] } } },
    ],
  };
  assert.equal(getActorWeaponDamageDie(actor), 'd8');
});

test('getActorWeaponDamageDie: falls back to the first weapon if none is equipped', () => {
  const actor = {
    items: [{ type: 'weapon', system: { equipped: false, damage: { parts: [['1d10', 'bludgeoning']] } } }],
  };
  assert.equal(getActorWeaponDamageDie(actor), 'd10');
});

test('getActorWeaponDamageDie: upsizes multi-die formulas', () => {
  const actor = {
    items: [{ type: 'weapon', system: { equipped: true, damage: { parts: [['2d6', 'slashing']] } } }],
  };
  assert.equal(getActorWeaponDamageDie(actor), 'd8');
});

test('getActorWeaponDamageDie: defaults to d6 with no actor, items, or weapon damage', () => {
  assert.equal(getActorWeaponDamageDie(null), 'd6');
  assert.equal(getActorWeaponDamageDie({ items: [] }), 'd6');
  assert.equal(getActorWeaponDamageDie({ items: [{ type: 'weapon', system: {} }] }), 'd6');
});

test('getRecoveryDie: attack uses the supplied weapon die', () => {
  assert.deepEqual(getRecoveryDie('attack', { baseDamageDie: 'd10' }), { die: 'd10', fixedPhase: null });
});

test('getRecoveryDie: attack defaults to d6 with no weapon die supplied', () => {
  assert.deepEqual(getRecoveryDie('attack', {}), { die: 'd6', fixedPhase: null });
});

test('getRecoveryDie: cantrip is always d6, leveled spell is d8', () => {
  assert.deepEqual(getRecoveryDie('cantrip'), { die: 'd6', fixedPhase: null });
  assert.deepEqual(getRecoveryDie('spell'), { die: 'd8', fixedPhase: null });
  assert.deepEqual(getRecoveryDie('spellUpcast'), { die: 'd10', fixedPhase: null });
});

test('getRecoveryDie: size-based actions use the initiative die', () => {
  assert.deepEqual(getRecoveryDie('action', { initiativeDie: 'd10' }), { die: 'd10', fixedPhase: null });
  assert.deepEqual(getRecoveryDie('reaction', {}), { die: 'd8', fixedPhase: null });
});

test('getRecoveryDie: bonus action is a fixed Phase 1, not a rolled die', () => {
  assert.deepEqual(getRecoveryDie('bonusAction', { initiativeDie: 'd10' }), { die: 'd10', fixedPhase: 1 });
});

test('getRecoveryDie: checked attack downsizes, bonus action upsizes', () => {
  assert.deepEqual(getRecoveryDie('attack', { baseDamageDie: 'd8', isCheckedAttack: true }), { die: 'd6', fixedPhase: null });
  assert.deepEqual(getRecoveryDie('attack', { baseDamageDie: 'd8', hasBonusAction: true }), { die: 'd10', fixedPhase: null });
});

test('getRecoveryDie: unknown action type falls back to d6', () => {
  assert.deepEqual(getRecoveryDie('not-a-real-action'), { die: 'd6', fixedPhase: null });
});
