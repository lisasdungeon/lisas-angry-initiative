/**
 * Lisa's Angry Initiative - Recovery System
 * @module recovery
 * @author Lisa's Dungeon
 * @license Proprietary
 */

import { RECOVERY_DICE, SIZE_TO_DIE, ACTION_TYPES, CONDITION_MODIFIERS } from './constants.js';

export class RecoverySystem {
  constructor() {
    this.historyMap = new Map();
  }

  /**
   * Get recovery die for an action type
   */
  getRecoveryDie(actionType, options = {}) {
    const action = ACTION_TYPES[actionType];
    if (!action) return 'd6';

    let die = action.die;

    if (die === 'weapon' && options.weapon) {
      die = this._extractDieFromFormula(options.weapon.system?.damage?.parts?.[0]?.[0]);
    } else if (die === 'size' && options.actor) {
      die = SIZE_TO_DIE[options.actor.system?.traits?.size] || 'd8';
    }

    return die;
  }

  /**
   * Get initiative die by creature size
   */
  getInitiativeDieBySize(actor) {
    const size = actor?.system?.traits?.size || 'medium';
    return SIZE_TO_DIE[size] || 'd8';
  }

  /**
   * Upsize recovery die (d4 → d6 → d8 → d10 → d12)
   */
  upsizeDie(die) {
    const idx = RECOVERY_DICE.indexOf(die);
    return idx < RECOVERY_DICE.length - 1 ? RECOVERY_DICE[idx + 1] : die;
  }

  /**
   * Downsize recovery die (d12 → d10 → d8 → d6 → d4)
   */
  downsizeDie(die) {
    const idx = RECOVERY_DICE.indexOf(die);
    return idx > 0 ? RECOVERY_DICE[idx - 1] : die;
  }

  /**
   * Apply advanced modifiers to recovery die
   */
  applyAdvancedModifiers(die, combatant, options = {}) {
    let result = die;

    if (options.bonusAction) {
      result = this.upsizeDie(result);
    }

    if (options.checkedAttack) {
      result = this.downsizeDie(result);
    }

    if (combatant && options.applyConditions) {
      const conditions = combatant.actor?.statuses || [];
      for (const condition of conditions) {
        const mod = CONDITION_MODIFIERS[condition];
        if (mod) {
          for (let i = 0; i < Math.abs(mod.dieAdjustment); i++) {
            if (mod.dieAdjustment > 0) {
              result = this.upsizeDie(result);
            } else {
              result = this.downsizeDie(result);
            }
          }
        }
      }
    }

    return result;
  }

  /**
   * Roll recovery and return result
   */
  async rollRecovery(combatant, actionType, options = {}) {
    if (!combatant) return null;

    let die = this.getRecoveryDie(actionType, { actor: combatant.actor, weapon: options.weapon });
    die = this.applyAdvancedModifiers(die, combatant, options);

    const roll = await new Roll(`1${die}`).evaluate({ async: true });
    const result = roll.total;
    const phase = Math.max(1, Math.min(10, result));

    const recovery = {
      combatantId: combatant.id,
      combatantName: combatant.name,
      actionType,
      die,
      rollResult: result,
      nextPhase: phase,
      timestamp: Date.now(),
      conditions: combatant.actor?.statuses || [],
      modifiers: options,
    };

    this._recordHistory(combatant.id, recovery);

    return recovery;
  }

  /**
   * Get recovery history for a combatant
   */
  getHistory(combatantId, limit = 10) {
    const history = this.historyMap.get(combatantId) || [];
    return history.slice(-limit);
  }

  /**
   * Clear history for a combatant
   */
  clearHistory(combatantId) {
    this.historyMap.delete(combatantId);
  }

  /**
   * Clear all history
   */
  clearAllHistory() {
    this.historyMap.clear();
  }

  _recordHistory(combatantId, recovery) {
    if (!this.historyMap.has(combatantId)) {
      this.historyMap.set(combatantId, []);
    }
    const history = this.historyMap.get(combatantId);
    history.push(recovery);

    const maxHistory = 100;
    if (history.length > maxHistory) {
      history.shift();
    }
  }

  _extractDieFromFormula(formula) {
    if (!formula) return 'd6';
    const match = formula.match(/d(\d+)/);
    return match ? `d${match[1]}` : 'd6';
  }

  getStatistics() {
    return {
      totalCombatants: this.historyMap.size,
      totalRecoveries: Array.from(this.historyMap.values()).reduce((sum, h) => sum + h.length, 0),
    };
  }
}

export const recoverySystem = new RecoverySystem();
