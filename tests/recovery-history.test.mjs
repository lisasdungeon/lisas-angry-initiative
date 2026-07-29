import assert from 'node:assert/strict';
import test from 'node:test';
import { RecoveryHistorySystem } from '../scripts/recovery-history.js';

test('record: stores an entry and returns it', () => {
  const history = new RecoveryHistorySystem();
  const stored = history.record({ combatantId: 'c1', combatantName: 'Fighter', actionType: 'attack', die: 'd8', rollResult: 6, nextPhase: 6 });
  assert.equal(stored.combatantId, 'c1');
  assert.equal(stored.combatantName, 'Fighter');
  assert.equal(stored.rollResult, 6);
  assert.ok(Number.isFinite(stored.timestamp));
});

test('record: rejects an entry with no combatantId', () => {
  const history = new RecoveryHistorySystem();
  assert.equal(history.record({}), null);
  assert.equal(history.record(), null);
});

test('record: fills in defaults for omitted fields', () => {
  const history = new RecoveryHistorySystem();
  const stored = history.record({ combatantId: 'c1' });
  assert.equal(stored.combatantName, '');
  assert.equal(stored.actionType, 'attack');
  assert.equal(stored.die, null);
  assert.deepEqual(stored.conditions, []);
});

test('getHistory: returns newest-first, respecting the limit', () => {
  const history = new RecoveryHistorySystem();
  history.record({ combatantId: 'c1', rollResult: 1 });
  history.record({ combatantId: 'c1', rollResult: 2 });
  history.record({ combatantId: 'c1', rollResult: 3 });

  const all = history.getHistory('c1', 10);
  assert.deepEqual(all.map((e) => e.rollResult), [3, 2, 1]);

  const limited = history.getHistory('c1', 2);
  assert.deepEqual(limited.map((e) => e.rollResult), [3, 2]);
});

test('getHistory: unknown combatant returns an empty array', () => {
  const history = new RecoveryHistorySystem();
  assert.deepEqual(history.getHistory('does-not-exist'), []);
});

test('record: trims the log to the configured limit, dropping the oldest entries', () => {
  const history = new RecoveryHistorySystem(3);
  history.record({ combatantId: 'c1', rollResult: 1 });
  history.record({ combatantId: 'c1', rollResult: 2 });
  history.record({ combatantId: 'c1', rollResult: 3 });
  history.record({ combatantId: 'c1', rollResult: 4 });

  const log = history.getHistory('c1', 10);
  assert.equal(log.length, 3);
  assert.deepEqual(log.map((e) => e.rollResult), [4, 3, 2]);
});

test('clearHistory: removes only the named combatant\'s log', () => {
  const history = new RecoveryHistorySystem();
  history.record({ combatantId: 'c1', rollResult: 1 });
  history.record({ combatantId: 'c2', rollResult: 2 });

  assert.equal(history.clearHistory('c1'), true);
  assert.deepEqual(history.getHistory('c1'), []);
  assert.equal(history.getHistory('c2').length, 1);
  assert.equal(history.clearHistory('c1'), false);
});

test('clearAllHistory: empties every combatant\'s log', () => {
  const history = new RecoveryHistorySystem();
  history.record({ combatantId: 'c1', rollResult: 1 });
  history.record({ combatantId: 'c2', rollResult: 2 });

  history.clearAllHistory();
  assert.deepEqual(history.getHistory('c1'), []);
  assert.deepEqual(history.getHistory('c2'), []);
  assert.equal(history.getStatistics().totalCombatants, 0);
});

test('getStatistics: reports combatant and entry counts', () => {
  const history = new RecoveryHistorySystem();
  history.record({ combatantId: 'c1', rollResult: 1 });
  history.record({ combatantId: 'c1', rollResult: 2 });
  history.record({ combatantId: 'c2', rollResult: 3 });

  const stats = history.getStatistics();
  assert.equal(stats.totalCombatants, 2);
  assert.equal(stats.totalEntries, 3);
});
