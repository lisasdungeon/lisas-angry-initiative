/**
 * Lisa's Angry Initiative - Core Class
 * @module lisas-angry-initiative-class
 * @author Lisa's Dungeon
 * @license Proprietary
 */

import { FLAGS, MODULE_INFO, SETTINGS } from "./constants.js";
import { downsizeDie, getInitiativeDieBySize, getRecoveryDie, upsizeDie } from "./dice-utils.js";
import {
    onCombatEnd,
    onCombatStart,
    onCombatUpdate,
    onCombatantUpdate,
    onCreateCombatant
} from "./combat-handlers.js";
import { clearAllFlags, getFlag, setFlag, setPhase } from "./flag-manager.js";
import { promptRecoveryRoll, rollRecovery } from "./recovery.js";
import { registerSettings, onRenderChatMessageAttack, onRenderCombatTracker } from "./ui-handlers.js";
import { format } from "./i18n.js";

export default class LisasAngryInitiative {
    static FLAGS = FLAGS;
    static SETTINGS = SETTINGS;
    static isInitialized = false;

    static activate() {
        if (!this.isInitialized) {
            this.init();
        }
        ui.notifications.info(format("Notifications.ModuleActive", { title: MODULE_INFO.title }));
    }

    static init() {
        if (this.isInitialized) return;

        registerSettings(this);
        this.registerHooks();
        this.registerApi();
        this.isInitialized = true;

        console.log(`Lisa's Angry Initiative | ${MODULE_INFO.title} ready`);
    }

    static registerApi() {
        const module = game.modules.get("lisas-angry-initiative");
        if (!module) return;

        module.api = {
            getRecoveryDie,
            getInitiativeDieBySize,
            upsizeDie,
            downsizeDie,
            getFlag: this.getFlag.bind(this),
            setFlag: this.setFlag.bind(this),
            setPhase: this.setPhase.bind(this),
            rollRecovery: this.rollRecovery.bind(this),
            promptRecoveryRoll: this.promptRecoveryRoll.bind(this),
            resetSettings: this.resetSettings.bind(this),
            cleanup: this.cleanup.bind(this)
        };
    }

    static registerHooks() {
        Hooks.on("createCombat", (...args) => onCombatStart(this, ...args));
        Hooks.on("createCombatant", (...args) => onCreateCombatant(this, ...args));
        Hooks.on("deleteCombat", (...args) => onCombatEnd(this, ...args));
        Hooks.on("updateCombat", (...args) => onCombatUpdate(this, ...args));
        Hooks.on("updateCombatant", (...args) => onCombatantUpdate(this, ...args));
        Hooks.on("renderCombatTracker", (...args) => onRenderCombatTracker(this, ...args));
        Hooks.on("renderChatMessage", (...args) => onRenderChatMessageAttack(this, ...args));
    }

    static getFlag(combatant, flagKey) {
        return getFlag(combatant, flagKey);
    }

    static async setFlag(combatant, flagKey, value) {
        return setFlag(combatant, flagKey, value);
    }

    static async setPhase(combatant, phase, isNext = false) {
        return setPhase(combatant, phase, isNext);
    }

    static async rollRecovery(combatant, actionType, options = {}) {
        return rollRecovery(this, combatant, actionType, options);
    }

    static async promptRecoveryRoll(combatant, lastAction, options = {}) {
        return promptRecoveryRoll(this, combatant, lastAction, options);
    }

    static applyAdvancedModifiers(die, combatant, options = {}) {
        let result = die;

        if (options.bonusAction) {
            result = upsizeDie(result);
        }

        if (options.checkedAttack || options.isCheckedAttack) {
            result = downsizeDie(result);
        }

        if (combatant && options.applyConditions) {
            const conditions = combatant.actor?.statuses || [];
            const CONDITION_MODIFIERS = {
                stunned: { dieAdjustment: -2 },
                paralyzed: { dieAdjustment: -2 },
                exhaustion: { dieAdjustment: -1 },
                prone: { dieAdjustment: 0 },
                restrained: { dieAdjustment: -1 },
                inspired: { dieAdjustment: 1 },
                blessed: { dieAdjustment: 1 },
                haste: { dieAdjustment: 1 }
            };

            for (const condition of conditions) {
                const mod = CONDITION_MODIFIERS[condition];
                if (mod) {
                    for (let i = 0; i < Math.abs(mod.dieAdjustment); i++) {
                        if (mod.dieAdjustment > 0) {
                            result = upsizeDie(result);
                        } else {
                            result = downsizeDie(result);
                        }
                    }
                }
            }
        }

        return result;
    }

    static async resetSettings() {
        const defaults = new Map([
            [SETTINGS.ENABLE_CORE, true],
            [SETTINGS.AUTO_SIZE_INIT_DIE, true],
            [SETTINGS.BLOCK_REACTIONS, true],
            [SETTINGS.KNOCKBACK_THRESHOLD, 0],
            [SETTINGS.SHOW_PHASE_VISUALS, true]
        ]);

        for (const [key, value] of defaults.entries()) {
            await game.settings.set("lisas-angry-initiative", key, value);
        }

        ui.notifications.info(format("Notifications.SettingsReset", { title: MODULE_INFO.title }));
    }

    static async cleanup() {
        if (!game.combat) return;

        for (const combatant of game.combat.combatants) {
            await clearAllFlags(combatant);
        }

        ui.notifications.info(format("Notifications.CleanupComplete", { title: MODULE_INFO.title }));
    }
}
