/**
 * Lisa's Angry Initiative - Constants
 * @module constants
 * @author Lisa's Dungeon
 * @license Proprietary
 */

export const MODULE_INFO = {
  id: 'lisas-angry-initiative',
  title: 'Lisa\'s Angry Initiative',
  version: '2.0.0',
  icon: '⚔️',
  order: 50,
};

export const PHASES = {
  1: { name: 'Phase 1', color: '#ff6b6b' },
  2: { name: 'Phase 2', color: '#ff8c42' },
  3: { name: 'Phase 3', color: '#ffa500' },
  4: { name: 'Phase 4', color: '#ffc107' },
  5: { name: 'Phase 5', color: '#ffeb3b' },
  6: { name: 'Phase 6', color: '#c6ff00' },
  7: { name: 'Phase 7', color: '#76ff03' },
  8: { name: 'Phase 8', color: '#00ff00' },
  9: { name: 'Phase 9', color: '#00bfa5' },
  10: { name: 'Phase 10', color: '#00e5ff' },
};

export const RECOVERY_DICE = ['d4', 'd6', 'd8', 'd10', 'd12'];

export const SIZE_TO_DIE = {
  'tiny': 'd4',
  'small': 'd6',
  'medium': 'd8',
  'large': 'd10',
  'huge': 'd12',
  'gargantuan': 'd12',
};

export const ACTION_TYPES = {
  attack: { die: 'weapon', label: 'Attack', bonus: 0 },
  cantrip: { die: 'd6', label: 'Cantrip', bonus: 0 },
  spell: { die: 'd8', label: 'Leveled Spell', bonus: 0 },
  spellUpcast: { die: 'd10', label: 'Upcast Spell', bonus: 0 },
  action: { die: 'size', label: 'Action', bonus: 0 },
  bonusAction: { die: '+1', label: 'Bonus Action', bonus: 1 },
  reaction: { die: 'size', label: 'Reaction', bonus: 0 },
  movement: { die: 'size', label: 'Movement', bonus: 0 },
};

export const CONDITION_MODIFIERS = {
  stunned: { dieAdjustment: -2, label: 'Stunned' },
  paralyzed: { dieAdjustment: -2, label: 'Paralyzed' },
  exhaustion: { dieAdjustment: -1, label: 'Exhaustion' },
  prone: { dieAdjustment: 0, label: 'Prone' },
  restrained: { dieAdjustment: -1, label: 'Restrained' },
  inspired: { dieAdjustment: 1, label: 'Inspired' },
  blessed: { dieAdjustment: 1, label: 'Blessed' },
  haste: { dieAdjustment: 1, label: 'Haste' },
};

export const PHASE_VARIANTS = {
  standard: {
    name: 'Standard Recovery Time Initiative',
    description: 'Phase 1-10 recovery system with standard die adjustments',
    phases: 10,
    minRecovery: 1,
    maxRecovery: 10,
  },
  gritty: {
    name: 'Gritty Variant',
    description: 'Longer phase durations, more tactical positioning',
    phases: 12,
    minRecovery: 1,
    maxRecovery: 12,
  },
  heroic: {
    name: 'Heroic Variant',
    description: 'Faster recovery, more action economy',
    phases: 8,
    minRecovery: 1,
    maxRecovery: 8,
  },
};

export const FLAGS = {
  CURRENT_PHASE: 'currentPhase',
  NEXT_PHASE: 'nextPhase',
  RECOVERING: 'recovering',
  LAST_ACTION: 'lastAction',
  INITIATIVE_DIE: 'initiativeDie',
  PROMPT_LOCK: 'promptLock',
};

export const SETTINGS = {
  ENABLE_CORE: 'enableCore',
  AUTO_SIZE_INIT_DIE: 'autoSizeInitDie',
  BLOCK_REACTIONS: 'blockReactionsWhileRecovering',
  KNOCKBACK_THRESHOLD: 'knockbackThreshold',
  SHOW_PHASE_VISUALS: 'showPhaseVisuals'
};

export const DEFAULT_SETTINGS = {
  enableModule: true,
  enableAdvancedModifiers: true,
  enableConditionTracking: true,
  enableRecoveryHistory: true,
  enablePhaseVariants: true,
  enableCustomRecoveryTables: true,
  phaseVariant: 'standard',
  trackHistory: true,
  historyLimit: 100,
};
