/**
 * Lisa's Angry Initiative - Recovery Flow
 * @module recovery
 * @author Lisa's Dungeon
 * @license Proprietary
 */

import { FLAGS, SETTINGS } from "./constants.js";
import { getFlag, setFlag } from "./flag-manager.js";
import { getActorWeaponDamageDie, getRecoveryDie } from "./dice-utils.js";
import { format, getRecoveryActionOptions, localize } from "./i18n.js";

function buildRecoveryDialogContent(lastAction, options) {
    return `
        <form class="lisas-angry-init-recovery-form">
            <div class="form-group">
                <label>${localize("Dialogs.ActionType")}</label>
                <select name="actionType" style="width: 100%; margin-bottom: 5px;">
                    ${getRecoveryActionOptions(lastAction)}
                </select>
            </div>
            <div class="form-group">
                <label>${localize("Dialogs.CheckedAttack")}</label>
                <input type="checkbox" name="isCheckedAttack" ${options.isCheckedAttack ? "checked" : ""}>
            </div>
            <div class="form-group">
                <label>${localize("Dialogs.BonusAction")}</label>
                <input type="checkbox" name="hasBonusAction" ${options.hasBonusAction ? "checked" : ""}>
            </div>
            <div class="form-group">
                <label>${localize("Dialogs.ApplyConditions")}</label>
                <input type="checkbox" name="applyConditions" ${options.applyConditions ? "checked" : ""}>
            </div>
        </form>
    `;
}

export async function promptRecoveryRoll(moduleApi, combatant, lastAction, options = {}) {
    if (!combatant?.actor) return null;

    const result = await foundry.applications.api.DialogV2.wait({
        window: { title: format("Dialogs.RecoveryTitle", { name: combatant.name }) },
        content: buildRecoveryDialogContent(lastAction, options),
        buttons: [{
            action: "roll",
            label: localize("Dialogs.RollRecovery"),
            callback: (_event, button) => new FormDataExtended(button.form).object
        }],
        default: "roll",
        close: () => null
    });

    if (!result) return null;

    const actionType = result.actionType || lastAction || "attack";
    const recoveryOptions = {
        ...options,
        isCheckedAttack: !!result.isCheckedAttack,
        hasBonusAction: !!result.hasBonusAction,
        applyConditions: !!result.applyConditions && game.settings.get('lisas-angry-initiative', SETTINGS.BLOCK_REACTIONS),
        baseDamageDie: options.baseDamageDie || getActorWeaponDamageDie(combatant.actor)
    };

    return moduleApi.rollRecovery(combatant, actionType, recoveryOptions);
}

export async function rollRecovery(moduleApi, combatant, actionType, options = {}) {
    if (!combatant || !game.settings.get("lisas-angry-initiative", SETTINGS.ENABLE_CORE)) {
        return null;
    }

    const normalizedAction = (actionType || "").toLowerCase();
    const recoveryOptions = { ...options };

    if (["attack", "weapon-attack", "mwak", "rwak"].includes(normalizedAction)) {
        recoveryOptions.baseDamageDie = recoveryOptions.baseDamageDie || getActorWeaponDamageDie(combatant.actor);
    }

    const recoveryInfo = getRecoveryDie(normalizedAction, recoveryOptions);
    let result = recoveryInfo.fixedPhase;

    if (result === null) {
        let die = recoveryInfo.die;

        const roll = await new Roll(`1${die}`).evaluate();
        result = Math.min(roll.total, 10);
        await roll.toMessage({
            speaker: ChatMessage.getSpeaker({ actor: combatant.actor }),
            flavor: format("Combat.RecoveryRollFlavor", { phase: result })
        });
    } else {
        await ChatMessage.create({
            content: format("Chat.ReadiedAction", { name: combatant.name, phase: result }),
            speaker: ChatMessage.getSpeaker({ actor: combatant.actor })
        });
    }

    await setFlag(combatant, FLAGS.NEXT_PHASE, result);
    await setFlag(combatant, FLAGS.RECOVERING, true);

    if (recoveryOptions.applyImmediately) {
        await setFlag(combatant, FLAGS.CURRENT_PHASE, result);
        await setFlag(combatant, FLAGS.RECOVERING, false);
        await combatant.update({ initiative: (11 - result) * 10 });
    }

    return result;
}
