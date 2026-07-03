# Lisa's Angry Initiative v2.0.0 — GM Guide

Complete guide to running Recovery Time Initiative combat at your table.

## What is Recovery Time Initiative?

Recovery Time Initiative (RTI) is a phase-based combat system that answers a key question: **"When do you act again?"**

Instead of a static turn order, each combatant begins in a phase (1-10) based on their initiative die. When a combatant acts, they roll their recovery die to determine which phase they'll act again in the current round.

This creates:
- **Tactical depth** — Faster characters keep pace; slower characters spread out their actions
- **Dynamic positioning** — Who acts when affects positioning and spell setup
- **Action weight** — Every action has a recovery cost in real time

---

## Core Mechanic

### Phase Assignment

At combat start, each combatant rolls their **initiative die** (based on size):
- Tiny (d4) — Gnome, halfling
- Small (d6) — Goblin, child
- Medium (d8) — Human, elf, orc
- Large (d10) — Ogre, giant
- Huge+ (d12) — Dragon, titan

Roll the die: that's your starting phase.

**Example:** Five combatants:
- PC Fighter (medium): rolls 5 → Phase 5
- PC Rogue (small): rolls 2 → Phase 2
- PC Wizard (medium): rolls 6 → Phase 6
- Goblin (small): rolls 1 → Phase 1
- Ogre (large): rolls 7 → Phase 7

### Round Flow

Each round progresses **Phase 1 → Phase 10**, then repeats. Combatants act when their phase comes up.

**Phase 1:** Goblin acts
**Phase 2:** Rogue acts
**Phase 5:** Fighter acts
**Phase 6:** Wizard acts
**Phase 7:** Ogre acts
**Phase 10:** (no one)
**Round continues:** Phase 1 again...

### Recovery Roll

When a combatant acts, they immediately roll their **recovery die** to determine when they act next.

