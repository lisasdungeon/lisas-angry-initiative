/**
 * Lisa's Angry Initiative - Integration Hooks
 * @module integration-hooks
 * @author Lisa's Dungeon
 * @license Proprietary
 */

export class IntegrationHooksSystem {
  constructor() {
    this.hooks = new Map();
    this._registerDefaultHooks();
  }

  /**
   * Register custom hook handler
   */
  registerHook(hookId, handler) {
    if (!this.hooks.has(hookId)) {
      this.hooks.set(hookId, []);
    }
    this.hooks.get(hookId).push(handler);
  }

  /**
   * Fire hook with context
   */
  fireHook(hookId, context = {}) {
    const handlers = this.hooks.get(hookId) || [];
    for (const handler of handlers) {
      try {
        handler(context);
      } catch (error) {
        console.error(`Error in hook ${hookId}:`, error);
      }
    }
  }

  /**
   * Unregister hook handler
   */
  unregisterHook(hookId, handler) {
    const handlers = this.hooks.get(hookId) || [];
    const idx = handlers.indexOf(handler);
    if (idx > -1) handlers.splice(idx, 1);
  }

  /**
   * Get all registered hooks
   */
  getAllHooks() {
    const all = {};
    for (const [id, handlers] of this.hooks) {
      all[id] = handlers.length;
    }
    return all;
  }

  _registerDefaultHooks() {
    // Predefined hooks for common scenarios
    this.hooks.set('beforePhaseChange', []);
    this.hooks.set('afterPhaseChange', []);
    this.hooks.set('beforeRecoveryRoll', []);
    this.hooks.set('afterRecoveryRoll', []);
    this.hooks.set('beforeCombatStart', []);
    this.hooks.set('afterCombatEnd', []);
    this.hooks.set('onConditionApplied', []);
    this.hooks.set('onConditionRemoved', []);
  }

  getStatistics() {
    let totalHandlers = 0;
    for (const handlers of this.hooks.values()) {
      totalHandlers += handlers.length;
    }
    return {
      registeredHooks: this.hooks.size,
      totalHandlers,
    };
  }
}

export const integrationHooksSystem = new IntegrationHooksSystem();
