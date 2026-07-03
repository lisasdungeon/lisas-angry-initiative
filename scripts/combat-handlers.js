/**
 * RNK™ Angry Init - Combat Handlers
 * Copyright © 2025-2026 The Curator
 * @module combat-handlers
 * @author The Curator
 * @license RNK Proprietary
 */

import { FLAGS, SETTINGS } from "./constants.js";
import { getActorWeaponDamageDie, getInitiativeDieBySize } from "./dice-utils.js";
import { getFlag, setFlag } from "./flag-manager.js";
import { format, localize } from "./i18n.js";

function getCombatantByActorId(actorId) {
    return game.combat?.combatants.find((combatant) => combatant.actor?.id === actorId) ?? null;
}

function getRecoveryOptions(combatant, lastAction, applyImmediately = false) {
    const options = {
        initiativeDie: getFlag(combatant, FLAGS.INITIATIVE_DIE) || getInitiativeDieBySize(combatant.actor),
        applyImmediately
    };

    if (lastAction === "attack") {
        options.baseDamageDie = getActorWeaponDamageDie(combatant.actor);
    }

    return options;
}

function getActionTypeFromItem(item) {
    if (item?.type === "spell") {
        return item.system?.level === 0 ? "cantrip" : "spell";
    }

    const itemName = (item?.name || "").toLowerCase();
    if (itemName.includes("dash")) return "dash";
    if (itemName.includes("disengage")) return "disengage";
    if (itemName.includes("dodge")) return "dodge";
    if (itemName.includes("hide")) return "hide";

    return "item";
}

export async function initializeCombatant(moduleApi, combatant) {
    if (!combatant?.actor) return;

    let initiativeDie = getFlag(combatant, FLAGS.INITIATIVE_DIE);
    if (!initiativeDie) {
        initiativeDie = moduleApi.getInitiativeDieBySize(combatant.actor);
        await setFlag(combatant, FLAGS.INITIATIVE_DIE, initiativeDie);
    }

    const init = combatant.actor.system.attributes?.init || {};
    const bonus = parseInt(init.bonus, 10) || 0;
    const hasAdvantage = !!init.advantage;
    const hasDisadvantage = !!init.disadvantage;

    let formula = initiativeDie;
    if (hasAdvantage && !hasDisadvantage) formula = `2${initiativeDie}kl`;
    if (hasDisadvantage && !hasAdvantage) formula = `2${initiativeDie}kh`;

    const roll = await new Roll(formula).evaluate();
    const phase = Math.max(1, Math.min(roll.total - bonus, 10));

    await roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: combatant.actor }),
        flavor: format("Combat.InitiativeRollFlavor", { phase })
    });

    await setFlag(combatant, FLAGS.CURRENT_PHASE, phase);
    await setFlag(combatant, FLAGS.RECOVERING, false);
    await combatant.update({ initiative: (11 - phase) * 10 });
}

export async function sortCombatantsByPhase(combat) {
    if (!combat?.combatants?.size) return;

    const updates = combat.combatants.map((combatant) => ({
        _id: combatant.id,
        initiative: (11 - (getFlag(combatant, FLAGS.CURRENT_PHASE) || 1)) * 10
    }));

    await combat.updateEmbeddedDocuments("Combatant", updates);
}

export async function onCombatStart(moduleApi, combat) {
    if (!game.user.isGM || !game.settings.get("lisas-angry-initiative", SETTINGS.ENABLE_CORE)) return;

    for (const combatant of combat.combatants) {
        await initializeCombatant(moduleApi, combatant);
    }

    await sortCombatantsByPhase(combat);
}

export async function onCombatEnd() {
    console.log("RNK™ Angry Init | Combat ended");
}

