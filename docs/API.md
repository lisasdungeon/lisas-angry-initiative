# Lisa's Angry Initiative v2.0.0 — API Reference

Complete API documentation for module integration and scripting.

## Access the API

```javascript
// In Foundry console or macros:
const api = game.modules.get('lisas-angry-initiative').api;

// Or globally:
const api = window.LisasAngryInitiative;
```

---

## Recovery Methods

### `getRecoveryDie(actionType, options)`

Get the recovery die for an action type.

**Parameters:**
- `actionType` (string) — Action type key (attack, cantrip, spell, spellUpcast, action, bonusAction, reaction, movement)
- `options` (object) — Optional context
  - `actor` (Actor) — Actor for size-based die lookup
  - `weapon` (Item) — Weapon for damage die extraction

**Returns:** (string) Recovery die (d4, d6, d8, d10, d12)

**Example:**
```javascript
const die = api.getRecoveryDie('attack', { weapon: token.actor.items.find(i => i.type === 'weapon') });
console.log(die); // 'd8' (from weapon damage)
```

---

### `getInitiativeDieBySize(actor)`

Get the initiative die based on creature size.

**Parameters:**
- `actor` (Actor) — The actor to query

**Returns:** (string) Initiative die (d4 for tiny, d12 for gargantuan)

**Example:**
```javascript
const die = api.getInitiativeDieBySize(token.actor);
console.log(die); // 'd8' for medium creature
```

---

### `upsizeDie(die)`

Advance a die to the next size (d4 → d6 → d8 → d10 → d12).

**Parameters:**
- `die` (string) — Current die

**Returns:** (string) Larger die

**Example:**
```javascript
api.upsizeDie('d6'); // Returns 'd8'
api.upsizeDie('d12'); // Returns 'd12' (capped)
```

---

### `downsizeDie(die)`

Reduce a die to the previous size (d12 → d10 → d8 → d6 → d4).

**Parameters:**
- `die` (string) — Current die

**Returns:** (string) Smaller die

**Example:**
```javascript
api.downsizeDie('d8'); // Returns 'd6'
api.downsizeDie('d4'); // Returns 'd4' (capped)
```

---

### `applyAdvancedModifiers(die, combatant, options)`

Apply advanced modifiers to a recovery die based on conditions and actions.

**Parameters:**
- `die` (string) — Current recovery die
- `combatant` (Combatant) — Combat combatant
- `options` (object) — Modifier options
  - `bonusAction` (boolean) — Apply bonus action upsizing
  - `checkedAttack` (boolean) — Apply checked attack downsizing
  - `applyConditions` (boolean) — Apply condition-based modifiers

**Returns:** (string) Modified die

**Example:**
```javascript
const modified = api.applyAdvancedModifiers('d6', combatant, {
  bonusAction: true,
  applyConditions: true
});
console.log(modified); // 'd8' (upsized for bonus action)
```

---

### `rollRecovery(combatant, actionType, options)`

Roll recovery and return the result.

**Parameters:**
- `combatant` (Combatant) — Combat combatant
- `actionType` (string) — Action type key
- `options` (object) — Optional modifiers

**Returns:** (Promise<object>) Recovery result with phase

**Example:**
```javascript
const result = await api.rollRecovery(combatant, 'attack', {
  bonusAction: true,
  applyConditions: true
});
console.log(result.nextPhase); // 3
console.log(result.die); // 'd8'
```

---

### `getHistory(combatantId, limit)`

Get recovery history for a combatant.

**Parameters:**
- `combatantId` (string) — Combatant ID
- `limit` (number) — Max entries to return (default 10)

**Returns:** (array) Recovery history entries

**Example:**
```javascript
const history = api.getHistory(combatant.id, 5);
history.forEach(entry => {
  console.log(`${entry.combatantName}: ${entry.actionType} → Phase ${entry.nextPhase}`);
});
```

---

### `clearHistory(combatantId)`

Clear history for a specific combatant.

**Parameters:**
- `combatantId` (string) — Combatant ID

---

### `clearAllHistory()`

Clear all recovery history.

---

## Phase Variant Methods

### `getActiveVariant()`

Get the currently active phase variant.

**Returns:** (object) Variant config

**Example:**
```javascript
const variant = api.getActiveVariant();
console.log(variant.name); // "Standard Recovery Time Initiative"
console.log(variant.phases); // 10
```

---

### `setActiveVariant(variantId)`

Set the active phase variant.

**Parameters:**
- `variantId` (string) — Variant ID (standard, gritty, heroic, or custom)

**Returns:** (boolean) Success

---

### `getAllVariants()`

Get all available variants (built-in + custom).

**Returns:** (object) Map of variants

---

### `createCustomVariant(variantId, config)`

Create a custom phase variant.

**Parameters:**
- `variantId` (string) — Unique variant ID
- `config` (object)
  - `name` (string) — Variant name
  - `description` (string) — Description
  - `phases` (number) — Phase count (1-20)
  - `minRecovery` (number) — Minimum recovery roll
  - `maxRecovery` (number) — Maximum recovery roll

**Returns:** (object) Created variant

**Example:**
```javascript
api.createCustomVariant('mythic', {
  name: 'Mythic Variant',
  description: 'Epic combat with more phases',
  phases: 15,
  minRecovery: 1,
  maxRecovery: 15
});
api.setActiveVariant('mythic');
```

---

### `deleteCustomVariant(variantId)`

Delete a custom variant.

**Parameters:**
- `variantId` (string) — Custom variant ID

**Returns:** (boolean) Success (returns false if trying to delete built-in)

