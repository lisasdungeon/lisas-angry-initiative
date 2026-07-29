import assert from 'node:assert/strict';
import test from 'node:test';
import { PhaseVariantsSystem } from '../scripts/phase-variants.js';

test('getActiveVariant: defaults to the standard 1-10 variant', () => {
  const system = new PhaseVariantsSystem();
  const variant = system.getActiveVariant();
  assert.equal(variant.phases, 10);
  assert.equal(variant.minRecovery, 1);
  assert.equal(variant.maxRecovery, 10);
});

test('setActiveVariant: switches between built-in variants', () => {
  const system = new PhaseVariantsSystem();
  assert.equal(system.setActiveVariant('gritty'), true);
  assert.equal(system.getActiveVariant().phases, 12);
});

test('setActiveVariant: rejects an unknown variant id', () => {
  const system = new PhaseVariantsSystem();
  assert.equal(system.setActiveVariant('nonexistent'), false);
  assert.equal(system.getActiveVariant().phases, 10);
});

test('createCustomVariant: registers and can be activated', () => {
  const system = new PhaseVariantsSystem();
  const variant = system.createCustomVariant('mythic', { name: 'Mythic', phases: 15, minRecovery: 1, maxRecovery: 15 });
  assert.equal(variant.isCustom, true);
  assert.equal(system.setActiveVariant('mythic'), true);
  assert.equal(system.getPhaseCount(), 15);
});

test('createCustomVariant: clamps phases and recovery bounds to sane ranges', () => {
  const system = new PhaseVariantsSystem();
  const variant = system.createCustomVariant('extreme', { phases: 999, minRecovery: -5, maxRecovery: 1 });
  assert.equal(variant.phases, 20);
  assert.equal(variant.minRecovery, 1);
  assert.equal(variant.maxRecovery, 2);
});

test('getAllVariants: merges built-in and custom variants', () => {
  const system = new PhaseVariantsSystem();
  system.createCustomVariant('homebrew', { name: 'Homebrew' });
  const all = system.getAllVariants();
  assert.ok(all.standard);
  assert.ok(all.gritty);
  assert.ok(all.heroic);
  assert.ok(all.homebrew);
});

test('deleteCustomVariant: removes a custom variant and falls back to standard if it was active', () => {
  const system = new PhaseVariantsSystem();
  system.createCustomVariant('temp', { name: 'Temp' });
  system.setActiveVariant('temp');
  assert.equal(system.deleteCustomVariant('temp'), true);
  assert.equal(system.activeVariant, 'standard');
});

test('deleteCustomVariant: cannot delete a built-in variant', () => {
  const system = new PhaseVariantsSystem();
  assert.equal(system.deleteCustomVariant('standard'), false);
});

test('constrainPhase: clamps to the active variant\'s phase count', () => {
  const system = new PhaseVariantsSystem();
  assert.equal(system.constrainPhase(0), 1);
  assert.equal(system.constrainPhase(5), 5);
  assert.equal(system.constrainPhase(99), 10);
});

test('constrainRecovery: clamps to the active variant\'s min/max recovery', () => {
  const system = new PhaseVariantsSystem();
  system.setActiveVariant('heroic');
  assert.equal(system.constrainRecovery(0), 1);
  assert.equal(system.constrainRecovery(5), 5);
  assert.equal(system.constrainRecovery(99), 8);
});

test('getStatistics: reports variant counts', () => {
  const system = new PhaseVariantsSystem();
  system.createCustomVariant('custom-1', {});
  const stats = system.getStatistics();
  assert.equal(stats.activeVariant, 'standard');
  assert.equal(stats.builtInVariants, 3);
  assert.equal(stats.customVariants, 1);
  assert.equal(stats.totalVariants, 4);
});
