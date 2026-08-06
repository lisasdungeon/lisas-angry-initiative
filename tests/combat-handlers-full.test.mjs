import assert from 'node:assert/strict';
import test, { beforeEach } from 'node:test';
import {
  getActionTypeFromItem,
  initializeCombatant,
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
  onUseItem,
  sortCombatantsByPhase
} from '../scripts/combat-handlers.js';
import { FLAGS, MODULE_ID, SETTINGS } from '../scripts/constants.js';
import {
  installGlobals,
  makeCombat,
  makeCombatant,
  MockRoll
} from './foundry-mock.mjs';

const { game, ui } = installGlobals();

const moduleApi = {
  async promptRecoveryRoll() {
    moduleApi._prompted = true;
    return 3;
  },
  _prompted: false
};

beforeEach(() => {
  moduleApi._prompted = false;
  game.settings.set(MODULE_ID, SETTINGS.ENABLE_CORE, true);
  game.settings.set(MODULE_ID, SETTINGS.BLOCK_REACTIONS, true);
  game.settings.set(MODULE_ID, SETTINGS.AUTO_SIZE_INIT_DIE, true);
  game.settings.set(MODULE_ID, SETTINGS.KNOCKBACK_THRESHOLD, 0);
  game.user = { id: 'gm-1', isGM: true, active: true, targets: [] };
  game.users = [];
  game.users.filter = Array.prototype.filter.bind(game.users);
  game.combat = null;
  ui._calls.warn.length = 0;
  globalThis.Roll = class extends MockRoll {
    constructor(formula) {
      super(formula);
      this.total = 6;
    }
  };
});

test('initializeCombatant: no-ops without actor', async () => {
  await initializeCombatant(moduleApi, null);
  await initializeCombatant(moduleApi, {});
});

test('initializeCombatant: rolls initiative die with advantage and sets phase', async () => {
  const c = makeCombatant({
    actor: {
      id: 'a1',
      system: {
        traits: { size: 'large' },
        attributes: { init: { bonus: 1, advantage: true, disadvantage: false } }
      },
      items: []
    }
  });
  await initializeCombatant(moduleApi, c);
  assert.equal(c.getFlag(MODULE_ID, FLAGS.INITIATIVE_DIE), 'd10');
  assert.equal(c.getFlag(MODULE_ID, FLAGS.CURRENT_PHASE), 5); // max(1, min(6-1, 10))
  assert.equal(c.getFlag(MODULE_ID, FLAGS.RECOVERING), false);
  assert.equal(c.initiative, (11 - 5) * 10);
});

test('initializeCombatant: disadvantage formula path', async () => {
  const c = makeCombatant({
    actor: {
      id: 'a1',
      system: {
        traits: { size: 'medium' },
        attributes: { init: { bonus: 0, advantage: false, disadvantage: true } }
      },
      items: []
    }
  });
  let formulaSeen = null;
  globalThis.Roll = class extends MockRoll {
    constructor(formula) {
      super(formula);
      formulaSeen = formula;
      this.total = 3;
    }
  };
  await initializeCombatant(moduleApi, c);
  assert.equal(formulaSeen, '2d8kh');
});

test('initializeCombatant: reuses existing initiative die flag', async () => {
  const c = makeCombatant({
    actor: {
      id: 'a1',
      system: { traits: { size: 'tiny' }, attributes: { init: {} } },
      items: []
    }
  });
  await c.setFlag(MODULE_ID, FLAGS.INITIATIVE_DIE, 'd12');
  await initializeCombatant(moduleApi, c);
  assert.equal(c.getFlag(MODULE_ID, FLAGS.INITIATIVE_DIE), 'd12');
});

test('sortCombatantsByPhase: no-ops on empty combat', async () => {
  await sortCombatantsByPhase(null);
  await sortCombatantsByPhase({ combatants: { size: 0 } });
});

