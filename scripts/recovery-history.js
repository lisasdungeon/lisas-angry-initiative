/**
 * Lisa's Angry Initiative - Recovery History
 * @module recovery-history
 * @author Lisa's Dungeon
 * @license MIT
 */

import { HISTORY_LIMIT } from './constants.js';

export class RecoveryHistorySystem {
  constructor(limit = HISTORY_LIMIT) {
    this.limit = limit;
    this.entries = new Map();
  }

  /**
   * Record a completed recovery roll.
   * @param {object} entry Recovery data (combatantId is required).
   * @returns {object|null} The stored entry, or null when it cannot be keyed.
   */
  record(entry = {}) {
    const combatantId = entry.combatantId;
    if (!combatantId) return null;

    const stored = {
      combatantId,
      combatantName: entry.combatantName ?? '',
      actionType: entry.actionType ?? 'attack',
      die: entry.die ?? null,
      rollResult: entry.rollResult ?? null,
      nextPhase: entry.nextPhase ?? null,
      conditions: Array.isArray(entry.conditions) ? [...entry.conditions] : [],
      timestamp: entry.timestamp ?? Date.now(),
    };

    const log = this.entries.get(combatantId) ?? [];
    log.unshift(stored);
    if (log.length > this.limit) log.length = this.limit;
    this.entries.set(combatantId, log);

    return stored;
  }

  /**
   * Read back recovery history, newest first.
   * @param {string} combatantId Combatant id.
   * @param {number} limit Maximum entries to return.
   * @returns {object[]} History entries (always a new array).
   */
  getHistory(combatantId, limit = 10) {
    const log = this.entries.get(combatantId) ?? [];
    const count = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : log.length;
    return log.slice(0, count);
  }

  /**
   * Drop history for one combatant.
   * @param {string} combatantId Combatant id.
   * @returns {boolean} True when an entry list was removed.
   */
  clearHistory(combatantId) {
    return this.entries.delete(combatantId);
  }

  /** Drop history for every combatant. */
  clearAllHistory() {
    this.entries.clear();
  }

  getStatistics() {
    let totalEntries = 0;
    for (const log of this.entries.values()) totalEntries += log.length;
    return {
      totalCombatants: this.entries.size,
      totalEntries,
      limit: this.limit,
    };
  }
}

export const recoveryHistorySystem = new RecoveryHistorySystem();
