/**
 * Lisa's Angry Initiative - Localization Helpers
 * @module i18n
 * @author Lisa's Dungeon
 * @license MIT
 */

const ROOT_KEY = "LISAS_ANGRY_INIT";

function buildKey(path) {
    return `${ROOT_KEY}.${path}`;
}

export function localize(path) {
    const key = buildKey(path);
    return game?.i18n?.localize?.(key) ?? key;
}

export function format(path, data = {}) {
    const key = buildKey(path);
    return game?.i18n?.format?.(key, data) ?? key;
}

export function getActionLabel(actionType) {
    const map = {
        attack: "Actions.Attack",
        cantrip: "Actions.Cantrip",
        spell: "Actions.Spell",
        action: "Actions.Action",
        bonusAction: "Actions.BonusAction",
        reaction: "Actions.Reaction",
        movement: "Actions.Movement"
    };
    return localize(map[actionType] ?? "Actions.Attack");
}

export function getRecoveryActionOptions(selectedAction = "attack") {
    const actions = ["attack", "cantrip", "spell", "action", "bonusAction", "reaction", "movement"];
    return actions.map((action) => {
        const selected = action === selectedAction ? " selected" : "";
        return `<option value="${action}"${selected}>${getActionLabel(action)}</option>`;
    }).join("");
}