test('sortCombatantsByPhase: writes initiative from current phase', async () => {
  const c1 = makeCombatant({ id: 'c1' });
  await c1.setFlag(MODULE_ID, FLAGS.CURRENT_PHASE, 3);
  const combat = makeCombat([c1]);
  let updates = null;
  combat.updateEmbeddedDocuments = async (_t, u) => {
    updates = u;
    return u;
  };
  await sortCombatantsByPhase(combat);
  assert.deepEqual(updates, [{ _id: 'c1', initiative: (11 - 3) * 10 }]);
});

test('onCombatStart: requires GM and enableCore', async () => {
  game.user.isGM = false;
  const c = makeCombatant();
  const combat = makeCombat([c]);
  await onCombatStart(moduleApi, combat);
  assert.equal(c.getFlag(MODULE_ID, FLAGS.CURRENT_PHASE), undefined);

  game.user.isGM = true;
  game.settings.set(MODULE_ID, SETTINGS.ENABLE_CORE, false);
  await onCombatStart(moduleApi, combat);
  assert.equal(c.getFlag(MODULE_ID, FLAGS.CURRENT_PHASE), undefined);
});

test('onCombatStart: initializes all combatants and sorts', async () => {
  const c = makeCombatant({
    actor: {
      id: 'a1',
      system: { traits: { size: 'medium' }, attributes: { init: { bonus: 0 } } },
      items: []
    }
  });
  const combat = makeCombat([c]);
  await onCombatStart(moduleApi, combat);
  assert.ok(c.getFlag(MODULE_ID, FLAGS.CURRENT_PHASE));
});

test('onCombatEnd: logs', async () => {
  const logs = [];
  const prev = console.log;
  console.log = (...a) => logs.push(a.join(' '));
  await onCombatEnd();
  assert.ok(logs.some((l) => l.includes('Combat ended')));
  console.log = prev;
});

test('onCombatUpdate: early return when core disabled', async () => {
  game.settings.set(MODULE_ID, SETTINGS.ENABLE_CORE, false);
  await onCombatUpdate(moduleApi, makeCombat([]), { turn: 1 }, {}, 'gm-1');
});

test('onCombatUpdate: started transition initializes missing phases', async () => {
  const c = makeCombatant({
    actor: {
      id: 'a1',
      system: { traits: { size: 'medium' }, attributes: { init: {} } },
      items: []
    }
  });
  const combat = makeCombat([c]);
  combat.previous = { started: false };
  await onCombatUpdate(moduleApi, combat, { started: true }, {}, 'gm-1');
  assert.ok(c.getFlag(MODULE_ID, FLAGS.CURRENT_PHASE));
});

test('onCombatUpdate: started transition skips combatants that already have phase', async () => {
  const c = makeCombatant();
  await c.setFlag(MODULE_ID, FLAGS.CURRENT_PHASE, 2);
  const combat = makeCombat([c]);
  combat.previous = { started: false };
  await onCombatUpdate(moduleApi, combat, { started: true }, {}, 'gm-1');
  assert.equal(c.getFlag(MODULE_ID, FLAGS.CURRENT_PHASE), 2);
});

test('onCombatUpdate: round change applies next phase for recovering combatants', async () => {
  const c = makeCombatant();
  await c.setFlag(MODULE_ID, FLAGS.RECOVERING, true);
  await c.setFlag(MODULE_ID, FLAGS.NEXT_PHASE, 7);
  const combat = makeCombat([c]);
  combat.previous = { combatantId: c.id };
  await onCombatUpdate(moduleApi, combat, { round: 2 }, {}, 'gm-1');
  assert.equal(c.getFlag(MODULE_ID, FLAGS.CURRENT_PHASE), 7);
  assert.equal(c.getFlag(MODULE_ID, FLAGS.RECOVERING), false);
});

test('onCombatUpdate: round change ignores non-recovering nextPhase', async () => {
  const c = makeCombatant();
  await c.setFlag(MODULE_ID, FLAGS.RECOVERING, false);
  await c.setFlag(MODULE_ID, FLAGS.NEXT_PHASE, 7);
  const combat = makeCombat([c]);
  combat.previous = {};
  await onCombatUpdate(moduleApi, combat, { round: 2 }, {}, 'gm-1');
  assert.equal(c.getFlag(MODULE_ID, FLAGS.CURRENT_PHASE), undefined);
});

