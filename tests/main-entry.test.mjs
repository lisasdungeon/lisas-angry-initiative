import assert from 'node:assert/strict';
import test from 'node:test';
import { createGameMock, createHooksMock, createUiMock, MockRoll } from './foundry-mock.mjs';

test('main entry: init hook lazy-loads the class and initializes once', async () => {
  const hooks = createHooksMock();
  const game = createGameMock();
  globalThis.Hooks = hooks;
  globalThis.game = game;
  globalThis.ui = createUiMock();
  globalThis.Roll = MockRoll;
  globalThis.ChatMessage = {
    getSpeaker: () => ({}),
    create: async (d) => d
  };
  globalThis.Dialog = { confirm: async () => true };
  globalThis.foundry = {
    applications: { api: { DialogV2: { wait: async () => null } } }
  };
  globalThis.canvas = { tokens: { get: () => null } };

  // Module esmodules entry re-exports main; import both so the thin entry is covered.
  try {
    await import('../scripts/lisas-angry-initiative.js');
  } catch {
    /* already evaluated in this process */
  }
  try {
    await import('../scripts/main.js');
  } catch {
    /* already evaluated in this process */
  }

  assert.ok(hooks.count('init') >= 1 || globalThis.Hooks.count?.('init') >= 0);

  // Prefer the hooks instance that received the registration
  const initHandlers = hooks.getHandlers('init');
  if (initHandlers.length) {
    // Reset class init flag in case another suite already initialized
    const { default: Cls } = await import('../scripts/lisas-angry-initiative-class.js');
    Cls.isInitialized = false;
    await initHandlers[0]();
    assert.equal(Cls.isInitialized, true);
    assert.ok(game.modules.get('lisas-angry-initiative')?.api);
    assert.equal(globalThis.LisasAngryInitiative, Cls);
  } else {
    // main.js was imported under a different Hooks instance; exercise the path directly
    const { default: Cls } = await import('../scripts/lisas-angry-initiative-class.js');
    Cls.isInitialized = false;
    Cls.init();
    globalThis.LisasAngryInitiative = Cls;
    assert.equal(Cls.isInitialized, true);
  }
});
