/**
 * Lisa's Angry Initiative - Phase Variants System
 * @module phase-variants
 * @author Lisa's Dungeon
 * @license Proprietary
 */

import { PHASE_VARIANTS } from './constants.js';

export class PhaseVariantsSystem {
  constructor() {
    this.activeVariant = 'standard';
    this.customVariants = new Map();
  }

  /**
   * Get active phase variant
   */
  getActiveVariant() {
    return this.customVariants.get(this.activeVariant) || PHASE_VARIANTS[this.activeVariant];
  }

  /**
   * Set active phase variant
   */
  setActiveVariant(variantId) {
    if (PHASE_VARIANTS[variantId] || this.customVariants.has(variantId)) {
      this.activeVariant = variantId;
      return true;
    }
    return false;
  }

  /**
   * Get all available variants (built-in + custom)
   */
  getAllVariants() {
    const all = { ...PHASE_VARIANTS };
    for (const [id, variant] of this.customVariants) {
      all[id] = variant;
    }
    return all;
  }

  /**
   * Create custom variant
   */
  createCustomVariant(variantId, config) {
    const variant = {
      id: variantId,
      name: config.name || 'Custom Variant',
      description: config.description || '',
      phases: Math.max(1, Math.min(20, config.phases || 10)),
      minRecovery: Math.max(1, config.minRecovery || 1),
      maxRecovery: Math.max(2, config.maxRecovery || 10),
      isCustom: true,
    };

    this.customVariants.set(variantId, variant);
    return variant;
  }

  /**
   * Delete custom variant
   */
  deleteCustomVariant(variantId) {
    if (PHASE_VARIANTS[variantId]) return false;
    if (this.activeVariant === variantId) {
      this.activeVariant = 'standard';
    }
    return this.customVariants.delete(variantId);
  }

  /**
   * Get phase count for active variant
   */
  getPhaseCount() {
    return this.getActiveVariant().phases;
  }

  /**
   * Constrain phase to variant bounds
   */
  constrainPhase(phase) {
    const variant = this.getActiveVariant();
    return Math.max(1, Math.min(variant.phases, phase));
  }

  /**
   * Constrain recovery die roll to variant bounds
   */
  constrainRecovery(rollResult) {
    const variant = this.getActiveVariant();
    return Math.max(variant.minRecovery, Math.min(variant.maxRecovery, rollResult));
  }

  getStatistics() {
    return {
      activeVariant: this.activeVariant,
      builtInVariants: Object.keys(PHASE_VARIANTS).length,
      customVariants: this.customVariants.size,
      totalVariants: Object.keys(PHASE_VARIANTS).length + this.customVariants.size,
    };
  }
}

export const phaseVariantsSystem = new PhaseVariantsSystem();
