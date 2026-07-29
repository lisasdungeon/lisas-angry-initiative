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

  getTokenIndicator(tokenId) {
    return this.tokenIndicators.get(tokenId) || null;
  }

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

  removeTokenIndicator(tokenId) {
    this.tokenIndicators.delete(tokenId);
    this._clearTokenVisuals(tokenId);
  }

  getAllIndicators() {
    const all = {};
    for (const [tokenId, indicator] of this.tokenIndicators) {
      all[tokenId] = indicator;
    }
    return all;
  }

  _updateTokenVisuals(tokenId, phase) {
    const token = canvas?.tokens?.get?.(tokenId);
    if (!token?.document) return;

    const phaseData = PHASES[phase];
    if (!phaseData) return;

    token.document.setFlag(MODULE_ID, 'phase', phase);
  }

  _clearTokenVisuals(tokenId) {
    const token = canvas?.tokens?.get?.(tokenId);
    if (!token?.document) return;

    token.document.unsetFlag(MODULE_ID, 'phase');
  }

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
