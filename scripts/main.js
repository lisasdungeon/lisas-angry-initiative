/**
 * Lisa's Angry Initiative - Main Entry Point
 * @module main
 * @author Lisa's Dungeon
 * @license Proprietary
 */

import { MODULE_INFO } from './constants.js';
import LisasAngryInitiative from './lisas-angry-initiative-class.js';

// ============================================================================
// MODULE REGISTRATION
// ============================================================================
globalThis.LD_MODULES = globalThis.LD_MODULES || [];
const MODULE_ENTRY = {
    id: MODULE_INFO.id,
    title: MODULE_INFO.title,
    icon: MODULE_INFO.icon,
    order: MODULE_INFO.order,
    onClick: () => LisasAngryInitiative.activate()
};
if (!globalThis.LD_MODULES.some((entry) => entry.id === MODULE_ENTRY.id)) {
    globalThis.LD_MODULES.push(MODULE_ENTRY);
}

// ============================================================================
// MODULE INITIALIZATION
// ============================================================================
Hooks.once('init', () => {
    LisasAngryInitiative.init();
});

globalThis.LisasAngryInitiative = LisasAngryInitiative;
export default LisasAngryInitiative;
