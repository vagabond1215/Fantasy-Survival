const DEFAULT_TIER_LABELS = {
  primitive: 'Primitive',
  bronze: 'Bronze',
  iron: 'Iron',
  steel: 'Steel'
};

function titleCase(input = '') {
  return String(input)
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function normalizeMaterials(materials) {
  if (!Array.isArray(materials)) return [];
  return materials
    .map(entry => {
      if (!entry) return null;
      if (typeof entry === 'string') {
        return { item: entry, quantity: 1 };
      }
      if (typeof entry === 'object') {
        const id = entry.item || entry.id || entry.name;
        if (!id) return null;
        const quantity = Number.isFinite(entry.quantity) && entry.quantity > 0 ? entry.quantity : 1;
        return { item: String(id), quantity };
      }
      return null;
    })
    .filter(Boolean);
}

function normalizeEquipment(spec) {
  if (!spec || !spec.id) {
    throw new Error('Equipment entries must include an id.');
  }
  const tier = spec.tier || 'primitive';
  const label = spec.label || spec.name || titleCase(spec.id);
  const tierLabel = spec.tierLabel || DEFAULT_TIER_LABELS[tier] || titleCase(tier);
  return Object.freeze({
    id: String(spec.id),
    label,
    category: spec.category || 'tool',
    role: spec.role || spec.type || null,
    tier,
    tierLabel,
    icon: spec.icon || '🎒',
    stats: spec.stats || {},
    materials: normalizeMaterials(spec.materials),
    durability: Number.isFinite(spec.durability) ? Math.max(1, Math.round(spec.durability)) : null,
    requiredTech: spec.requiredTech || null
  });
}

const EQUIPMENT_ITEMS = [
  normalizeEquipment({
    id: 'stone knife',
    label: 'Stone Knife',
    category: 'weapon',
    role: 'blade',
    tier: 'primitive',
    icon: '🔪',
    stats: { damage: 3, utility: 2 },
    materials: ['sharpened stone', 'cord', 'straight branch'],
    durability: 25,
    requiredTech: 'basic-tools'
  }),
  normalizeEquipment({
    id: 'wooden hammer',
    label: 'Wooden Hammer',
    category: 'tool',
    role: 'hammer',
    tier: 'primitive',
    icon: '🔨',
    stats: { damage: 1, utility: 3 },
    materials: ['seasoned wood', 'cord'],
    durability: 40,
    requiredTech: 'basic-tools'
  }),
  normalizeEquipment({
    id: 'stone hand axe',
    label: 'Stone Hand Axe',
    category: 'tool',
    role: 'axe',
    tier: 'primitive',
    icon: '🪓',
    stats: { damage: 4, utility: 3 },
    materials: ['sturdy haft stick', 'cord', 'sharpened stone'],
    durability: 45,
    requiredTech: 'basic-tools'
  }),
  normalizeEquipment({
    id: 'stone pick',
    label: 'Stone Pick',
    category: 'tool',
    role: 'pick',
    tier: 'primitive',
    icon: '⛏️',
    stats: { damage: 3, utility: 4 },
    materials: ['sturdy haft stick', 'cord', 'sharpened stone'],
    durability: 40,
    requiredTech: 'basic-tools'
  }),
  normalizeEquipment({
    id: 'bow',
    label: 'Self Bow',
    category: 'weapon',
    role: 'bow',
    tier: 'primitive',
    icon: '🏹',
    stats: { damage: 5 },
    materials: ['seasoned wood', 'cord', 'plant fibers'],
    durability: 55,
    requiredTech: 'basic-tools'
  }),
  normalizeEquipment({
    id: 'wooden arrow',
    label: 'Wooden Arrows',
    category: 'weapon',
    role: 'ammunition',
    tier: 'primitive',
    icon: '🪶',
    stats: { damage: 2 },
    materials: ['straight branch', 'stone knife', 'plant fibers'],
    durability: 5,
    requiredTech: 'basic-tools'
  }),
  normalizeEquipment({
    id: 'leather armor',
    label: 'Leather Armor',
    category: 'armor',
    role: 'light-armor',
    tier: 'primitive',
    icon: '🥋',
    stats: { protection: 4 },
    materials: ['prepared hides', 'cord'],
    durability: 65,
    requiredTech: 'basic-tools'
  }),
  normalizeEquipment({
    id: 'bronze axe',
    label: 'Bronze Axe',
    category: 'tool',
    role: 'axe',
    tier: 'bronze',
    icon: '🪓',
    stats: { damage: 6, utility: 5 },
    materials: [
      { item: 'bronze ingot', quantity: 2 },
      { item: 'cord', quantity: 1 },
      { item: 'sturdy haft stick', quantity: 1 }
    ],
    durability: 70,
    requiredTech: 'bronze-smithing'
  }),
  normalizeEquipment({
    id: 'bronze pick',
    label: 'Bronze Pick',
    category: 'tool',
    role: 'pick',
    tier: 'bronze',
    icon: '⛏️',
    stats: { damage: 5, utility: 6 },
    materials: [
      { item: 'bronze ingot', quantity: 2 },
      { item: 'cord', quantity: 1 },
      { item: 'sturdy haft stick', quantity: 1 }
    ],
    durability: 75,
    requiredTech: 'bronze-smithing'
  }),
  normalizeEquipment({
    id: 'bronze scale armor',
    label: 'Bronze Scale Armor',
    category: 'armor',
    role: 'medium-armor',
    tier: 'bronze',
    icon: '🛡️',
    stats: { protection: 7 },
    materials: [
      { item: 'bronze ingot', quantity: 3 },
      { item: 'prepared hides', quantity: 2 },
      { item: 'cord', quantity: 1 }
    ],
    durability: 90,
    requiredTech: 'bronze-smithing'
  }),
  normalizeEquipment({
    id: 'iron axe',
    label: 'Iron Axe',
    category: 'tool',
    role: 'axe',
    tier: 'iron',
    icon: '🪓',
    stats: { damage: 7, utility: 7 },
    materials: [
      { item: 'iron ingot', quantity: 2 },
      { item: 'cord', quantity: 1 },
      { item: 'sturdy haft stick', quantity: 1 }
    ],
    durability: 90,
    requiredTech: 'iron-smithing'
  }),
  normalizeEquipment({
    id: 'iron pick',
    label: 'Iron Pick',
    category: 'tool',
    role: 'pick',
    tier: 'iron',
    icon: '⛏️',
    stats: { damage: 6, utility: 8 },
    materials: [
      { item: 'iron ingot', quantity: 2 },
      { item: 'cord', quantity: 1 },
      { item: 'sturdy haft stick', quantity: 1 }
    ],
    durability: 95,
    requiredTech: 'iron-smithing'
  }),
  normalizeEquipment({
    id: 'iron chainmail',
    label: 'Iron Chainmail',
    category: 'armor',
    role: 'medium-armor',
    tier: 'iron',
    icon: '🛡️',
    stats: { protection: 10 },
    materials: [
      { item: 'iron ingot', quantity: 4 },
      { item: 'prepared hides', quantity: 2 }
    ],
    durability: 120,
    requiredTech: 'iron-smithing'
  }),
  normalizeEquipment({
    id: 'steel axe',
    label: 'Steel Axe',
    category: 'tool',
    role: 'axe',
    tier: 'steel',
    icon: '🪓',
    stats: { damage: 8, utility: 9 },
    materials: [
      { item: 'steel ingot', quantity: 2 },
      { item: 'cord', quantity: 1 },
      { item: 'sturdy haft stick', quantity: 1 }
    ],
    durability: 110,
    requiredTech: 'steel-smithing'
  }),
  normalizeEquipment({
    id: 'steel pick',
    label: 'Steel Pick',
    category: 'tool',
    role: 'pick',
    tier: 'steel',
    icon: '⛏️',
    stats: { damage: 7, utility: 10 },
    materials: [
      { item: 'steel ingot', quantity: 2 },
      { item: 'cord', quantity: 1 },
      { item: 'sturdy haft stick', quantity: 1 }
    ],
    durability: 115,
    requiredTech: 'steel-smithing'
  }),
  normalizeEquipment({
    id: 'steel plate',
    label: 'Steel Plate Armor',
    category: 'armor',
    role: 'heavy-armor',
    tier: 'steel',
    icon: '🛡️',
    stats: { protection: 14 },
    materials: [
      { item: 'steel ingot', quantity: 5 },
      { item: 'leather armor', quantity: 1 }
    ],
    durability: 160,
    requiredTech: 'steel-smithing'
  })
];

const EQUIPMENT_BY_ID = new Map(EQUIPMENT_ITEMS.map(item => [item.id, item]));

export function listEquipment(filter = {}) {
  const { category, tier } = filter || {};
  return EQUIPMENT_ITEMS.filter(entry => {
    if (category && entry.category !== category) return false;
    if (tier && entry.tier !== tier) return false;
    return true;
  });
}

export function getEquipmentDefinition(id) {
  if (!id) return null;
  return EQUIPMENT_BY_ID.get(String(id)) || null;
}

export function isEquipment(id) {
  if (!id) return false;
  return EQUIPMENT_BY_ID.has(String(id));
}

export const EQUIPMENT_TIERS = Object.freeze(
  Array.from(new Set(EQUIPMENT_ITEMS.map(item => item.tier)))
);

export default {
  listEquipment,
  getEquipmentDefinition,
  isEquipment,
  EQUIPMENT_TIERS
};
