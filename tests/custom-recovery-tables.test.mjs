import assert from 'node:assert/strict';
import test from 'node:test';
import { CustomRecoveryTablesSystem } from '../scripts/custom-recovery-tables.js';

test('constructor: seeds the three documented default tables', () => {
  const system = new CustomRecoveryTablesSystem();
  const all = system.getAllTables();
  assert.ok(all['standard-melee']);
  assert.ok(all.spellcaster);
  assert.ok(all.archer);
});

test('getRecoveryDieFromTable: reads a rule from a default table', () => {
  const system = new CustomRecoveryTablesSystem();
  assert.equal(system.getRecoveryDieFromTable('spellcaster', 'cantrip'), 'd6');
  assert.equal(system.getRecoveryDieFromTable('spellcaster', 'spellUpcast'), 'd10');
});

test('getRecoveryDieFromTable: unknown table or rule returns null', () => {
  const system = new CustomRecoveryTablesSystem();
  assert.equal(system.getRecoveryDieFromTable('does-not-exist', 'attack'), null);
  assert.equal(system.getRecoveryDieFromTable('archer', 'no-such-action'), null);
});

test('createTable: registers a new table with defaults filled in', () => {
  const system = new CustomRecoveryTablesSystem();
  const table = system.createTable('rogue-rules', { rules: { sneak: { die: 'd4' } } });
  assert.equal(table.name, 'Custom Recovery Table');
  assert.equal(table.isDefault, false);
  assert.equal(system.getRecoveryDieFromTable('rogue-rules', 'sneak'), 'd4');
});

test('updateTableRules: merges new rules into an existing table without dropping old ones', () => {
  const system = new CustomRecoveryTablesSystem();
  system.createTable('rogue-rules', { rules: { sneak: { die: 'd4' } } });
  assert.equal(system.updateTableRules('rogue-rules', { dodge: { die: '+1' } }), true);
  assert.equal(system.getRecoveryDieFromTable('rogue-rules', 'sneak'), 'd4');
  assert.equal(system.getRecoveryDieFromTable('rogue-rules', 'dodge'), '+1');
});

test('updateTableRules: returns false for a table that does not exist', () => {
  const system = new CustomRecoveryTablesSystem();
  assert.equal(system.updateTableRules('nope', {}), false);
});

test('deleteTable: removes a table by id', () => {
  const system = new CustomRecoveryTablesSystem();
  assert.equal(system.deleteTable('archer'), true);
  assert.equal(system.getAllTables().archer, undefined);
  assert.equal(system.deleteTable('archer'), false);
});

test('getStatistics: reports table counts and correctly flags the three seeded defaults', () => {
  const system = new CustomRecoveryTablesSystem();
  system.createTable('extra', {});
  const stats = system.getStatistics();
  assert.equal(stats.totalTables, 4);
  assert.equal(stats.defaultTables, 3);
});

test('createTable: user-created tables are never marked as defaults', () => {
  const system = new CustomRecoveryTablesSystem();
  const table = system.createTable('homebrew', {});
  assert.equal(table.isDefault, false);
});
