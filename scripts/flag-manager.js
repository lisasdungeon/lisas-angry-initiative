/**
 * Lisa's Angry Initiative - Flag Management
 * @module flag-manager
 * @author Lisa's Dungeon
 * @license MIT
 */

import { FLAGS, MODULE_ID, SETTINGS } from './constants.js';
import { integrationHooksSystem } from './integration-hooks.js';
import { phaseIndicatorsSystem } from './phase-indicators.js';

/**
 * Every current-phase write funnels through setFlag(), so this file is the single
 * choke point that drives the integration-hook bus and the token phase indicators.
 */
function phaseVisualsEnabled() {
    try {
        return game.settings.get(MODULE_ID, SETTINGS.SHOW_PHASE_VISUALS) !== false;
    } catch (err) {
        return false;
    }
}

function getCombatantTokenId(combatant) {
    return combatant?.token?.id ?? combatant?.tokenId ?? null;
}

function announcePhaseChange(combatant, phase, previousPhase) {
    integrationHooksSystem.fireHook('afterPhaseChange', {
        combatant,
        combatantId: combatant?.id ?? null,
        phase,
        previousPhase
    });

    if (!phaseVisualsEnabled()) return;

    let mayWrite = false;
    try {
        mayWrite = !!(game.user?.isGM || combatant?.isOwner);
    } catch (err) {
        mayWrite = false;
    }

    const tokenId = getCombatantTokenId(combatant);
    if (tokenId && mayWrite) {
        phaseIndicatorsSystem.setTokenIndicator(tokenId, phase);
    }
}

export async function setFlag(combatant, flagKey, value) {
    if (!combatant) return;

    const isPhaseChange = flagKey === FLAGS.CURRENT_PHASE;
    let previousPhase = null;

    if (isPhaseChange) {
        previousPhase = getFlag(combatant, FLAGS.CURRENT_PHASE) ?? null;
        integrationHooksSystem.fireHook('beforePhaseChange', {
            combatant,
            combatantId: combatant?.id ?? null,
            phase: value,
            previousPhase
        });
    }

    try {
        const result = await combatant.setFlag(MODULE_ID, flagKey, value);
        if (isPhaseChange) announcePhaseChange(combatant, value, previousPhase);
        return result;
    } catch (err) {
        console.error(`Lisa's Angry Initiative | Failed to set flag ${flagKey}:`, err);
        return undefined;
    }
}

export function getFlag(combatant, flagKey) {
    if (!combatant) return null;
    try {
        return combatant.getFlag(MODULE_ID, flagKey);
    } catch (err) {
        console.error(`Lisa's Angry Initiative | Failed to get flag ${flagKey}:`, err);
        return null;
    }
}

export async function setPhase(combatant, phase, isNext = false) {
    if (isNext) {
        await setFlag(combatant, FLAGS.NEXT_PHASE, phase);
        await setFlag(combatant, FLAGS.RECOVERING, true);
    } else {
        await setFlag(combatant, FLAGS.CURRENT_PHASE, phase);
    }
}

export async function clearAllFlags(combatant) {
    if (!combatant) return;
    for (const flagKey of Object.values(FLAGS)) {
        try {
            await combatant.unsetFlag(MODULE_ID, flagKey);
        } catch (err) {
            // Flag was never set on this combatant; nothing to remove.
        }
    }

    const tokenId = getCombatantTokenId(combatant);
    if (tokenId) phaseIndicatorsSystem.removeTokenIndicator(tokenId);
}