test('onCombatUpdate: returns early without previous combatantId', async () => {
  const combat = makeCombat([makeCombatant()]);
  combat.previous = {};
  await onCombatUpdate(moduleApi, combat, { turn: 1 }, {}, 'gm-1');
  assert.equal(moduleApi._prompted, false);
});

test('onCombatUpdate: skips recovering previous combatant', async () => {
  const c = makeCombatant();
  await c.setFlag(MODULE_ID, FLAGS.RECOVERING, true);
  const combat = makeCombat([c]);
  combat.previous = { combatantId: c.id };
  await onCombatUpdate(moduleApi, combat, { turn: 1 }, {}, 'gm-1');
  assert.equal(moduleApi._prompted, false);
});

test('onCombatUpdate: GM prompts when no active owners and userId matches', async () => {
  const c = makeCombatant();
  await c.setFlag(MODULE_ID, FLAGS.RECOVERING, false);
  await c.setFlag(MODULE_ID, FLAGS.LAST_ACTION, 'attack');
  const combat = makeCombat([c]);
  combat.previous = { combatantId: c.id };
  game.users = [];
  game.users.filter = Array.prototype.filter.bind(game.users);
  game.user = { id: 'gm-1', isGM: true, active: true };
  await onCombatUpdate(moduleApi, combat, { turn: 1 }, {}, 'gm-1');
  assert.equal(moduleApi._prompted, true);
  assert.equal(c.getFlag(MODULE_ID, FLAGS.PROMPT_LOCK), false);
});

test('onCombatUpdate: GM does not prompt when another user ended turn', async () => {
  const c = makeCombatant();
  await c.setFlag(MODULE_ID, FLAGS.RECOVERING, false);
  const combat = makeCombat([c]);
  combat.previous = { combatantId: c.id };
  game.users = [];
  game.users.filter = Array.prototype.filter.bind(game.users);
  await onCombatUpdate(moduleApi, combat, { turn: 1 }, {}, 'other-gm');
  assert.equal(moduleApi._prompted, false);
});

test('onCombatUpdate: only first active owner prompts', async () => {
  const c = makeCombatant({
    owners: ['p2', 'p1'],
    testUserPermission(user) {
      return user.id === 'p1' || user.id === 'p2';
    }
  });
  await c.setFlag(MODULE_ID, FLAGS.RECOVERING, false);
  const combat = makeCombat([c]);
  combat.previous = { combatantId: c.id };
  game.users = [
    { id: 'p2', active: true, isGM: false },
    { id: 'p1', active: true, isGM: false }
  ];
  game.users.filter = Array.prototype.filter.bind(game.users);

  game.user = { id: 'p2', isGM: false, active: true };
  await onCombatUpdate(moduleApi, combat, { turn: 1 }, {}, 'p2');
  assert.equal(moduleApi._prompted, false);

  moduleApi._prompted = false;
  await c.setFlag(MODULE_ID, FLAGS.PROMPT_LOCK, false);
  game.user = { id: 'p1', isGM: false, active: true };
  await onCombatUpdate(moduleApi, combat, { turn: 1 }, {}, 'p1');
  assert.equal(moduleApi._prompted, true);
});

test('onCombatUpdate: skips when prompt lock already set', async () => {
  const c = makeCombatant();
  await c.setFlag(MODULE_ID, FLAGS.RECOVERING, false);
  await c.setFlag(MODULE_ID, FLAGS.PROMPT_LOCK, true);
  const combat = makeCombat([c]);
  combat.previous = { combatantId: c.id };
  game.users = [];
  game.users.filter = Array.prototype.filter.bind(game.users);
  await onCombatUpdate(moduleApi, combat, { turn: 1 }, {}, 'gm-1');
  assert.equal(moduleApi._prompted, false);
});