export async function onCombatUpdate(moduleApi, combat, updateData, _options, userId) {
    if (!game.settings.get("lisas-angry-initiative", SETTINGS.ENABLE_CORE)) return;

    if (updateData.started === true && !combat.previous?.started) {
        for (const combatant of combat.combatants) {
            const currentPhase = getFlag(combatant, FLAGS.CURRENT_PHASE);
            if (currentPhase === undefined || currentPhase === null) {
                await initializeCombatant(moduleApi, combatant);
            }
        }
        await sortCombatantsByPhase(combat);
    }

    const roundChanged = Object.prototype.hasOwnProperty.call(updateData, "round");
    if (roundChanged) {
        for (const combatant of combat.combatants) {
            const recovering = getFlag(combatant, FLAGS.RECOVERING);
            const nextPhase = getFlag(combatant, FLAGS.NEXT_PHASE);
            if (recovering && nextPhase !== undefined && nextPhase !== null) {
                await setFlag(combatant, FLAGS.CURRENT_PHASE, nextPhase);
                await setFlag(combatant, FLAGS.RECOVERING, false);
            }
        }
        await sortCombatantsByPhase(combat);
    }

    if (!(Object.prototype.hasOwnProperty.call(updateData, "turn") || roundChanged) || !combat.previous?.combatantId) {
        return;
    }

    const previousCombatant = combat.combatants.get(combat.previous.combatantId);
    if (!previousCombatant || getFlag(previousCombatant, FLAGS.RECOVERING)) {
        return;
    }

    const lastAction = getFlag(previousCombatant, FLAGS.LAST_ACTION) || "attack";
    const recoveryOptions = getRecoveryOptions(previousCombatant, lastAction, roundChanged);
    const isGamemaster = game.user.isGM;
    const isOwner = previousCombatant.isOwner;
    const hasPlayerOwner = previousCombatant.hasPlayerOwner;
    let shouldPrompt = false;

    if (!isGamemaster && isOwner) {
        shouldPrompt = true;
    } else if (isGamemaster) {
        if (!hasPlayerOwner) {
            shouldPrompt = game.user.id === userId;
        } else {
            const activeOwners = game.users.filter((user) => user.active && !user.isGM && previousCombatant.testUserPermission(user, "OWNER"));
            shouldPrompt = activeOwners.length === 0;
        }
    }

    if (!shouldPrompt || getFlag(previousCombatant, FLAGS.PROMPT_LOCK)) {
        return;
    }

    await setFlag(previousCombatant, FLAGS.PROMPT_LOCK, true);
    try {
        await moduleApi.promptRecoveryRoll(previousCombatant, lastAction, recoveryOptions);
    } finally {
        await setFlag(previousCombatant, FLAGS.PROMPT_LOCK, false);
    }
}

export async function onCreateCombatant(moduleApi, combatant) {
    if (!game.user.isGM || !game.settings.get("lisas-angry-initiative", SETTINGS.ENABLE_CORE)) return;

    await initializeCombatant(moduleApi, combatant);
    if (combatant.combat?.started) {
        await sortCombatantsByPhase(combatant.combat);
    }
}

export async function onCombatantUpdate(_moduleApi, combatant, updateData) {
    if (updateData.initiative === undefined) return;

    const newPhase = Math.max(1, Math.min(10, 11 - Math.floor(updateData.initiative / 10)));
    if (getFlag(combatant, FLAGS.CURRENT_PHASE) !== newPhase) {
        await setFlag(combatant, FLAGS.CURRENT_PHASE, newPhase);
    }
}

export async function onRollAttack(_moduleApi, item) {
    if (!game.combat || !game.settings.get("lisas-angry-initiative", SETTINGS.ENABLE_CORE)) return;

    const combatant = getCombatantByActorId(item.actor?.id);
    if (combatant) {
        await setFlag(combatant, FLAGS.LAST_ACTION, "attack");
    }
}