**Recovery die varies by action:**
- **Attack:** Weapon's damage die (longsword d8 → roll d8)
- **Cantrip:** d6
- **Leveled spell:** d8 (or d10 if upcast)
- **Dash/Dodge/Hide:** Initiative die (size-based)
- **Ready action:** Phase 1 (next round if you don't use it)

The roll result is the combatant's **next phase**.

**Example:**
- Rogue (Phase 2) attacks with dagger (d4). Rolls 3 → Phase 3
- Fighter (Phase 5) swings longsword (d8). Rolls 6 → Phase 6
- Wizard (Phase 6) casts Fireball (d8). Rolls 2 → Phase 2

---

## Advanced Modifiers

### Bonus Actions

Using a bonus action **upsizes** the recovery die by one step:

d4 → d6 → d8 → d10 → d12

**Example:**
- Rogue attacks (d4) as action, then bonus action attack. Both rolls upsize to d6.

### Checked Attacks

When an attack is **checked** (miss, parried, dodge failed), the recovery die **downsizes** by one step (minimum d4):

d12 → d10 → d8 → d6 → d4

**Use case:** Attacking a heavily defended opponent costs less recovery if you miss.

### Conditions

**Stunned/Paralyzed:** Downsizes die -2 steps (minimum d4)
**Exhaustion:** Downsizes die -1 step
**Restrained:** Downsizes die -1 step
**Inspired/Blessed/Haste:** Upsizes die +1 step

**Example:** Fighter is stunned (d8 → d6) and inspired (d6 → d8). Net effect: no change.

---

## Phase Variants

### Standard (Phases 1-10)
Traditional RTI. Fast action economy, narrow phase windows.

**Best for:** D&D5e, balanced encounters, standard complexity.

### Gritty (Phases 1-12)
Extended recovery window. More tactical positioning, longer fights.

**Best for:** Large battles, important encounters, groups that enjoy deep tactics.

### Heroic (Phases 1-8)
Compressed phases. Action economy favors faster characters.

**Best for:** Quick combats, one-shots, parties that like high tempo.

### Custom
Create variants with arbitrary phase counts and recovery bounds.

---

## Running Combat

### Setup Phase

1. **Enable RTI** in module settings
2. **Set phase variant** (Standard, Gritty, Heroic, or custom)
3. **Start combat** — each combatant rolls initiative die

### Action Phase

When a combatant's phase arrives:

1. They describe their action
2. They roll the recovery die for that action
3. Their phase advances to the roll result
4. Continue to next phase

### Tracking

Use the **combat tracker** to:
- See current phase
- See each combatant's next phase
- Quick-button recovery rolls
- Review phase history

---

## Common Rulings

### What counts as an action?

**Full actions:**
- Attack (melee, ranged, spell attack)
- Cast a leveled spell
- Dodge, Dash, Disengage, Hide, Ready

**Bonus actions:**
- Bonus action attack (second weapon, Offhand, etc.)
- Action Surge (fighter) — counts as bonus
- Bonus action spells (e.g., Healing Word)

**Free actions (no recovery):**
- Dropping an item
- Speaking
- Bonus movement (within 5 ft)

**Reactions (no recovery, but after you use one you can't react again until your next turn):**
- Opportunity attack
- Shield spell
- Absorb Elements
- Reaction spells

### Delay or Ready?

**Delay:** Combatant waits until a later phase to act. Roll recovery when they finally act.

**Ready:** Combatant prepares an action and rolls recovery **now** (using their initiative die). If they don't use the ready action, they return to Phase 1 next round.

### Spellcasting

- **Cantrips:** d6 recovery
- **1st-3rd level spells:** d8 recovery
- **4th-5th level spells:** d8 recovery
- **6th+ level spells:** d8 recovery (or d10 if casting at higher slot)
- **Upcast spell:** Use d10 recovery instead of d8

### Multi-Attack

Each attack rolls separately:
- Fighter attacks twice with longsword (d8 each): roll d8 for first, d8 for second, take the **higher result** as next phase
- OR roll once for "averaged" attack: roll d10 instead of d8 for the pair

(Table's choice — discuss with your group.)

---

## Homebrew Tables

Use **Custom Recovery Tables** to create campaign-specific rules.

### Example: Bardic Inspiration

Create a table for bard recovery:

```
action: bardic-inspiration
die: d6
bonusAction: +1 (upsizes to d8)
```

### Example: Eldritch Blast Invocations

```
action: eldritch-blast
basedie: d6
agonizing-blast: +1 (upsizes to d8)
repelling-blast: +1 (upsizes to d8)
```

Register via API:

```javascript
api.createTable('bard-rules', {
  name: 'Bard Recovery',
  rules: {
    'bardic-inspiration': { die: 'd6' },
    'inspiration-bonus': { die: '+1' }
  }
});
```

---

## Integration with Other Modules

Use **integration hooks** to tie RTI into other systems:

```javascript
const api = game.modules.get('lisas-angry-initiative').api;

// When a spell is cast, automatically apply RTI recovery
api.registerHook('beforeRecoveryRoll', (context) => {
  if (context.actionType === 'spell') {
    console.log(`${context.combatant.name} casting spell...`);
  }
});

// When combat ends, log statistics
api.registerHook('afterCombatEnd', (context) => {
  const stats = api.getStatistics();
  console.log(`Combat stats:`, stats);
});
```

---

## Balance Tips

### If combats are too fast:
- Switch to **Gritty variant** (phases 1-12)
- Reduce bonus action upsizing (make it +0 instead)
- Increase enemy phase staggering

### If combats are too slow:
- Switch to **Heroic variant** (phases 1-8)
- Enable bonus action upsizing on ALL bonus actions
- Reduce recovery die caps (d10 max instead of d12)

### If one player dominates:
- Tighten initiative die spread (min d6, max d10)
- Add more enemies with staggered starts
- Use conditions (exhaustion, restrained) to add variation

---

## Phase History

Every recovery roll is logged. Query history for:

```javascript
const api = game.modules.get('lisas-angry-initiative').api;

// Get last 10 rolls for the fighter
const history = api.getHistory(fighterCombatant.id, 10);

history.forEach(entry => {
  console.log(`${entry.timestamp}: ${entry.actionType} (${entry.die}) → Phase ${entry.nextPhase}`);
});
```

Use for:
- Reviewing past decisions
- Spotting patterns
- Teaching moments

---

## FAQ

**Q: Do I have to use Recovery Time Initiative?**
A: No. Enable/disable it in module settings. The module is entirely optional.

**Q: Can I mix RTI with standard initiative?**
A: Yes. Disable RTI for some combats, enable for others.

**Q: How do crits and fumbles interact?**
A: GM's call. Options:
1. No change — always roll the normal recovery die
2. Crit upsizes once; fumble downsizes once
3. Crit rolls twice and takes higher; fumble rolls twice and takes lower

**Q: What about surprise round?**
A: Surprised creatures start at Phase 10 and act next round normally.

**Q: What about Ready actions with triggers?**
A: Roll the initiative die **now**. When your trigger happens, you act and use that rolled phase.

---

**Lisa's Angry Initiative v2.0.0** — Combat that rewards tactical thinking and action timing.