test('onCombatUpdate: recovery options include weapon die for attack lastAction', async () => {
  let seenOptions = null;
  const api = {
    async promptRecoveryRoll(_c, lastAction, options) {
      seenOptions = { lastAction, options };
    }
  };
  const c = makeCombatant({
    actor: {
      id: 'a1',
      system: { traits: { size: 'medium' }, attributes: { init: {} } },
      items: [{ type: 'weapon', system: { equipped: true, damage: { parts: [['1d8', 's']] } } }]
    }
  });
  await c.setFlag(MODULE_ID, FLAGS.RECOVERING, false);
  await c.setFlag(MODULE_ID, FLAGS.LAST_ACTION, 'attack');
  await c.setFlag(MODULE_ID, FLAGS.INITIATIVE_DIE, 'd8');
  const combat = makeCombat([c]);
  combat.previous = { combatantId: c.id };
  game.users = [];
  game.users.filter = Array.prototype.filter.bind(game.users);
  await onCombatUpdate(api, combat, { turn: 1 }, {}, 'gm-1');
  assert.equal(seenOptions.lastAction, 'attack');
  assert.equal(seenOptions.options.baseDamageDie, 'd8');
  assert.equal(seenOptions.options.applyImmediately, false);
});

test('onCombatUpdate: round change sets applyImmediately true on recovery options', async () => {
  let seen = null;
  const api = {
    async promptRecoveryRoll(_c, _a, options) {
      seen = options;
    }
  };
  const c = makeCombatant({
    actor: {
      id: 'a1',
      system: { traits: { size: 'medium' }, attributes: { init: {} } },
      items: []
    }
  });
  await c.setFlag(MODULE_ID, FLAGS.RECOVERING, false);
  await c.setFlag(MODULE_ID, FLAGS.LAST_ACTION, 'cantrip');
  const combat = makeCombat([c]);
  combat.previous = { combatantId: c.id };
  game.users = [];
  game.users.filter = Array.prototype.filter.bind(game.users);
  await onCombatUpdate(api, combat, { round: 3 }, {}, 'gm-1');
  assert.equal(seen.applyImmediately, true);
});

test('onCreateCombatant: requires GM and core', async () => {
  game.user.isGM = false;
  const c = makeCombatant({
    actor: {
      id: 'a1',
      system: { traits: { size: 'medium' }, attributes: { init: {} } },
      items: []
    }
  });
  await onCreateCombatant(moduleApi, c);
  assert.equal(c.getFlag(MODULE_ID, FLAGS.CURRENT_PHASE), undefined);
});

test('onCreateCombatant: initializes and sorts when combat started', async () => {
  const c = makeCombatant({
    actor: {
      id: 'a1',
      system: { traits: { size: 'medium' }, attributes: { init: {} } },
      items: []
    }
  });
  const combat = makeCombat([c]);
  combat.started = true;
  c.combat = combat;
  await onCreateCombatant(moduleApi, c);
  assert.ok(c.getFlag(MODULE_ID, FLAGS.CURRENT_PHASE));
});

test('onCreateCombatant: skips sort when combat not started', async () => {
  const c = makeCombatant({
    actor: {
      id: 'a1',
      system: { traits: { size: 'medium' }, attributes: { init: {} } },
      items: []
    }
  });
  c.combat = { started: false };
  await onCreateCombatant(moduleApi, c);
  assert.ok(c.getFlag(MODULE_ID, FLAGS.CURRENT_PHASE));
});

test('onCombatantUpdate: ignores non-initiative updates', async () => {
  const c = makeCombatant();
  await onCombatantUpdate(moduleApi, c, {});
  assert.equal(c.getFlag(MODULE_ID, FLAGS.CURRENT_PHASE), undefined);
});

test('onCombatantUpdate: maps initiative to phase', async () => {
  const c = makeCombatant();
  await onCombatantUpdate(moduleApi, c, { initiative: 80 });
  // phase = max(1, min(10, 11 - floor(80/10))) = 11-8 = 3
  assert.equal(c.getFlag(MODULE_ID, FLAGS.CURRENT_PHASE), 3);
});

