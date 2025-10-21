import store from './state.js';

const technologyDefinitions = [
  {
    id: 'basic-tools',
    name: 'Basic Tools',
    category: 'Woodworking',
    order: 10,
    description:
      'Stone and bone implements along with cordage techniques that let settlers work timber and hides reliably.',
    prerequisites: [],
    cost: {
      research: 25,
      materials: { 'plant fibers': 12, cord: 6, 'sharpened stone': 4 }
    },
    effects: {
      description: 'Unlocks foundational woodworking structures, recipes, and primitive gear.',
      unlocks: {
        buildings: ['drying-rack', 'hunter-blind', 'workshop', 'smokehouse', 'longhouse', 'watchtower'],
        recipes: [
          'cord',
          'sharpened-stone',
          'prepared-hides',
          'seasoned-wood',
          'rendered-tallow',
          'grain-flour',
          'hearty-stew',
          'traveler-flatbread',
          'herbal-porridge',
          'smoke-cured-provisions',
          'pickled-vegetables',
          'aromatic-sachets',
          'herbal-poultice',
          'restorative-tonic',
          'soothing-salve',
          'arrow-bundle',
          'stone-hand-axe',
          'stone-pick'
        ],
        equipment: ['stone knife', 'wooden hammer', 'stone hand axe', 'stone pick', 'bow', 'wooden arrow', 'leather armor'],
        technologies: []
      }
    }
  },
  {
    id: 'metalworking-basics',
    name: 'Metalworking Basics',
    category: 'Metalworking',
    order: 20,
    description: 'Clay forges, bellows, and charcoal production that allow smiths to shape soft metals.',
    prerequisites: ['basic-tools'],
    cost: {
      research: 80,
      materials: { charcoal: 12, clay: 10, 'crafted goods': 4 }
    },
    effects: {
      description: 'Opens the path toward bronze alloys and improved forging stations.',
      unlocks: {
        technologies: ['bronze-smithing'],
        recipes: [],
        buildings: [],
        equipment: []
      }
    }
  },
  {
    id: 'bronze-smithing',
    name: 'Bronze Smithing',
    category: 'Metalworking',
    order: 30,
    description: 'Copper and tin alloys hammered into resilient edges and scales.',
    prerequisites: ['metalworking-basics'],
    cost: {
      research: 120,
      materials: { 'bronze ingot': 4, charcoal: 8 }
    },
    effects: {
      description: 'Enables bronze tools, armor, and the knowledge required to tackle harder metals.',
      unlocks: {
        technologies: ['iron-smithing'],
        recipes: ['bronze-ingot', 'bronze-axe', 'bronze-pick'],
        buildings: [],
        equipment: ['bronze axe', 'bronze pick', 'bronze scale armor']
      }
    }
  },
  {
    id: 'iron-smithing',
    name: 'Iron Smithing',
    category: 'Metalworking',
    order: 40,
    description: 'Bloom refining, quenching, and tempering techniques for wrought iron.',
    prerequisites: ['bronze-smithing'],
    cost: {
      research: 160,
      materials: { 'iron ingot': 4, charcoal: 12 }
    },
    effects: {
      description: 'Unlocks ironwork recipes and arms the settlement with tougher implements.',
      unlocks: {
        technologies: ['steel-smithing'],
        recipes: ['iron-ingot', 'iron-axe', 'iron-pick'],
        buildings: [],
        equipment: ['iron axe', 'iron pick', 'iron chainmail']
      }
    }
  },
  {
    id: 'steel-smithing',
    name: 'Steel Smithing',
    category: 'Metalworking',
    order: 50,
    description: 'High-heat furnaces, folding, and oil quenching that create elite steel arms and armor.',
    prerequisites: ['iron-smithing'],
    cost: {
      research: 220,
      materials: { 'steel ingot': 4, charcoal: 16 }
    },
    effects: {
      description: 'Completes the smithing ladder with access to superior weapons and armor.',
      unlocks: {
        technologies: [],
        recipes: ['steel-ingot', 'steel-axe', 'steel-pick'],
        buildings: [],
        equipment: ['steel axe', 'steel pick', 'steel plate']
      }
    }
  },
  {
    id: 'defense-drills',
    name: 'Defense Drills',
    category: 'Fortifications',
    order: 60,
    description: 'Coordinated watches, signal calls, and militia routines to hold the palisade.',
    prerequisites: ['basic-tools'],
    cost: {
      research: 100,
      materials: { 'crafted goods': 6, firewood: 40 }
    },
    effects: {
      description: 'Strengthens vigilance and readies the village for broader alliances.',
      unlocks: {
        technologies: ['regional-alliance'],
        recipes: [],
        buildings: [],
        equipment: []
      }
    }
  },
  {
    id: 'regional-alliance',
    name: 'Regional Alliance',
    category: 'Fortifications',
    order: 70,
    description: 'Treaties, signal braziers, and trade obligations with neighboring strongholds.',
    prerequisites: ['defense-drills'],
    cost: {
      research: 180,
      materials: { 'crafted goods': 8, preservedFood: 20 }
    },
    effects: {
      description: 'Broadens diplomacy, bringing aid and prestige to the settlement.',
      unlocks: {
        technologies: [],
        recipes: [],
        buildings: [],
        equipment: []
      }
    }
  }
];

