/**
 * Lisa's Angry Initiative - Phase Indicators
 * @module phase-indicators
 * @author Lisa's Dungeon
 * @license MIT
 */

import { MODULE_ID, PHASES } from './constants.js';

export class PhaseIndicatorsSystem {
  constructor() {
    this.tokenIndicators = new Map();
  }

  /**
   * Get phase indicator for token
   */
  getTokenIndicator(tokenId) {
    return this.tokenIndicators.get(tokenId) || null;
  }

  /**
   * Set phase indicator for token
   */
  setTokenIndicator(tokenId, phase) {
    if (!PHASES[phase]) return false;

    this.tokenIndicators.set(tokenId, {
      tokenId,
      phase,
      phaseData: PHASES[phase],
      updatedAt: Date.now(),
    });

    this._updateTokenVisuals(tokenId, phase);
    return true;
  }

  /**
   * Remove indicator for token
   */
  removeTokenIndicator(tokenId) {
    this.tokenIndicators.delete(tokenId);
    this._clearTokenVisuals(tokenId);
  }

  /**
   * Get all token indicators
   */
  getAllIndicators() {
    const all = {};
    for (const [tokenId, indicator] of this.tokenIndicators) {
      all[tokenId] = indicator;
    }
    return all;
  }

  /**
   * Apply visual indicators to token
   */
  _updateTokenVisuals(tokenId, phase) {
    const token = canvas?.tokens?.get?.(tokenId);
    if (!token?.document) return;

    const phaseData = PHASES[phase];
    if (!phaseData) return;

    token.document.setFlag('lisas-angry-initiative', 'phase', phase);
  }

  /**
   * Clear visual indicators from token
   */
  _clearTokenVisuals(tokenId) {
    const token = canvas?.tokens?.get?.(tokenId);
    if (!token?.document) return;

    token.document.unsetFlag('lisas-angry-initiative', 'phase');
  }

  /**
   * Create phase display UI
   */
  createPhaseDisplayUI() {
    return `
      <div id="ld-angry-init-combat-tracker">
        <h3>Lisa's Angry Initiative - Combat Tracker</h3>
        <div id="ld-combatants-list"></div>
      </div>
    `;
  }

  getStatistics() {
    return {
      tokensWithIndicators: this.tokenIndicators.size,
    };
  }
}

export const phaseIndicatorsSystem = new PhaseIndicatorsSystem();
