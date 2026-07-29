/**
 * Lisa's Angry Initiative - Dice Utilities
 * @module dice-utils
 * @author Lisa's Dungeon
 * @license MIT
 */

import { RECOVERY_DICE, SIZE_TO_DIE, ACTION_TYPES } from './constants.js';

// ACTION_TYPES uses camelCase keys (bonusAction, spellUpcast) but every caller
// normalizes actionType to lowercase before lookup (the recovery dialog's own
// option values include "bonusAction"), so a case-sensitive lookup here would
// never match — build a lowercase-keyed index once instead.
const ACTION_TYPES_BY_LOWER_KEY = Object.fromEntries(
    Object.entries(ACTION_TYPES).map(([key, value]) => [key.toLowerCase(), value])
);

export function getInitiativeDieBySize(actor) {
    const size = actor?.system?.traits?.size || 'medium';
    return SIZE_TO_DIE[size] || 'd8';
}

export function upsizeDie(currentDie) {
    const index = RECOVERY_DICE.indexOf(currentDie);
    if (index === -1 || index >= RECOVERY_DICE.length - 1) {
        return currentDie;
    }
    return RECOVERY_DICE[index + 1];
}

export function downsizeDie(currentDie) {
    const index = RECOVERY_DICE.indexOf(currentDie);
    if (index === -1 || index <= 0) {
        return 'd4';
    }
    return RECOVERY_DICE[index - 1];
}

export function getActorWeaponDamageDie(actor) {
    if (!actor?.items) {
        return 'd6';
    }
    const weapon = actor.items.find((item) => item.type === 'weapon' && item.system?.equipped)
        || actor.items.find((item) => item.type === 'weapon');

    if (!weapon?.system?.damage?.parts || weapon.system.damage.parts.length === 0) {
        return 'd6';
    }

    const damageFormula = weapon.system.damage.parts[0][0];
    const match = damageFormula.match(/(?:(\d+))?d(\d+)/i);
    if (!match) {
        return 'd6';
    }

    const count = parseInt(match[1]) || 1;
    let die = `d${match[2]}`;
    if (count >= 2) {
        die = upsizeDie(die);
    }
    return die;
}

export function getRecoveryDie(actionType, options = {}) {
    const type = (actionType || '').toLowerCase();
    const action = ACTION_TYPES_BY_LOWER_KEY[type];

    if (!action) return { die: 'd6', fixedPhase: null };

    let die = action.die;
    let fixedPhase = null;

    if (die === 'weapon' && options.baseDamageDie) {
        die = options.baseDamageDie;
    } else if (die === 'weapon') {
        die = 'd6';
    } else if (die === 'size' && options.initiativeDie) {
        die = options.initiativeDie;
    } else if (die === 'size') {
        die = 'd8';
    } else if (die === '+1') {
        fixedPhase = 1;
        die = options.initiativeDie || 'd6';
    }

    if (options.isCheckedAttack && die !== '+1') {
        die = downsizeDie(die);
    }
    if (options.hasBonusAction && die !== '+1') {
        die = upsizeDie(die);
    }

    return { die, fixedPhase };
}
