/**
 * Lisa's Angry Initiative - Main Module
 * @module main
 * @author Lisa's Dungeon
 * @license Proprietary
 */

import { MODULE_INFO } from './constants.js';
import LisasAngryInitiative from './lisas-angry-initiative-class.js';

// ============================================================================
// MODULE REGISTRATION
// ============================================================================
globalThis.RNK_MODULES = globalThis.RNK_MODULES || [];
if (!globalThis.RNK_MODULES.some((entry) => entry.id === MODULE_INFO.id)) {
  globalThis.RNK_MODULES.push({
    id: MODULE_INFO.id,
    title: MODULE_INFO.title,
    icon: MODULE_INFO.icon,
    order: MODULE_INFO.order,
    quantumPortal: true,
    onClick: () => LisasAngryInitiative.activate(),
  });
}

// ============================================================================
// MODULE INITIALIZATION
// ============================================================================
Hooks.once('init', () => {
  console.log(`Initializing ${MODULE_INFO.title} v${MODULE_INFO.version}`);
});

Hooks.once('ready', async () => {
  console.log(`${MODULE_INFO.title} ready`);
  globalThis.LisasAngryInitiative = LisasAngryInitiative.getAPI();
});

// ============================================================================
// COMBAT HOOKS
// ============================================================================
Hooks.on('combatStart', (combat) => {
  console.log(`Combat started with ${combat.combatants.length} combatants`);
  LisasAngryInitiative.hooks.fireHook('beforeCombatStart', { combat });
});

Hooks.on('combatEnd', (combat) => {
  console.log(`Combat ended`);
  LisasAngryInitiative.hooks.fireHook('afterCombatEnd', { combat });
});

Hooks.on('updateCombatant', (combatant, updates) => {
  if (updates.initiative !== undefined) {
    console.log(`${combatant.name} initiative updated`);
  }
});

// ============================================================================
// EXPORT API
// ============================================================================
export { LisasAngryInitiative };
export const lisasAngryInitiativeAPI = LisasAngryInitiative.getAPI();