export async function onRollDamage(_moduleApi, item) {
    if (!game.combat || !game.user.isGM || !game.settings.get("lisas-angry-initiative", SETTINGS.ENABLE_CORE)) return;

    const baseDie = item?.type === "weapon"
        ? getActorWeaponDamageDie(item.actor)
        : item?.type === "spell"
            ? (item.system?.level === 0 ? "d6" : "d8")
            : "d6";

    const attackerDieSize = parseInt(baseDie.replace("d", ""), 10) || 6;

    for (const targetToken of game.user.targets) {
        const combatant = game.combat.combatants.find((entry) => entry.token?.id === targetToken.id);
        if (!combatant || combatant.actor?.id === item.actor?.id) continue;

        const currentTurnIndex = game.combat.turn;
        const targetIndex = game.combat.turns.indexOf(combatant);
        if (targetIndex < currentTurnIndex) continue;

        const initiativeDie = getFlag(combatant, FLAGS.INITIATIVE_DIE) || "d6";
        const initiativeDieSize = parseInt(initiativeDie.replace("d", ""), 10) || 6;
        if (attackerDieSize <= initiativeDieSize) continue;

        const currentPhase = getFlag(combatant, FLAGS.CURRENT_PHASE) || 1;
        const nextPhase = currentPhase + 1;

        if (nextPhase <= 10) {
            await setFlag(combatant, FLAGS.CURRENT_PHASE, nextPhase);
            await combatant.update({ initiative: (11 - nextPhase) * 10 });
            await ChatMessage.create({
                content: format("Chat.KnockbackApplied", { name: combatant.name, phase: nextPhase, attackDie: baseDie, initiativeDie }),
                speaker: ChatMessage.getSpeaker({ actor: combatant.actor })
            });
        } else {
            await setFlag(combatant, FLAGS.CURRENT_PHASE, 11);
            await combatant.update({ initiative: -10 });
            await ChatMessage.create({
                content: format("Chat.DelayedCombatant", { name: combatant.name }),
                speaker: ChatMessage.getSpeaker({ actor: combatant.actor })
            });
        }
    }
}

export function onPreUseItem(_moduleApi, item) {
    if (!game.combat || !game.settings.get("lisas-angry-initiative", SETTINGS.ENABLE_CORE) || !game.settings.get("lisas-angry-initiative", SETTINGS.BLOCK_REACTIONS)) {
        return true;
    }

    const combatant = getCombatantByActorId(item.actor?.id);
    if (!combatant) return true;

    const activationType = (item.system?.activation?.type || "").toLowerCase();
    if (!activationType.includes("reaction")) {
        return true;
    }

    const currentCombatant = game.combat.combatant;
    const myPhase = getFlag(combatant, FLAGS.CURRENT_PHASE) || 1;
    const currentPhase = getFlag(currentCombatant, FLAGS.CURRENT_PHASE) || 1;

    if (currentCombatant && currentPhase < myPhase) {
        ui.notifications.warn(format("Notifications.ReactionBlocked", { phase: myPhase }));
        return false;
    }

    return true;
}

export async function onUseItem(_moduleApi, item) {
    if (!game.combat || !game.settings.get("lisas-angry-initiative", SETTINGS.ENABLE_CORE)) return;

    const combatant = getCombatantByActorId(item.actor?.id);
    if (combatant) {
        await setFlag(combatant, FLAGS.LAST_ACTION, getActionTypeFromItem(item));
    }
}

export async function onPreUpdateToken() {
    return undefined;
}

export function onPreRollInitiative(moduleApi, actor, rollData) {
    if (!game.settings.get("lisas-angry-initiative", SETTINGS.ENABLE_CORE) || !game.settings.get("lisas-angry-initiative", SETTINGS.AUTO_SIZE_INIT_DIE)) {
        return;
    }

    const initiativeDie = getInitiativeDieBySize(actor);
    const init = actor.system.attributes?.init || {};
    let formula = initiativeDie;

    if (init.advantage && !init.disadvantage) formula = `2${initiativeDie}kl`;
    if (init.disadvantage && !init.advantage) formula = `2${initiativeDie}kh`;

    rollData.formula = formula;
    rollData.parts = [];
    rollData.rollMode = "publicroll";

    const combatant = getCombatantByActorId(actor.id);
    if (combatant) {
        void setFlag(combatant, FLAGS.INITIATIVE_DIE, initiativeDie);
    }

    return true;
}

export async function onRollInitiative(_moduleApi, actor, roll) {
    if (!game.settings.get("lisas-angry-initiative", SETTINGS.ENABLE_CORE)) return;

    const combatant = getCombatantByActorId(actor.id);
    if (!combatant) return;

    const bonus = parseInt(actor.system.attributes?.init?.bonus, 10) || 0;
    const phase = Math.max(1, Math.min(roll.total - bonus, 10));

    await setFlag(combatant, FLAGS.CURRENT_PHASE, phase);
    await setFlag(combatant, FLAGS.RECOVERING, false);
    await combatant.update({ initiative: (11 - phase) * 10 });

    console.log(format("Logs.PhaseApplied", { name: combatant.name, phase, total: roll.total, bonus }));
}
