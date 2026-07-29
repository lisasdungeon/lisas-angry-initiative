/**
 * Lisa's Angry Initiative - Main Entry Point
 * @module main
 * @author Lisa's Dungeon
 * @license MIT
 */

import LisasAngryInitiative from './lisas-angry-initiative-class.js';

Hooks.once('init', () => {
    LisasAngryInitiative.init();
});

globalThis.LisasAngryInitiative = LisasAngryInitiative;
export default LisasAngryInitiative;