test('onCombatantUpdate: no write when phase already matches', async () => {
  const c = makeCombatant();
  await c.setFlag(MODULE_ID, FLAGS.CURRENT_PHASE, 3);
  let writes = 0;
  const orig = c.setFlag.bind(c);
  c.setFlag = async (...args) => {
    writes += 1;
    return orig(...args);
  };
  await onCombatantUpdate(moduleApi, c, { initiative: 80 });
  assert.equal(writes, 0);
});

test('onRollAttack: sets last action when combatant found', async () => {
  const c = makeCombatant({ actor: { id: 'actor-x' } });
  game.combat = makeCombat([c]);
  await onRollAttack(moduleApi, { actor: { id: 'actor-x' } });
  assert.equal(c.getFlag(MODULE_ID, FLAGS.LAST_ACTION), 'attack');
});

test('onRollAttack: no-ops without combat or when core disabled', async () => {
  game.combat = null;
  await onRollAttack(moduleApi, { actor: { id: 'a' } });
  game.combat = makeCombat([]);
  game.settings.set(MODULE_ID, SETTINGS.ENABLE_CORE, false);
  await onRollAttack(moduleApi, { actor: { id: 'a' } });
});

test('onRollDamage: no-ops without combat/GM/core', async () => {
  game.combat = null;
  await onRollDamage(moduleApi, { actor: { id: 'a' } });
  game.combat = makeCombat([]);
  game.user.isGM = false;
  await onRollDamage(moduleApi, { actor: { id: 'a' } });
  game.user.isGM = true;
  game.settings.set(MODULE_ID, SETTINGS.ENABLE_CORE, false);
  await onRollDamage(moduleApi, { actor: { id: 'a' } });
});

test('onRollDamage: weapon knockback advances target phase', async () => {
  const attacker = makeCombatant({
    id: 'atk',
    actorId: 'atk-actor',
    actor: { id: 'atk-actor' },
    tokenId: 'tok-atk'
  });
  const target = makeCombatant({
    id: 'tgt',
    actorId: 'tgt-actor',
    actor: { id: 'tgt-actor', name: 'Goblin' },
    tokenId: 'tok-tgt',
    name: 'Goblin'
  });
  await target.setFlag(MODULE_ID, FLAGS.CURRENT_PHASE, 3);
  await target.setFlag(MODULE_ID, FLAGS.INITIATIVE_DIE, 'd4');
  const combat = makeCombat([attacker, target]);
  combat.turn = 0;
  combat.turns = [attacker, target];
  game.combat = combat;
  game.user.targets = [{ id: 'tok-tgt' }];

  const item = {
    type: 'weapon',
    actor: {
      id: 'atk-actor',
      items: [{ type: 'weapon', system: { equipped: true, damage: { parts: [['1d12', 's']] } } }]
    }
  };
  await onRollDamage(moduleApi, item);
  assert.equal(target.getFlag(MODULE_ID, FLAGS.CURRENT_PHASE), 4);
  assert.equal(target.initiative, (11 - 4) * 10);
});

test('onRollDamage: spell cantrip uses d6; leveled uses d8', async () => {
  const target = makeCombatant({
    id: 'tgt',
    actor: { id: 'tgt-actor' },
    tokenId: 'tok-tgt',
    name: 'T'
  });
  await target.setFlag(MODULE_ID, FLAGS.CURRENT_PHASE, 1);
  await target.setFlag(MODULE_ID, FLAGS.INITIATIVE_DIE, 'd4');
  const attacker = makeCombatant({ id: 'atk', actor: { id: 'atk-actor' }, tokenId: 'tok-a' });
  const combat = makeCombat([attacker, target]);
  combat.turn = 0;
  combat.turns = [attacker, target];
  game.combat = combat;
  game.user.targets = [{ id: 'tok-tgt' }];

  await onRollDamage(moduleApi, { type: 'spell', system: { level: 0 }, actor: { id: 'atk-actor' } });
  // d6 vs d4: attacker larger, knockback
  assert.equal(target.getFlag(MODULE_ID, FLAGS.CURRENT_PHASE), 2);

  await target.setFlag(MODULE_ID, FLAGS.CURRENT_PHASE, 1);
  await onRollDamage(moduleApi, { type: 'spell', system: { level: 3 }, actor: { id: 'atk-actor' } });
  assert.equal(target.getFlag(MODULE_ID, FLAGS.CURRENT_PHASE), 2);
});

