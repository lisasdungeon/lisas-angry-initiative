/**
 * RNK™ Angry Init - UI Handlers
 * Copyright © 2025-2026 The Curator
 * @module ui-handlers
 * @author The Curator
 * @license RNK Proprietary
 */

import { FLAGS, SETTINGS } from "./constants.js";
import { getActorWeaponDamageDie, getInitiativeDieBySize } from "./dice-utils.js";
import { getFlag } from "./flag-manager.js";
import { format, localize } from "./i18n.js";

const SETTING_FIELDS = [
    { key: SETTINGS.ENABLE_CORE, type: Boolean, default: true, name: "Settings.EnableCore.Name", hint: "Settings.EnableCore.Hint" },
    { key: SETTINGS.AUTO_SIZE_INIT_DIE, type: Boolean, default: true, name: "Settings.AutoSizeInitDie.Name", hint: "Settings.AutoSizeInitDie.Hint" },
    { key: SETTINGS.BLOCK_REACTIONS, type: Boolean, default: true, name: "Settings.BlockReactionsWhileRecovering.Name", hint: "Settings.BlockReactionsWhileRecovering.Hint" },
    { key: SETTINGS.KNOCKBACK_THRESHOLD, type: Number, default: 0, name: "Settings.KnockbackThreshold.Name", hint: "Settings.KnockbackThreshold.Hint" },
    { key: SETTINGS.SHOW_PHASE_VISUALS, type: Boolean, default: true, name: "Settings.ShowPhaseVisuals.Name", hint: "Settings.ShowPhaseVisuals.Hint" }
];

function getHtmlRoot(html) {
    return html?.jquery ? html : $(html);
}

export function registerSettings(moduleApi) {
    for (const field of SETTING_FIELDS) {
        game.settings.register("lisas-angry-initiative", field.key, {
            name: localize(field.name),
            hint: localize(field.hint),
            scope: "world",
            config: true,
            type: field.type,
            default: field.default,
            onChange: field.key === SETTINGS.ENABLE_CORE ? async (enabled) => {
                if (enabled || !game.user.isGM) return;
                const confirmed = await Dialog.confirm({
                    title: localize("Dialogs.CleanupTitle"),
                    content: `<p>${localize("Dialogs.CleanupPrompt")}</p>`,
                    defaultYes: true
                });
                if (confirmed) {
                    await moduleApi.cleanup();
                }
            } : undefined
        });
    }
}

export function onRenderChatMessageAttack(moduleApi, message, html) {
    if (!game.settings.get("lisas-angry-initiative", SETTINGS.ENABLE_CORE)) return;

    const rollType = message.flags?.dnd5e?.roll?.type || "";
    const flavor = (message.flavor || "").toLowerCase();
    const isAttack = rollType === "attack"
        || flavor.includes("attack")
        || message.rolls?.some((roll) => roll.options?.flavor?.toLowerCase?.().includes("attack"));

    if (!isAttack) return;

    const combatant = game.combat?.combatants.find((entry) => entry.actor?.id === message.speaker?.actor);
    if (!combatant) return;

    const root = getHtmlRoot(html);
    root.find(".rnk-attack-menu").remove();

    const menu = $(`
        <div class="rnk-attack-menu" style="margin-top:4px;display:flex;align-items:center;gap:4px;">
            <label style="font-size:0.85em;white-space:nowrap;">${localize("Dialogs.RecoveryDie")}</label>
            <select class="rnk-rec-die" style="flex:1;">
                <option value="d4">d4</option>
                <option value="d6" selected>d6</option>
                <option value="d8">d8</option>
                <option value="d10">d10</option>
                <option value="d12">d12</option>
            </select>
            <button class="rnk-roll-recovery" type="button" style="white-space:nowrap;">
                <i class="fas fa-dice-d20"></i> ${localize("Dialogs.RollRecovery")}
            </button>
        </div>
    `);

    menu.find(".rnk-roll-recovery").on("click", async () => {
        const die = String(menu.find(".rnk-rec-die").val() || "d6");
        await moduleApi.rollRecovery(combatant, "attack", { baseDamageDie: die });
    });

    root.find(".message-content").append(menu);
}

export function onRenderCombatTracker(moduleApi, tracker, html) {
    if (!game.settings.get("lisas-angry-initiative", SETTINGS.SHOW_PHASE_VISUALS)) return;

    const combatants = getHtmlRoot(html).find(".combatant");
    combatants.each((_index, element) => {
        const combatantId = element.dataset.combatantId;
        const combatant = tracker.viewed?.combatants?.get(combatantId) || game.combat?.combatants.get(combatantId);
        if (!combatant) return;

        let phase = getFlag(combatant, FLAGS.CURRENT_PHASE);
        const recovering = getFlag(combatant, FLAGS.RECOVERING);
        const nextPhase = getFlag(combatant, FLAGS.NEXT_PHASE);

        if (!phase && combatant.initiative !== null && combatant.initiative !== undefined) {
            phase = Math.max(1, Math.min(10, 11 - Math.floor(combatant.initiative / 10)));
        }

        const initiativeElement = element.querySelector(".token-initiative") || element.querySelector(".combatant-initiative");
        if (initiativeElement && phase) {
            const label = recovering && nextPhase
                ? format("Combat.TrackerPhaseRecovering", { phase, nextPhase })
                : format("Combat.TrackerPhase", { phase });

            const span = document.createElement("span");
            span.className = `initiative phase-display phase-${phase}`;
            span.textContent = label;
            initiativeElement.replaceChildren(span);
        }

        const controls = element.querySelector(".combatant-controls");
        if (!controls || element.querySelector(".recovery-roll-btn") || (!game.user.isGM && !combatant.isOwner)) {
            return;
        }

        const button = document.createElement("a");
        button.className = "combatant-control recovery-roll-btn";
        button.innerHTML = '<i class="fas fa-dice-d20"></i>';
        button.title = localize("Dialogs.RollRecovery");
        button.addEventListener("click", async (event) => {
            event.preventDefault();
            event.stopPropagation();

            const lastAction = getFlag(combatant, FLAGS.LAST_ACTION) || "attack";
            const options = {
                initiativeDie: getFlag(combatant, FLAGS.INITIATIVE_DIE) || getInitiativeDieBySize(combatant.actor)
            };

            if (lastAction === "attack") {
                options.baseDamageDie = getActorWeaponDamageDie(combatant.actor);
            }

            await moduleApi.promptRecoveryRoll(combatant, lastAction, options);
        });

        controls.insertBefore(button, controls.firstChild);
    });
}
