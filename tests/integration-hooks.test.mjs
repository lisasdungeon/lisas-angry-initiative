import assert from 'node:assert/strict';
import test from 'node:test';
import { IntegrationHooksSystem } from '../scripts/integration-hooks.js';

test('constructor: seeds all 8 documented hook ids with no handlers', () => {
  const system = new IntegrationHooksSystem();
  const all = system.getAllHooks();
  assert.deepEqual(all, {
    beforePhaseChange: 0,
    afterPhaseChange: 0,
    beforeRecoveryRoll: 0,
    afterRecoveryRoll: 0,
    beforeCombatStart: 0,
    afterCombatEnd: 0,
    onConditionApplied: 0,
    onConditionRemoved: 0,
  });
});

test('registerHook + fireHook: handler receives the fired context', () => {
  const system = new IntegrationHooksSystem();
  let received = null;
  system.registerHook('afterPhaseChange', (context) => { received = context; });

  system.fireHook('afterPhaseChange', { phase: 5 });
  assert.deepEqual(received, { phase: 5 });
});

test('registerHook: multiple handlers on the same hook all fire, in order', () => {
  const system = new IntegrationHooksSystem();
  const calls = [];
  system.registerHook('afterCombatEnd', () => calls.push('first'));
  system.registerHook('afterCombatEnd', () => calls.push('second'));

  system.fireHook('afterCombatEnd', {});
  assert.deepEqual(calls, ['first', 'second']);
});

test('fireHook: a throwing handler does not stop later handlers from running', () => {
  const system = new IntegrationHooksSystem();
  const calls = [];
  system.registerHook('onConditionApplied', () => { throw new Error('boom'); });
  system.registerHook('onConditionApplied', () => calls.push('survived'));

  assert.doesNotThrow(() => system.fireHook('onConditionApplied', {}));
  assert.deepEqual(calls, ['survived']);
});

test('fireHook: firing an unregistered hook id is a no-op, not an error', () => {
  const system = new IntegrationHooksSystem();
  assert.doesNotThrow(() => system.fireHook('notARealHook', {}));
});

test('unregisterHook: removes a specific handler without affecting others', () => {
  const system = new IntegrationHooksSystem();
  const calls = [];
  const handlerA = () => calls.push('a');
  const handlerB = () => calls.push('b');
  system.registerHook('beforeCombatStart', handlerA);
  system.registerHook('beforeCombatStart', handlerB);

  system.unregisterHook('beforeCombatStart', handlerA);
  system.fireHook('beforeCombatStart', {});
  assert.deepEqual(calls, ['b']);
});

test('registerHook: allows registering handlers on a custom, non-default hook id', () => {
  const system = new IntegrationHooksSystem();
  let fired = false;
  system.registerHook('myCustomHook', () => { fired = true; });
  system.fireHook('myCustomHook', {});
  assert.equal(fired, true);
});

test('getStatistics: reports registered hook and total handler counts', () => {
  const system = new IntegrationHooksSystem();
  system.registerHook('afterPhaseChange', () => {});
  system.registerHook('afterPhaseChange', () => {});
  system.registerHook('afterCombatEnd', () => {});

  const stats = system.getStatistics();
  assert.equal(stats.registeredHooks, 8);
  assert.equal(stats.totalHandlers, 3);
});