test('onRollDamage: non-weapon non-spell defaults to d6', async () => {
  const target = makeCombatant({
    id: 'tgt',
    actor: { id: 'tgt-actor' },
    tokenId: 'tok-tgt',
    name: 'T'
  });
  await target.setFlag(MODULE_ID, FLAGS.CURRENT_PHASE, 1);
  await target.setFlag(MODULE_ID, FLAGS.INITIATIVE_DIE, 'd4');
  const attacker = makeCombatant({ id: 'atk', actor: { id: 'atk-actor' } });
  const combat = makeCombat([attacker, target]);
  combat.turn = 0;
  combat.turns = [attacker, target];
  game.combat = combat;
  game.user.targets = [{ id: 'tok-tgt' }];
  await onRollDamage(moduleApi, { type: 'feat', actor: { id: 'atk-actor' } });
  assert.equal(target.getFlag(MODULE_ID, FLAGS.CURRENT_PHASE), 2);
});

test('onRollDamage: skips self, past turns, and weak attacks', async () => {
  const self = makeCombatant({ id: 'self', actor: { id: 'same' }, tokenId: 'tok-self' });
  const past = makeCombatant({ id: 'past', actor: { id: 'past-a' }, tokenId: 'tok-past', name: 'Past' });
  const weak = makeCombatant({ id: 'weak', actor: { id: 'weak-a' }, tokenId: 'tok-weak', name: 'Weak' });
  await past.setFlag(MODULE_ID, FLAGS.CURRENT_PHASE, 2);
  await weak.setFlag(MODULE_ID, FLAGS.CURRENT_PHASE, 2);
  await weak.setFlag(MODULE_ID, FLAGS.INITIATIVE_DIE, 'd12');
  const combat = makeCombat([past, self, weak]);
  combat.turn = 1;
  combat.turns = [past, self, weak];
  game.combat = combat;
  game.user.targets = [{ id: 'tok-self' }, { id: 'tok-past' }, { id: 'tok-weak' }, { id: 'tok-none' }];

  await onRollDamage(moduleApi, {
    type: 'weapon',
    actor: {
      id: 'same',
      items: [{ type: 'weapon', system: { equipped: true, damage: { parts: [['1d4', 's']] } } }]
    }
  });
  assert.equal(past.getFlag(MODULE_ID, FLAGS.CURRENT_PHASE), 2);
  assert.equal(weak.getFlag(MODULE_ID, FLAGS.CURRENT_PHASE), 2);
});

test('onRollDamage: phase 10+ delays combatant', async () => {
  const target = makeCombatant({
    id: 'tgt',
    actor: { id: 'tgt-actor' },
    tokenId: 'tok-tgt',
    name: 'Delayed'
  });
  await target.setFlag(MODULE_ID, FLAGS.CURRENT_PHASE, 10);
  await target.setFlag(MODULE_ID, FLAGS.INITIATIVE_DIE, 'd4');
  const attacker = makeCombatant({ id: 'atk', actor: { id: 'atk-actor' } });
  const combat = makeCombat([attacker, target]);
  combat.turn = 0;
  combat.turns = [attacker, target];
  game.combat = combat;
  game.user.targets = [{ id: 'tok-tgt' }];
  await onRollDamage(moduleApi, {
    type: 'weapon',
    actor: {
      id: 'atk-actor',
      items: [{ type: 'weapon', system: { equipped: true, damage: { parts: [['1d12', 's']] } } }]
    }
  });
  assert.equal(target.getFlag(MODULE_ID, FLAGS.CURRENT_PHASE), 11);
  assert.equal(target.initiative, -10);
});

