/**
 * Minimal Foundry VTT mocks for Lisa's Angry Initiative unit tests.
 */

export function createHooksMock() {
  const handlers = new Map();
  let nextId = 1;
  return {
    on(event, fn) {
      const id = nextId++;
      const list = handlers.get(event) ?? [];
      list.push({ id, fn });
      handlers.set(event, list);
      return id;
    },
    once(event, fn) {
      return this.on(event, fn);
    },
    off(event, idOrFn) {
      const list = handlers.get(event);
      if (!list) return;
      handlers.set(event, list.filter((h) => h.id !== idOrFn && h.fn !== idOrFn));
    },
    call(event, ...args) {
      for (const h of handlers.get(event) ?? []) h.fn(...args);
    },
    getHandlers(event) {
      return (handlers.get(event) ?? []).map((h) => h.fn);
    },
    count(event) {
      return (handlers.get(event) ?? []).length;
    }
  };
}

export function createSettingsMock(defaults = {}) {
  const store = new Map(Object.entries(defaults));
  const registrations = [];
  return {
    register(module, key, data) {
      registrations.push({ module, key, data });
      if (!store.has(`${module}.${key}`)) {
        store.set(`${module}.${key}`, data.default);
      }
    },
    get(module, key) {
      const k = `${module}.${key}`;
      if (!store.has(k)) throw new Error(`setting not registered: ${k}`);
      return store.get(k);
    },
    set(module, key, value) {
      store.set(`${module}.${key}`, value);
      return Promise.resolve(value);
    },
    _store: store,
    _registrations: registrations
  };
}

export function createGameMock(overrides = {}) {
  const settings = createSettingsMock({
    'lisas-angry-initiative.enableCore': true,
    'lisas-angry-initiative.autoSizeInitDie': true,
    'lisas-angry-initiative.blockReactionsWhileRecovering': true,
    'lisas-angry-initiative.knockbackThreshold': 0,
    'lisas-angry-initiative.showPhaseVisuals': true
  });

  const users = [];
  users.filter = Array.prototype.filter.bind(users);

  const moduleCache = new Map();
  moduleCache.set('lisas-angry-initiative', { id: 'lisas-angry-initiative', api: null });

  return {
    settings,
    user: { id: 'gm-1', isGM: true, active: true },
    users,
    combat: null,
    modules: {
      get(id) {
        return moduleCache.get(id) ?? null;
      },
      _cache: moduleCache
    },
    i18n: {
      localize(key) {
        return key;
      },
      format(key, data) {
        return `${key}|${JSON.stringify(data ?? {})}`;
      }
    },
    ...overrides
  };
}

export function createUiMock() {
  const calls = { info: [], warn: [], error: [] };
  return {
    notifications: {
      info(msg) {
        calls.info.push(msg);
      },
      warn(msg) {
        calls.warn.push(msg);
      },
      error(msg) {
        calls.error.push(msg);
      }
    },
    _calls: calls
  };
}

export class MockRoll {
  constructor(formula) {
    this.formula = formula;
    this.total = 5;
    this.options = {};
  }

  async evaluate() {
    return this;
  }

  async toMessage() {
    return { id: 'msg-1' };
  }
}

export function installGlobals(extra = {}) {
  const game = createGameMock(extra.game);
  const ui = createUiMock();
  const Hooks = createHooksMock();

  globalThis.game = game;
  globalThis.ui = ui;
  globalThis.Hooks = Hooks;
  globalThis.Roll = MockRoll;
  globalThis.ChatMessage = {
    getSpeaker({ actor } = {}) {
      return { actor: actor?.id ?? null };
    },
    create: async (data) => data
  };
  globalThis.Dialog = {
    confirm: async () => true
  };
  globalThis.foundry = {
    applications: {
      api: {
        DialogV2: {
          wait: async () => null
        }
      }
    }
  };
  globalThis.FormDataExtended = class {
    constructor(form) {
      this.object = form?._object ?? {};
    }
  };
  globalThis.canvas = {
    tokens: {
      get: () => null
    }
  };

  if (!globalThis.$) {
    globalThis.$ = jqueryLite;
  }

  return { game, ui, Hooks };
}