export function listTechnologyDefinitions() {
  return technologyDefinitions.map(def => ({ ...def }));
}

export function getTechnologyDefinition(id) {
  if (!id && id !== 0) return null;
  const normalized = String(id);
  return technologyDefinitions.find(def => def.id === normalized) || null;
}

const registry = new Map();
let registryInitialized = false;

function ensureTechnologyMap() {
  const current = store.technologies;
  if (current instanceof Map) {
    return;
  }
  if (Array.isArray(current)) {
    store.technologies = new Map(current);
    return;
  }
  if (current && typeof current === 'object') {
    store.technologies = new Map(Object.entries(current));
    return;
  }
  store.technologies = new Map();
}

function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

function coerceTimestamp(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isFinite(time) ? time : null;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeDefinition(definition) {
  if (!definition?.id) return null;
  const id = String(definition.id);
  if (registry.has(id)) {
    return registry.get(id);
  }
  const prerequisites = Array.isArray(definition.prerequisites)
    ? definition.prerequisites.filter(Boolean).map(value => String(value))
    : [];
  const cost = definition.cost
    ? {
        research: Number.isFinite(definition.cost.research) ? Math.max(0, definition.cost.research) : null,
        materials: definition.cost.materials ? { ...definition.cost.materials } : {}
      }
    : null;
  const unlocks = definition.effects?.unlocks || {};
  const normalized = {
    id,
    name: definition.name || id,
    category: definition.category || null,
    description: definition.description || '',
    order: Number.isFinite(definition.order) ? definition.order : 0,
    prerequisites,
    cost,
    effects: {
      description: definition.effects?.description || '',
      unlocks: {
        technologies: Array.isArray(unlocks.technologies)
          ? unlocks.technologies.map(value => String(value))
          : [],
        recipes: Array.isArray(unlocks.recipes) ? unlocks.recipes.map(value => String(value)) : [],
        buildings: Array.isArray(unlocks.buildings) ? unlocks.buildings.map(value => String(value)) : [],
        equipment: Array.isArray(unlocks.equipment) ? unlocks.equipment.map(value => String(value)) : []
      }
    }
  };
  registry.set(id, normalized);
  return normalized;
}

function normalizeStateFromDefinition(definition, raw = {}) {
  const base = raw && typeof raw === 'object' ? raw : {};
  const unlocked = base.unlocked === true;
  const discovered = base.discovered === true || unlocked;
  const progress = clamp01(
    Number.isFinite(base.progress) ? base.progress : unlocked ? 1 : 0
  );
  const label = base.label || base.name || definition.name;
  const unlockedAt = coerceTimestamp(base.unlockedAt);
  const notes = typeof base.notes === 'string' && base.notes.trim() ? base.notes : null;
  return {
    id: definition.id,
    unlocked,
    discovered,
    progress,
    unlockedAt,
    label,
    notes
  };
}

function normalizeLegacyState(id, raw = {}) {
  const base = raw && typeof raw === 'object' ? raw : {};
  const unlocked = base.unlocked === true || (!('unlocked' in base) && Boolean(base.name));
  const discovered = base.discovered === true || unlocked;
  const progress = clamp01(
    Number.isFinite(base.progress) ? base.progress : unlocked ? 1 : 0
  );
  const label = base.label || base.name || String(id);
  const unlockedAt = coerceTimestamp(base.unlockedAt);
  const notes = typeof base.notes === 'string' && base.notes.trim() ? base.notes : null;
  return {
    id: String(id),
    unlocked,
    discovered,
    progress,
    unlockedAt,
    label,
    notes
  };
}

function syncTechnologyState() {
  ensureTechnologyMap();
  const updated = new Map();
  registry.forEach(definition => {
    const current = store.technologies.get(definition.id);
    const normalized = normalizeStateFromDefinition(definition, current || { id: definition.id });
    updated.set(definition.id, normalized);
  });
  store.technologies.forEach((value, id) => {
    if (updated.has(id)) return;
    const normalized = normalizeLegacyState(id, value || { id });
    updated.set(id, normalized);
  });
  store.technologies.clear();
  updated.forEach((value, id) => {
    store.technologies.set(id, value);
  });
}

export function initializeTechnologyRegistry() {
  if (!registryInitialized) {
    listTechnologyDefinitions().forEach(def => {
      normalizeDefinition(def);
    });
    registryInitialized = true;
  }
  syncTechnologyState();
}

function requireDefinition(id) {
  if (!id && id !== 0) return null;
  const normalizedId = String(id);
  if (registry.has(normalizedId)) {
    return registry.get(normalizedId);
  }
  const defined = getTechnologyDefinition(normalizedId);
  if (defined) {
    return normalizeDefinition(defined);
  }
  return null;
}

function ensureTechnologyState(id) {
  const normalizedId = String(id);
  ensureTechnologyMap();
  if (!store.technologies.has(normalizedId)) {
    const def = requireDefinition(normalizedId);
    const state = def
      ? normalizeStateFromDefinition(def, { id: normalizedId })
      : normalizeLegacyState(normalizedId, { id: normalizedId });
    store.technologies.set(normalizedId, state);
  }
  return store.technologies.get(normalizedId);
}

export function unlockTechnology(tech, options = {}) {
  initializeTechnologyRegistry();
  const id = typeof tech === 'string' || typeof tech === 'number' ? tech : tech?.id;
  if (!id && id !== 0) return null;
  const normalizedId = String(id);
  const def = requireDefinition(normalizedId) || (typeof tech === 'object' ? normalizeDefinition(tech) : null);
  const previous = ensureTechnologyState(normalizedId);
  const timestamp = Number.isFinite(options.unlockedAt) ? options.unlockedAt : Date.now();
  const nextStateSource = {
    ...previous,
    ...(typeof tech === 'object' ? tech : {}),
    id: normalizedId,
    unlocked: true,
    discovered: true,
    progress: 1,
    unlockedAt: previous?.unlockedAt ?? timestamp,
    label: (typeof tech === 'object' && tech?.name) || previous?.label || def?.name || normalizedId
  };
  const normalized = def
    ? normalizeStateFromDefinition(def, nextStateSource)
    : normalizeLegacyState(normalizedId, nextStateSource);
  normalized.unlocked = true;
  normalized.discovered = true;
  normalized.progress = 1;
  if (!normalized.unlockedAt) {
    normalized.unlockedAt = timestamp;
  }
  store.technologies.set(normalizedId, normalized);
  return normalized;
}

export function hasTechnology(id) {
  if (!id && id !== 0) return false;
  initializeTechnologyRegistry();
  const state = ensureTechnologyState(id);
  return Boolean(state?.unlocked);
}

export function getTechnologyState(id) {
  if (!id && id !== 0) return null;
  initializeTechnologyRegistry();
  return ensureTechnologyState(id);
}

export function getTechnology(id) {
  if (!id && id !== 0) return null;
  initializeTechnologyRegistry();
  const normalizedId = String(id);
  const definition = requireDefinition(normalizedId);
  const state = ensureTechnologyState(normalizedId);
  const prerequisites = definition?.prerequisites || [];
  const missingPrerequisites = prerequisites.filter(req => !hasTechnology(req));
  return {
    id: normalizedId,
    definition: definition || null,
    state,
    unlocked: Boolean(state?.unlocked),
    discovered: Boolean(state?.discovered),
    prerequisites,
    missingPrerequisites,
    available: Boolean(state && !state.unlocked && missingPrerequisites.length === 0)
  };
}

export function listTechnologiesWithStatus() {
  initializeTechnologyRegistry();
  const entries = [];
  registry.forEach(definition => {
    const state = ensureTechnologyState(definition.id);
    const missingPrerequisites = definition.prerequisites.filter(req => !hasTechnology(req));
    entries.push({
      id: definition.id,
      definition,
      state,
      unlocked: Boolean(state?.unlocked),
      discovered: Boolean(state?.discovered),
      available: Boolean(!state?.unlocked && missingPrerequisites.length === 0),
      prerequisites: [...definition.prerequisites],
      missingPrerequisites
    });
  });
  return entries.sort((a, b) => {
    const orderA = Number.isFinite(a.definition.order) ? a.definition.order : 0;
    const orderB = Number.isFinite(b.definition.order) ? b.definition.order : 0;
    if (orderA !== orderB) return orderA - orderB;
    return a.definition.name.localeCompare(b.definition.name);
  });
}

export function allTechnologies() {
  return listTechnologiesWithStatus().map(entry => ({
    ...entry.definition,
    state: entry.state,
    unlocked: entry.unlocked,
    discovered: entry.discovered,
    prerequisites: entry.prerequisites,
    missingPrerequisites: entry.missingPrerequisites,
    available: entry.available
  }));
}

export function getTechnologyLabel(id) {
  if (!id && id !== 0) return '';
  const normalizedId = String(id);
  const definition = requireDefinition(normalizedId);
  if (definition?.name) return definition.name;
  const state = store.technologies instanceof Map ? store.technologies.get(normalizedId) : null;
  if (state?.label) return state.label;
  return normalizedId
    .split(/[-_]/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

initializeTechnologyRegistry();

export { syncTechnologyState as synchronizeTechnologyState };