test('onRollDamage: respects knockback threshold', async () => {
  game.settings.set(MODULE_ID, SETTINGS.KNOCKBACK_THRESHOLD, 4);
  const target = makeCombatant({
    id: 'tgt',
    actor: { id: 'tgt-actor' },
    tokenId: 'tok-tgt',
    name: 'T'
  });
  await target.setFlag(MODULE_ID, FLAGS.CURRENT_PHASE, 1);
  await target.setFlag(MODULE_ID, FLAGS.INITIATIVE_DIE, 'd6');
  const attacker = makeCombatant({ id: 'atk', actor: { id: 'atk-actor' } });
  const combat = makeCombat([attacker, target]);
  combat.turn = 0;
  combat.turns = [attacker, target];
  game.combat = combat;
  game.user.targets = [{ id: 'tok-tgt' }];
  // d8 (8) <= d6 (6) + 4 => no knockback
  await onRollDamage(moduleApi, {
    type: 'weapon',
    actor: {
      id: 'atk-actor',
      items: [{ type: 'weapon', system: { equipped: true, damage: { parts: [['1d8', 's']] } } }]
    }
  });
  assert.equal(target.getFlag(MODULE_ID, FLAGS.CURRENT_PHASE), 1);
});

test('onPreUseItem: allows when core/block/combat missing', () => {
  game.combat = null;
  assert.equal(onPreUseItem(moduleApi, { actor: { id: 'a' } }), true);
  game.combat = makeCombat([]);
  game.settings.set(MODULE_ID, SETTINGS.ENABLE_CORE, false);
  assert.equal(onPreUseItem(moduleApi, { actor: { id: 'a' } }), true);
  game.settings.set(MODULE_ID, SETTINGS.ENABLE_CORE, true);
  game.settings.set(MODULE_ID, SETTINGS.BLOCK_REACTIONS, false);
  assert.equal(onPreUseItem(moduleApi, { actor: { id: 'a' } }), true);
});

test('onPreUseItem: allows non-reaction and missing combatant', () => {
  const c = makeCombatant({ actor: { id: 'a1' } });
  game.combat = makeCombat([c]);
  game.settings.set(MODULE_ID, SETTINGS.BLOCK_REACTIONS, true);
  assert.equal(onPreUseItem(moduleApi, { actor: { id: 'missing' }, system: { activation: { type: 'reaction' } } }), true);
  assert.equal(onPreUseItem(moduleApi, { actor: { id: 'a1' }, system: { activation: { type: 'action' } } }), true);
});

test('onPreUseItem: blocks reaction when current phase is earlier', async () => {
  const me = makeCombatant({ id: 'me', actor: { id: 'me-a' } });
  const current = makeCombatant({ id: 'cur', actor: { id: 'cur-a' } });
  await me.setFlag(MODULE_ID, FLAGS.CURRENT_PHASE, 5);
  await current.setFlag(MODULE_ID, FLAGS.CURRENT_PHASE, 2);
  const combat = makeCombat([current, me]);
  combat.combatant = current;
  game.combat = combat;
  game.settings.set(MODULE_ID, SETTINGS.BLOCK_REACTIONS, true);
  assert.equal(
    onPreUseItem(moduleApi, { actor: { id: 'me-a' }, system: { activation: { type: 'reaction' } } }),
    false
  );
  assert.ok(ui._calls.warn.length > 0);
});

test('onPreUseItem: allows reaction when current phase is later or equal', async () => {
  const me = makeCombatant({ id: 'me', actor: { id: 'me-a' } });
  const current = makeCombatant({ id: 'cur', actor: { id: 'cur-a' } });
  await me.setFlag(MODULE_ID, FLAGS.CURRENT_PHASE, 2);
  await current.setFlag(MODULE_ID, FLAGS.CURRENT_PHASE, 5);
  const combat = makeCombat([current, me]);
  combat.combatant = current;
  game.combat = combat;
  assert.equal(
    onPreUseItem(moduleApi, { actor: { id: 'me-a' }, system: { activation: { type: 'reaction' } } }),
    true
  );
});

