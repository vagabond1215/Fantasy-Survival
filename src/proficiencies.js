import store from './state.js';

export const PROFICIENCY_DEFINITIONS = [
  {
    id: 'hunting',
    name: 'Hunting',
    description: 'Tracking, stalking, and harvesting wild game.',
    baseRate: 1.1,
    defaultComplexity: 45,
    diminishing: 0.9,
    startLevel: 5
  },
  {
    id: 'foraging',
    name: 'Foraging',
    description: 'Identifying edible and medicinal plants in the wild.',
    baseRate: 0.95,
    defaultComplexity: 32,
    diminishing: 0.75,
    startLevel: 5
  },
  {
    id: 'gathering',
    name: 'Gathering',
    description: 'Collecting loose resources such as branches, stone, and salvage.',
    baseRate: 0.9,
    defaultComplexity: 24,
    diminishing: 0.7,
    startLevel: 5
  },
  {
    id: 'swimming',
    name: 'Swimming',
    description: 'Crossing rivers, lakes, and flooded ground without aid.',
    baseRate: 0.8,
    defaultComplexity: 38,
    diminishing: 1.2,
    startLevel: 1
  },
  {
    id: 'woodcutting',
    name: 'Tree Felling',
    description: 'Cutting timber, pruning, and shaping wood.',
    baseRate: 1,
    defaultComplexity: 40,
    diminishing: 0.95,
    startLevel: 5
  },
  {
    id: 'crafting',
    name: 'Crafting',
    description: 'Hand crafting tools, garments, and trade goods.',
    baseRate: 0.92,
    defaultComplexity: 36,
    diminishing: 0.85,
    startLevel: 5
  },
  {
    id: 'construction',
    name: 'Construction',
    description: 'Coordinating and executing building projects.',
    baseRate: 0.9,
    defaultComplexity: 44,
    diminishing: 1,
    startLevel: 5
  },
  {
    id: 'combat',
    name: 'Combat Readiness',
    description: 'Armed drills, patrol discipline, and tactical awareness.',
    baseRate: 1.05,
    defaultComplexity: 55,
    diminishing: 1.1,
    startLevel: 5
  }
];

const DEFINITION_MAP = new Map(PROFICIENCY_DEFINITIONS.map(def => [def.id, def]));

const ORDER_PROFICIENCY_MAP = {
  hunting: 'hunting',
  gathering: 'gathering',
  crafting: 'crafting',
  building: 'construction',
  combat: 'combat'
};

const DEFAULT_ORDER_COMPLEXITY = {
  hunting: 48,
  gathering: 26,
  crafting: 38,
  building: 46,
  combat: 60
};

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function ensureProficiencyState() {
  if (!(store.proficiencies instanceof Map)) {
    store.proficiencies = new Map();
  }
  PROFICIENCY_DEFINITIONS.forEach(def => {
    if (!store.proficiencies.has(def.id)) {
      store.proficiencies.set(def.id, {
        id: def.id,
        level: def.startLevel ?? 1,
        lastComplexity: def.defaultComplexity,
        lastUpdated: Date.now()
      });
    }
  });
  return store.proficiencies;
}

export function getProficiency(id) {
  const map = ensureProficiencyState();
  const def = DEFINITION_MAP.get(id);
  const entry = map.get(id);
  if (!def) {
    return {
      id,
      name: id,
      level: entry?.level ?? 1,
      lastComplexity: entry?.lastComplexity ?? 0
    };
  }
  return {
    id: def.id,
    name: def.name,
    description: def.description,
    level: entry?.level ?? def.startLevel ?? 1,
    lastComplexity: entry?.lastComplexity ?? def.defaultComplexity
  };
}

export function getProficiencyLevel(id) {
  return getProficiency(id).level;
}

export function getProficiencies() {
  ensureProficiencyState();
  return PROFICIENCY_DEFINITIONS.map(def => getProficiency(def.id));
}

function effortFactor(hours = 0) {
  const numeric = Number.isFinite(hours) ? Math.max(0, hours) : 0;
  if (numeric <= 0) return 0;
  return Math.log10(numeric + 1) + 1;
}

function resolveDefinition(id) {
  const def = DEFINITION_MAP.get(id);
  if (!def) return null;
  ensureProficiencyState();
  return def;
}

export function recordTaskCompletion({
  proficiencyId,
  complexity,
  effortHours,
  success = true
} = {}) {
  const def = resolveDefinition(proficiencyId);
  if (!def) return null;
  const map = ensureProficiencyState();
  const state = map.get(proficiencyId) || {
    id: proficiencyId,
    level: def.startLevel ?? 1,
    lastComplexity: def.defaultComplexity,
    lastUpdated: Date.now()
  };
  const currentLevel = Number.isFinite(state.level) ? state.level : def.startLevel ?? 1;
  const normalizedComplexity = clamp(
    Number.isFinite(complexity) ? complexity : def.defaultComplexity,
    1,
    200
  );
  const effort = effortFactor(effortHours);
  if (effort <= 0) {
    return { id: def.id, name: def.name, level: currentLevel, gained: 0, previousLevel: currentLevel };
  }
  const diminishing = def.diminishing ?? 1;
  const difficultyFactor = normalizedComplexity /
    (normalizedComplexity + Math.max(0, currentLevel - 1) * diminishing);
  const rate = def.baseRate ?? 1;
  const successFactor = success ? 1 : 0.35;
  const gained = rate * effort * difficultyFactor * successFactor;
  const newLevel = clamp(currentLevel + gained, 1, 100);
  map.set(proficiencyId, {
    id: proficiencyId,
    level: newLevel,
    lastComplexity: normalizedComplexity,
    lastUpdated: Date.now()
  });
  return {
    id: def.id,
    name: def.name,
    level: newLevel,
    gained: newLevel - currentLevel,
    previousLevel: currentLevel
  };
}

export function rewardOrderProficiency(order, options = {}) {
  if (!order) return null;
  const proficiencyId =
    options.proficiencyId || order.metadata?.proficiencyId || ORDER_PROFICIENCY_MAP[order.type];
  if (!proficiencyId) return null;
  const def = resolveDefinition(proficiencyId);
  if (!def) return null;
  const complexity = options.complexity ?? order.metadata?.taskComplexity ?? order.metadata?.baseComplexity ??
    DEFAULT_ORDER_COMPLEXITY[order.type] ?? def.defaultComplexity;
  const workers = Number.isFinite(order.workers) ? Math.max(1, order.workers) : 1;
  const duration = Number.isFinite(order.durationHours) ? Math.max(1, order.durationHours) : 1;
  const effortHours = options.effortHours ?? order.metadata?.effortHours ?? workers * duration;
  const success = options.success !== false;
  return recordTaskCompletion({
    proficiencyId,
    complexity,
    effortHours,
    success
  });
}

export function inferOrderProficiency(type) {
  return ORDER_PROFICIENCY_MAP[type] || null;
}
