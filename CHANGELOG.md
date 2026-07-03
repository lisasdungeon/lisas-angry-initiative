# Changelog

All notable changes to Lisa's Angry Initiative are documented in this file.

## [2.0.0] - 2026-07-03

### Added

- Complete v2.0 rebrand of RNK Angry Initiative as Lisa's Angry Initiative
- Advanced modifier system with condition-based die adjustments (stunned, paralyzed, exhaustion, inspired, blessed, haste)
- Phase variants system: Standard (1-10), Gritty (1-12), Heroic (1-8), and unlimited custom variants
- Custom recovery tables: create and manage per-table recovery rules (Standard Melee, Spellcaster, Archer presets)
- Recovery history tracking: per-combatant logs with timestamps, action types, conditions, and modifiers
- Phase indicators: visual phase badges on tokens with color-coded display and combat tracker integration
- Integration hooks API: 8 predefined hooks for deep module integration (beforePhaseChange, afterPhaseChange, beforeRecoveryRoll, afterRecoveryRoll, beforeCombatStart, afterCombatEnd, onConditionApplied, onConditionRemoved)
- Comprehensive public API with 40+ methods across recovery, variants, tables, hooks, and indicators
- Modular architecture: 6 independent systems (recovery, phase-variants, custom-recovery-tables, integration-hooks, phase-indicators, main class)

### Changed

- Module ID: `rnk-angry-init` → `lisas-angry-initiative`
- Module title: `RNK Angry Init` → `Lisa's Angry Initiative`
- Version: `1.2.2` → `2.0.0`
- Author: `The Curator` → `Lisa's Dungeon`
- Patreon: RNK Patreon → Lisa's Dungeon Patreon
- Repository: RNK-Enterprise → LisasDungeon

### Fixed

- Phase constraint logic for variant systems
- Recovery die formula extraction from weapons
- Condition modifier stacking calculations

## Version History (Legacy)

See [RNK Angry Init CHANGELOG](https://github.com/RNK-Enterprise/rnk-angry-init/blob/master/CHANGELOG.md) for v1.0-v1.2.2 history.

---

**Lisa's Angry Initiative v2.0.0** — Foundry VTT combat reimagined through recovery time and phase-driven mechanics.
