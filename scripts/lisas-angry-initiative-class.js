/**
 * Lisa's Angry Initiative - Core Class
 * @module lisas-angry-initiative-class
 * @author Lisa's Dungeon
 * @license MIT
 */

import { CONDITION_MODIFIERS, FLAGS, MODULE_INFO, SETTINGS } from "./constants.js";
import { downsizeDie, getInitiativeDieBySize, getRecoveryDie, upsizeDie } from "./dice-utils.js";
import {
    onCombatEnd,
    onCombatStart,
    onCombatUpdate,
    onCombatantUpdate,
    onCreateCombatant,
    onPreRollInitiative,
    onPreUseItem,
    onRollAttack,
    onRollDamage,
    onRollInitiative,
    onUseItem
} from "./combat-handlers.js";
import { clearAllFlags, getFlag, setFlag, setPhase } from "./flag-manager.js";
import { promptRecoveryRoll, rollRecovery } from "./recovery.js";
import { registerSettings, onRenderChatMessageAttack, onRenderCombatTracker } from "./ui-handlers.js";
import { format } from "./i18n.js";
import { customRecoveryTablesSystem } from "./custom-recovery-tables.js";
import { integrationHooksSystem } from "./integration-hooks.js";
import { phaseIndicatorsSystem } from "./phase-indicators.js";
import { phaseVariantsSystem } from "./phase-variants.js";
import { recoveryHistorySystem } from "./recovery-history.js";

export default class LisasAngryInitiative {
    static FLAGS = FLAGS;
    static SETTINGS = SETTINGS;
    static isInitialized = false;

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
            // Recovery
            getRecoveryDie,
            getInitiativeDieBySize,
            upsizeDie,
            downsizeDie,
            applyAdvancedModifiers: this.applyAdvancedModifiers.bind(this),
            getFlag: this.getFlag.bind(this),
            setFlag: this.setFlag.bind(this),
            setPhase: this.setPhase.bind(this),
            rollRecovery: this.rollRecovery.bind(this),
            promptRecoveryRoll: this.promptRecoveryRoll.bind(this),
            getHistory: recoveryHistorySystem.getHistory.bind(recoveryHistorySystem),
            clearHistory: recoveryHistorySystem.clearHistory.bind(recoveryHistorySystem),
            clearAllHistory: recoveryHistorySystem.clearAllHistory.bind(recoveryHistorySystem),
            resetSettings: this.resetSettings.bind(this),
            cleanup: this.cleanup.bind(this),

            // Phase variants
            getActiveVariant: phaseVariantsSystem.getActiveVariant.bind(phaseVariantsSystem),
            setActiveVariant: phaseVariantsSystem.setActiveVariant.bind(phaseVariantsSystem),
            getAllVariants: phaseVariantsSystem.getAllVariants.bind(phaseVariantsSystem),
            createCustomVariant: phaseVariantsSystem.createCustomVariant.bind(phaseVariantsSystem),
            deleteCustomVariant: phaseVariantsSystem.deleteCustomVariant.bind(phaseVariantsSystem),
            getPhaseCount: phaseVariantsSystem.getPhaseCount.bind(phaseVariantsSystem),
            constrainPhase: phaseVariantsSystem.constrainPhase.bind(phaseVariantsSystem),
            constrainRecovery: phaseVariantsSystem.constrainRecovery.bind(phaseVariantsSystem),

            // Custom recovery tables
            createTable: customRecoveryTablesSystem.createTable.bind(customRecoveryTablesSystem),
            getRecoveryDieFromTable: customRecoveryTablesSystem.getRecoveryDieFromTable.bind(customRecoveryTablesSystem),
            getAllTables: customRecoveryTablesSystem.getAllTables.bind(customRecoveryTablesSystem),
            deleteTable: customRecoveryTablesSystem.deleteTable.bind(customRecoveryTablesSystem),
            updateTableRules: customRecoveryTablesSystem.updateTableRules.bind(customRecoveryTablesSystem),

            // Integration hooks
            registerHook: integrationHooksSystem.registerHook.bind(integrationHooksSystem),
            fireHook: integrationHooksSystem.fireHook.bind(integrationHooksSystem),
            unregisterHook: integrationHooksSystem.unregisterHook.bind(integrationHooksSystem),
            getAllHooks: integrationHooksSystem.getAllHooks.bind(integrationHooksSystem),

            // Phase indicators
            getTokenIndicator: phaseIndicatorsSystem.getTokenIndicator.bind(phaseIndicatorsSystem),
            setTokenIndicator: phaseIndicatorsSystem.setTokenIndicator.bind(phaseIndicatorsSystem),
            removeTokenIndicator: phaseIndicatorsSystem.removeTokenIndicator.bind(phaseIndicatorsSystem),
            getAllIndicators: phaseIndicatorsSystem.getAllIndicators.bind(phaseIndicatorsSystem),
            createPhaseDisplayUI: phaseIndicatorsSystem.createPhaseDisplayUI.bind(phaseIndicatorsSystem),

            // Module info
            getVersion: this.getVersion.bind(this),
            getStatistics: this.getStatistics.bind(this)
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

        // dnd5e v3.x item-roll hooks. onPreUseItem/onUseItem/onRollAttack/onRollDamage
        // only read `item` (plus, for onPreUseItem, its cancel-by-returning-false
        // contract), so the extra arguments dnd5e passes alongside it are ignored.
        Hooks.on("dnd5e.preUseItem", (...args) => onPreUseItem(this, ...args));
        Hooks.on("dnd5e.useItem", (...args) => onUseItem(this, ...args));
        Hooks.on("dnd5e.rollAttack", (...args) => onRollAttack(this, ...args));
        Hooks.on("dnd5e.rollDamage", (...args) => onRollDamage(this, ...args));
        Hooks.on("dnd5e.preRollInitiative", (...args) => onPreRollInitiative(this, ...args));
        Hooks.on("dnd5e.rollInitiative", (...args) => onRollInitiative(this, ...args));
    }

    static getVersion() {
        return MODULE_INFO.version;
    }

    static getStatistics() {
        return {
            recovery: recoveryHistorySystem.getStatistics(),
            variants: phaseVariantsSystem.getStatistics(),
            tables: customRecoveryTablesSystem.getStatistics(),
            hooks: integrationHooksSystem.getStatistics(),
            indicators: phaseIndicatorsSystem.getStatistics()
        };
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