test('onUseItem: records action type from item', async () => {
  const c = makeCombatant({ actor: { id: 'a1' } });
  game.combat = makeCombat([c]);
  await onUseItem(moduleApi, { actor: { id: 'a1' }, type: 'spell', system: { level: 0 }, name: 'Fire Bolt' });
  assert.equal(c.getFlag(MODULE_ID, FLAGS.LAST_ACTION), 'cantrip');
});

test('onUseItem: no-ops without combat/core/combatant', async () => {
  game.combat = null;
  await onUseItem(moduleApi, { actor: { id: 'a1' } });
  game.combat = makeCombat([]);
  game.settings.set(MODULE_ID, SETTINGS.ENABLE_CORE, false);
  await onUseItem(moduleApi, { actor: { id: 'a1' } });
  game.settings.set(MODULE_ID, SETTINGS.ENABLE_CORE, true);
  await onUseItem(moduleApi, { actor: { id: 'missing' }, name: 'Sword' });
});

test('onPreRollInitiative: no-ops when settings off', () => {
  game.settings.set(MODULE_ID, SETTINGS.ENABLE_CORE, false);
  const rollData = { formula: '1d20' };
  assert.equal(onPreRollInitiative(moduleApi, { id: 'a', system: { attributes: { init: {} } } }, rollData), undefined);
  game.settings.set(MODULE_ID, SETTINGS.ENABLE_CORE, true);
  game.settings.set(MODULE_ID, SETTINGS.AUTO_SIZE_INIT_DIE, false);
  assert.equal(onPreRollInitiative(moduleApi, { id: 'a', system: { attributes: { init: {} } } }, rollData), undefined);
});

test('onPreRollInitiative: sets formula for advantage and disadvantage', async () => {
  game.settings.set(MODULE_ID, SETTINGS.AUTO_SIZE_INIT_DIE, true);
  const c = makeCombatant({ actor: { id: 'a1' } });
  game.combat = makeCombat([c]);

  const adv = {};
  assert.equal(
    onPreRollInitiative(
      moduleApi,
      { id: 'a1', system: { traits: { size: 'large' }, attributes: { init: { advantage: true } } } },
      adv
    ),
    true
  );
  assert.equal(adv.formula, '2d10kl');
  assert.deepEqual(adv.parts, []);

  const dis = {};
  onPreRollInitiative(
    moduleApi,
    { id: 'a1', system: { traits: { size: 'large' }, attributes: { init: { disadvantage: true } } } },
    dis
  );
  assert.equal(dis.formula, '2d10kh');
});

test('onPreRollInitiative: works without combatant in combat', () => {
  game.combat = makeCombat([]);
  const rollData = {};
  assert.equal(
    onPreRollInitiative(
      moduleApi,
      { id: 'nobody', system: { traits: { size: 'tiny' }, attributes: { init: {} } } },
      rollData
    ),
    true
  );
  assert.equal(rollData.formula, 'd4');
});

test('onRollInitiative: applies phase from roll total', async () => {
  const c = makeCombatant({
    actor: { id: 'a1', system: { attributes: { init: { bonus: 2 } } } }
  });
  game.combat = makeCombat([c]);
  await onRollInitiative(moduleApi, { id: 'a1', system: { attributes: { init: { bonus: 2 } } } }, { total: 9 });
  // phase = max(1, min(9-2, 10)) = 7
  assert.equal(c.getFlag(MODULE_ID, FLAGS.CURRENT_PHASE), 7);
  assert.equal(c.initiative, (11 - 7) * 10);
});

test('onRollInitiative: no-ops without core/combatant', async () => {
  game.settings.set(MODULE_ID, SETTINGS.ENABLE_CORE, false);
  await onRollInitiative(moduleApi, { id: 'a' }, { total: 5 });
  game.settings.set(MODULE_ID, SETTINGS.ENABLE_CORE, true);
  game.combat = makeCombat([]);
  await onRollInitiative(moduleApi, { id: 'a' }, { total: 5 });
});

test('getActionTypeFromItem: covered for import side-effect completeness', () => {
  assert.equal(getActionTypeFromItem({ type: 'spell', system: { level: 0 } }), 'cantrip');
});