/** Minimal jQuery-like surface used by ui-handlers. */
function jqueryLite(input) {
  const nodes = normalizeNodes(input);
  const api = {
    jquery: true,
    length: nodes.length,
    find(selector) {
      const found = [];
      for (const n of nodes) {
        if (n?.matches?.(selector)) found.push(n);
        if (!n?.querySelectorAll) continue;
        found.push(...n.querySelectorAll(selector));
      }
      return jqueryLite(found);
    },
    remove() {
      for (const n of nodes) n?.remove?.();
      return api;
    },
    append(child) {
      const toAdd = child?.jquery
        ? Array.from({ length: child.length }, (_, i) => child[i]).filter(Boolean)
        : [child];
      for (const n of nodes) {
        if (!n?.appendChild) continue;
        for (const el of toAdd) {
          if (el) n.appendChild(el);
        }
      }
      return api;
    },
    on(event, handler) {
      for (const n of nodes) n?.addEventListener?.(event, handler);
      return api;
    },
    val() {
      return nodes[0]?.value;
    },
    each(fn) {
      nodes.forEach((n, i) => fn(i, n));
      return api;
    }
  };
  for (let i = 0; i < nodes.length; i++) {
    Object.defineProperty(api, i, {
      value: nodes[i],
      enumerable: true,
      configurable: true
    });
  }
  return api;
}

function normalizeNodes(input) {
  if (input == null) return [];
  if (typeof input === 'string') {
    if (typeof document === 'undefined') return [];
    const wrap = document.createElement('div');
    wrap.innerHTML = input.trim();
    return Array.from(wrap.children);
  }
  if (input.jquery) {
    const out = [];
    for (let i = 0; i < input.length; i++) {
      if (input[i]) out.push(input[i]);
    }
    return out;
  }
  if (Array.isArray(input)) return input.filter(Boolean);
  if (typeof NodeList !== 'undefined' && input instanceof NodeList) return Array.from(input);
  return [input];
}

export function makeCombatant(overrides = {}) {
  const flags = new Map();
  const combatant = {
    id: overrides.id ?? 'c1',
    name: overrides.name ?? 'Fighter',
    tokenId: overrides.tokenId ?? 'tok-1',
    token: overrides.token ?? { id: overrides.tokenId ?? 'tok-1' },
    isOwner: overrides.isOwner ?? true,
    initiative: overrides.initiative ?? null,
    combat: overrides.combat ?? null,
    actor: overrides.actor ?? {
      id: overrides.actorId ?? 'a1',
      name: 'Fighter',
      system: {
        traits: { size: 'medium' },
        attributes: { init: { bonus: 0 } }
      },
      items: [],
      statuses: new Set()
    },
    async setFlag(module, key, value) {
      flags.set(`${module}.${key}`, value);
      return value;
    },
    getFlag(module, key) {
      return flags.get(`${module}.${key}`);
    },
    async unsetFlag(module, key) {
      flags.delete(`${module}.${key}`);
    },
    async update(data) {
      Object.assign(combatant, data);
      return combatant;
    },
    testUserPermission(user, level) {
      if (overrides.owners) return overrides.owners.includes(user.id);
      return level === 'OWNER' && combatant.isOwner;
    },
    _flags: flags,
    ...overrides
  };
  if (overrides.flags) {
    for (const [k, v] of Object.entries(overrides.flags)) {
      flags.set(`lisas-angry-initiative.${k}`, v);
    }
  }
  return combatant;
}

export function makeCombat(combatants = []) {
  const map = new Map(combatants.map((c) => [c.id, c]));
  const combat = {
    combatants: {
      size: map.size,
      get(id) {
        return map.get(id);
      },
      find(fn) {
        for (const c of map.values()) if (fn(c)) return c;
        return undefined;
      },
      *[Symbol.iterator]() {
        yield* map.values();
      },
      map(fn) {
        return Array.from(map.values()).map(fn);
      }
    },
    turns: combatants,
    turn: 0,
    started: true,
    previous: {},
    combatant: combatants[0] ?? null,
    async updateEmbeddedDocuments(_type, updates) {
      return updates;
    }
  };
  for (const c of combatants) c.combat = combat;
  return combat;
}
