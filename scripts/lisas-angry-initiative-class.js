/**
 * Lisa's Angry Initiative - Main Class
 * @module lisas-angry-initiative-class
 * @author Lisa's Dungeon
 * @license Proprietary
 */

import { MODULE_INFO, DEFAULT_SETTINGS } from './constants.js';
import { recoverySystem } from './recovery.js';
import { phaseVariantsSystem } from './phase-variants.js';
import { customRecoveryTablesSystem } from './custom-recovery-tables.js';
import { integrationHooksSystem } from './integration-hooks.js';
import { phaseIndicatorsSystem } from './phase-indicators.js';

class LisasAngryInitiative {
  constructor() {
    this.id = MODULE_INFO.id;
    this.title = MODULE_INFO.title;
    this.version = MODULE_INFO.version;
    this.active = false;

    this.recovery = recoverySystem;
    this.variants = phaseVariantsSystem;
    this.tables = customRecoveryTablesSystem;
    this.hooks = integrationHooksSystem;
    this.indicators = phaseIndicatorsSystem;
  }

  /**
   * Activate the module
   */
  static async activate() {
    console.log(`Lisa's Angry Initiative v${MODULE_INFO.version} activated`);
  }

  /**
   * Get full API surface
   */
  getAPI() {
    return {
      // Recovery
      getRecoveryDie: (actionType, opts) => this.recovery.getRecoveryDie(actionType, opts),
      getInitiativeDieBySize: (actor) => this.recovery.getInitiativeDieBySize(actor),
      upsizeDie: (die) => this.recovery.upsizeDie(die),
      downsizeDie: (die) => this.recovery.downsizeDie(die),
      applyAdvancedModifiers: (die, combatant, opts) => this.recovery.applyAdvancedModifiers(die, combatant, opts),
      rollRecovery: (combatant, actionType, opts) => this.recovery.rollRecovery(combatant, actionType, opts),
      getHistory: (combatantId, limit) => this.recovery.getHistory(combatantId, limit),
      clearHistory: (combatantId) => this.recovery.clearHistory(combatantId),
      clearAllHistory: () => this.recovery.clearAllHistory(),

      // Phase Variants
      getActiveVariant: () => this.variants.getActiveVariant(),
      setActiveVariant: (variantId) => this.variants.setActiveVariant(variantId),
      getAllVariants: () => this.variants.getAllVariants(),
      createCustomVariant: (variantId, config) => this.variants.createCustomVariant(variantId, config),
      deleteCustomVariant: (variantId) => this.variants.deleteCustomVariant(variantId),
      getPhaseCount: () => this.variants.getPhaseCount(),
      constrainPhase: (phase) => this.variants.constrainPhase(phase),
      constrainRecovery: (rollResult) => this.variants.constrainRecovery(rollResult),

      // Custom Recovery Tables
      createTable: (tableId, config) => this.tables.createTable(tableId, config),
      getRecoveryDieFromTable: (tableId, actionType) => this.tables.getRecoveryDieFromTable(tableId, actionType),
      getAllTables: () => this.tables.getAllTables(),
      deleteTable: (tableId) => this.tables.deleteTable(tableId),
      updateTableRules: (tableId, rules) => this.tables.updateTableRules(tableId, rules),

      // Integration Hooks
      registerHook: (hookId, handler) => this.hooks.registerHook(hookId, handler),
      fireHook: (hookId, context) => this.hooks.fireHook(hookId, context),
      unregisterHook: (hookId, handler) => this.hooks.unregisterHook(hookId, handler),
      getAllHooks: () => this.hooks.getAllHooks(),

      // Phase Indicators
      getTokenIndicator: (tokenId) => this.indicators.getTokenIndicator(tokenId),
      setTokenIndicator: (tokenId, phase) => this.indicators.setTokenIndicator(tokenId, phase),
      removeTokenIndicator: (tokenId) => this.indicators.removeTokenIndicator(tokenId),
      getAllIndicators: () => this.indicators.getAllIndicators(),
      createPhaseDisplayUI: () => this.indicators.createPhaseDisplayUI(),

      // Module info
      getVersion: () => this.version,
      getStatistics: () => ({
        recovery: this.recovery.getStatistics(),
        variants: this.variants.getStatistics(),
        tables: this.tables.getStatistics(),
        hooks: this.hooks.getStatistics(),
        indicators: this.indicators.getStatistics(),
      }),
    };
  }
}

export default new LisasAngryInitiative();