---

### `getPhaseCount()`

Get the phase count for the active variant.

**Returns:** (number) Phase count

---

### `constrainPhase(phase)`

Ensure a phase is within variant bounds.

**Parameters:**
- `phase` (number) — Phase to constrain

**Returns:** (number) Constrained phase (1 to maxPhases)

---

### `constrainRecovery(rollResult)`

Ensure a recovery roll is within variant bounds.

**Parameters:**
- `rollResult` (number) — Roll result to constrain

**Returns:** (number) Constrained value

---

## Custom Recovery Table Methods

### `createTable(tableId, config)`

Create a custom recovery table.

**Parameters:**
- `tableId` (string) — Unique table ID
- `config` (object)
  - `name` (string) — Table name
  - `description` (string) — Description
  - `rules` (object) — Recovery rules per action type

**Returns:** (object) Created table

**Example:**
```javascript
api.createTable('rogue-rules', {
  name: 'Rogue Special Rules',
  description: 'Custom recovery for rogue actions',
  rules: {
    attack: { die: 'd6' },
    sneak: { die: 'd4' },
    dodge: { die: '+1' }
  }
});
```

---

### `getRecoveryDieFromTable(tableId, actionType)`

Get recovery die from a custom table.

**Parameters:**
- `tableId` (string) — Table ID
- `actionType` (string) — Action type

**Returns:** (string) Recovery die or null

---

### `getAllTables()`

Get all custom recovery tables.

**Returns:** (object) Map of tables

---

### `deleteTable(tableId)`

Delete a custom table.

**Parameters:**
- `tableId` (string) — Table ID

**Returns:** (boolean) Success

---

### `updateTableRules(tableId, rules)`

Update rules in a custom table.

**Parameters:**
- `tableId` (string) — Table ID
- `rules` (object) — Rules to merge

**Returns:** (boolean) Success

---

## Integration Hook Methods

### `registerHook(hookId, handler)`

Register a hook handler.

**Parameters:**
- `hookId` (string) — Hook ID
- `handler` (function) — Handler function receiving context

**Available hooks:**
- `beforePhaseChange` — Before phase updates
- `afterPhaseChange` — After phase updates
- `beforeRecoveryRoll` — Before recovery is rolled
- `afterRecoveryRoll` — After recovery is rolled
- `beforeCombatStart` — Combat starts
- `afterCombatEnd` — Combat ends
- `onConditionApplied` — Condition added
- `onConditionRemoved` — Condition removed

**Example:**
```javascript
api.registerHook('afterRecoveryRoll', (context) => {
  console.log(`${context.combatant.name} rolled recovery: Phase ${context.result.nextPhase}`);
});
```

---

### `fireHook(hookId, context)`

Manually fire a hook.

**Parameters:**
- `hookId` (string) — Hook ID
- `context` (object) — Context data

---

### `unregisterHook(hookId, handler)`

Unregister a specific hook handler.

**Parameters:**
- `hookId` (string) — Hook ID
- `handler` (function) — Handler to remove

---

### `getAllHooks()`

Get all registered hooks and handler counts.

**Returns:** (object) Hook counts

---

## Phase Indicator Methods

### `getTokenIndicator(tokenId)`

Get phase indicator for a token.

**Parameters:**
- `tokenId` (string) — Token ID

**Returns:** (object) Indicator data or null

---

### `setTokenIndicator(tokenId, phase)`

Set phase indicator for a token.

**Parameters:**
- `tokenId` (string) — Token ID
- `phase` (number) — Phase (1-10 or variant max)

**Returns:** (boolean) Success

---

### `removeTokenIndicator(tokenId)`

Remove phase indicator from a token.

**Parameters:**
- `tokenId` (string) — Token ID

---

### `getAllIndicators()`

Get all active phase indicators.

**Returns:** (object) Map of token indicators

---

### `createPhaseDisplayUI()`

Get HTML for phase display UI.

**Returns:** (string) HTML markup

---

## Module Info

### `getVersion()`

Get module version.

**Returns:** (string) Version (e.g., "2.0.0")

---

### `getStatistics()`

Get comprehensive statistics.

**Returns:** (object) Stats object

**Example:**
```javascript
const stats = api.getStatistics();
console.log(stats.recovery.totalCombatants);
console.log(stats.variants.activeVariant);
console.log(stats.hooks.totalHandlers);
```

---

## Complete Example: Custom Combat Macro

```javascript
const api = game.modules.get('lisas-angry-initiative').api;

// Set up custom variant
api.createCustomVariant('boss-battle', {
  name: 'Boss Battle Variant',
  phases: 12,
  minRecovery: 1,
  maxRecovery: 12
});
api.setActiveVariant('boss-battle');

// Register post-recovery hook
api.registerHook('afterRecoveryRoll', async (context) => {
  const combatant = game.combat.combatants.get(context.combatantId);
  console.log(`${combatant.name} → Phase ${context.result.nextPhase}`);
  
  // Update visual indicator
  api.setTokenIndicator(combatant.token.id, context.result.nextPhase);
});

// Roll recovery for active combatant
if (game.combat?.current?.combatantId) {
  const combatant = game.combat.combatants.get(game.combat.current.combatantId);
  const result = await api.rollRecovery(combatant, 'attack', {
    bonusAction: false,
    applyConditions: true
  });
  
  console.log(`Roll: ${result.rollResult}, Next Phase: ${result.nextPhase}`);
}
```

---

**Lisa's Angry Initiative v2.0.0** — Build your own combat extensions with powerful integration hooks.
