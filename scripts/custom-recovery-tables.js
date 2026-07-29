/**
 * Lisa's Angry Initiative - Custom Recovery Tables
 * @module custom-recovery-tables
 * @author Lisa's Dungeon
 * @license MIT
 */

export class CustomRecoveryTablesSystem {
  constructor() {
    this.tables = new Map();
    this._initializeDefaultTables();
  }

  createTable(tableId, config) {
    const table = {
      id: tableId,
      name: config.name || 'Custom Recovery Table',
      description: config.description || '',
      rules: config.rules || {}, // { actionType: { die: 'd6', bonusAction: '+1', checked: '-1' } }
      isDefault: !!config.isDefault,
    };

    this.tables.set(tableId, table);
    return table;
  }

  getRecoveryDieFromTable(tableId, actionType) {
    const table = this.tables.get(tableId);
    if (!table) return null;

    const rule = table.rules[actionType];
    return rule?.die || null;
  }

  getAllTables() {
    const all = {};
    for (const [id, table] of this.tables) {
      all[id] = table;
    }
    return all;
  }

  deleteTable(tableId) {
    return this.tables.delete(tableId);
  }

  updateTableRules(tableId, rules) {
    const table = this.tables.get(tableId);
    if (!table) return false;

    table.rules = { ...table.rules, ...rules };
    return true;
  }

  _initializeDefaultTables() {
    this.createTable('standard-melee', {
      name: 'Standard Melee Recovery',
      description: 'Recovery rules for melee-focused characters',
      rules: {
        attack: { die: 'weapon' },
        bonusAction: { die: '+1' },
        checked: { die: '-1' },
      },
      isDefault: true,
    });

    this.createTable('spellcaster', {
      name: 'Spellcaster Recovery',
      description: 'Recovery rules optimized for spellcasters',
      rules: {
        cantrip: { die: 'd6' },
        spell: { die: 'd8' },
        spellUpcast: { die: 'd10' },
        bonusAction: { die: '+1' },
      },
      isDefault: true,
    });

    this.createTable('archer', {
      name: 'Archer Recovery',
      description: 'Recovery rules for ranged attackers',
      rules: {
        attack: { die: 'd6' },
        bonusAction: { die: '+1' },
        movement: { die: 'size' },
      },
      isDefault: true,
    });
  }

  getStatistics() {
    return {
      totalTables: this.tables.size,
      defaultTables: Array.from(this.tables.values()).filter(t => t.isDefault).length,
    };
  }
}

export const customRecoveryTablesSystem = new CustomRecoveryTablesSystem();
