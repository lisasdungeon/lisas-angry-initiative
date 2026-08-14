# Changelog

## 2.0.3

- Compliance and hardening release: sole Lisa's Dungeon authorship and contact fields (Discord MystryssLysa, email Lisasdungeon@gmail.com, Patreon LisasDungeon); lazy loading / trigger-based startup where needed; 500 LOC file cap; full source line coverage; no emoji or AI references in the shipped package.
- Compliance pass: sole author Lisa's Dungeon with Discord MystryssLysa / email Lisasdungeon@gmail.com / Patreon LisasDungeon; enforce 500 LOC file cap; remove non-compliant branding and symbols where present.
- Fixed `test:coverage` script glob so Node picks up every `tests/**/*.test.mjs` file.
- Lazy-load the core class on Foundry `init` instead of importing it at module evaluation.
- Expanded unit tests (Foundry mocks) to 100% source line and function coverage across all scripts.

## [2.0.2] - 2026-07-29

### Fixed

- Condition-based die adjustments (stunned, paralyzed, exhaustion, inspired, blessed, haste) now actually apply to recovery rolls when "Apply Condition Modifiers" is checked; previously the adjustment logic existed but was never called.
- Attack, damage, item-use, and initiative hooks are now registered, so recovery-state reaction blocking, weapon knockback, and auto-sized initiative dice run during real combat instead of sitting unreachable.
- Phase variants, custom recovery tables, integration hooks, and phase indicators are now reachable through the public API exactly as documented, instead of being built but never wired in.
- The "Apply Condition Modifiers" checkbox no longer depends on the unrelated "Block Reactions" setting.
- Fixed a race where multiple owning players' clients could each open a duplicate recovery-roll dialog for the same combatant at end of turn.
- The knockback threshold setting is now actually used when deciding whether an attack shifts a target's phase.
- Recovery rolls are now recorded to per-combatant history, and `getHistory`/`clearHistory`/`clearAllHistory`/`getVersion`/`getStatistics` are implemented on the public API.

### Changed

- Standardized license/author headers across all source files to MIT / Lisa's Dungeon.
- Removed unused settings, dead code paths, and orphaned files that were never reachable at runtime.
- Removed the `globalThis.LD_MODULES` cross-module registry entry and the `activate()` method that existed only to serve it. This module is standalone and does not register into or depend on any shared launcher.

## [2.0.0] - 2026-07-03

### Added

- Advanced modifier system with condition-based die adjustments (stunned, paralyzed, exhaustion, inspired, blessed, haste)
- Phase variants system: Standard (1-10), Gritty (1-12), Heroic (1-8), and unlimited custom variants
- Custom recovery tables: create and manage per-table recovery rules (Standard Melee, Spellcaster, Archer presets)
- Recovery history tracking: per-combatant logs with timestamps, action types, conditions, and modifiers
- Phase indicators: visual phase badges on tokens with color-coded display and combat tracker integration
- Integration hooks API: 8 predefined hooks for deep module integration (beforePhaseChange, afterPhaseChange, beforeRecoveryRoll, afterRecoveryRoll, beforeCombatStart, afterCombatEnd, onConditionApplied, onConditionRemoved)
- Comprehensive public API across recovery, variants, tables, hooks, and indicators
- Modular architecture: 6 independent systems (recovery, phase-variants, custom-recovery-tables, integration-hooks, phase-indicators, main class)

### Fixed

- Phase constraint logic for variant systems
- Recovery die formula extraction from weapons
- Condition modifier stacking calculations

---

**Lisa's Angry Initiative v2.0.2**: Foundry VTT combat reimagined through recovery time and phase-driven mechanics.
