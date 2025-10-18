// @ts-nocheck
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
    id: 'tracking',
    name: 'Tracking',
    description: 'Reading prints, scat, and disturbances to follow prey or intruders.',
    baseRate: 1,
    defaultComplexity: 40,
    diminishing: 0.85,
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
    id: 'fishing',
    name: 'Fishing',
    description: 'Casting nets, setting lines, and harvesting aquatic life.',
    baseRate: 0.96,
    defaultComplexity: 34,
    diminishing: 0.82,
    startLevel: 5
  },
  {
    id: 'agriculture',
    name: 'Agriculture',
    description: 'Cultivating crops, tending soil, and rotating fields for food security.',
    baseRate: 0.94,
    defaultComplexity: 42,
    diminishing: 0.8,
    startLevel: 5
  },
  {
    id: 'herbalism',
    name: 'Herbalism',
    description: 'Harvesting, preparing, and preserving medicinal plants.',
    baseRate: 0.92,
    defaultComplexity: 36,
    diminishing: 0.78,
    startLevel: 5
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
    id: 'carpentry',
    name: 'Carpentry',
    description: 'Working seasoned lumber into beams, furniture, and fittings.',
    baseRate: 0.98,
    defaultComplexity: 44,
    diminishing: 0.9,
    startLevel: 5
  },
  {
    id: 'masonry',
    name: 'Stone Masonry',
    description: 'Shaping, laying, and mortaring stone for durable structures.',
    baseRate: 0.92,
    defaultComplexity: 50,
    diminishing: 0.88,
    startLevel: 5
  },
  {
    id: 'mining',
    name: 'Mining',
    description: 'Extracting ore, stone, and minerals safely from the earth.',
    baseRate: 0.9,
    defaultComplexity: 52,
    diminishing: 0.95,
    startLevel: 5
  },
  {
    id: 'smelting',
    name: 'Smelting',
    description: 'Refining ore in a furnace to produce workable metals.',
    baseRate: 0.88,
    defaultComplexity: 56,
    diminishing: 0.9,
    startLevel: 5
  },
  {
    id: 'smithing',
    name: 'Smithing',
    description: 'Forging, shaping, and tempering metal tools and weapons.',
    baseRate: 0.9,
    defaultComplexity: 58,
    diminishing: 0.92,
    startLevel: 5
  },
  {
    id: 'leatherworking',
    name: 'Leatherworking',
    description: 'Tanning hides and sewing them into garments, armor, and goods.',
    baseRate: 0.9,
    defaultComplexity: 40,
    diminishing: 0.82,
    startLevel: 5
  },
  {
    id: 'weaving',
    name: 'Weaving',
    description: 'Spinning fibers and weaving textiles for clothing and trade.',
    baseRate: 0.92,
    defaultComplexity: 42,
    diminishing: 0.8,
    startLevel: 5
  },
  {
    id: 'pottery',
    name: 'Pottery',
    description: 'Forming clay vessels and firing them for storage and trade.',
    baseRate: 0.88,
    defaultComplexity: 46,
    diminishing: 0.85,
    startLevel: 5
  },
  {
    id: 'crafting',
    name: 'General Crafting',
    description: 'Hand crafting tools, garments, and trade goods.',
    baseRate: 0.92,
    defaultComplexity: 36,
    diminishing: 0.85,
    startLevel: 5
  },
  {
    id: 'cooking',
    name: 'Cooking',
    description: 'Preparing meals, preserving food, and balancing flavours.',
    baseRate: 0.94,
    defaultComplexity: 30,
    diminishing: 0.76,
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
  const extraProficiencies = Array.isArray(order.metadata?.additionalProficiencies)
    ? order.metadata.additionalProficiencies
    : [];
  const result = recordTaskCompletion({
    proficiencyId,
    complexity,
    effortHours,
    success
  });
  extraProficiencies.forEach(entry => {
    const extraId = typeof entry === 'string' ? entry : entry?.id;
    if (!extraId || extraId === proficiencyId) return;
    const scale = typeof entry?.effortScale === 'number' && Number.isFinite(entry.effortScale)
      ? Math.max(0, entry.effortScale)
      : 0.5;
    if (scale <= 0) return;
    const extraComplexity = Number.isFinite(entry?.complexity)
      ? entry.complexity
      : complexity;
    recordTaskCompletion({
      proficiencyId: extraId,
      complexity: extraComplexity,
      effortHours: effortHours * scale,
      success
    });
  });
  return result;
}

export function inferOrderProficiency(type) {
  return ORDER_PROFICIENCY_MAP[type] || null;
}
