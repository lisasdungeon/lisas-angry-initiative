/**
 * Lisa's Angry Initiative - Main Entry Point
 * Lazy-loads the core class on Foundry init (trigger-based).
 * @module main
 * @author Lisa's Dungeon
 * @license MIT
 */

Hooks.once('init', async () => {
  const { default: LisasAngryInitiative } = await import('./lisas-angry-initiative-class.js');
  LisasAngryInitiative.init();
  globalThis.LisasAngryInitiative = LisasAngryInitiative;
});
