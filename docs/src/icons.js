import { listEquipment, getEquipmentDefinition } from './data/equipment.js';

const RESOURCE_ICON_MAP = {
  wood: { icon: '🪵', label: 'Wood' },
  firewood: { icon: '🪵', label: 'Firewood' },
  food: { icon: '🍲', label: 'Food Rations' },
  hides: { icon: '🦬', label: 'Animal Hides' },
  'small stones': { icon: '🪨', label: 'Small Stones' },
  pebbles: { icon: '⚪', label: 'Pebbles' },
  'crafted goods': { icon: '🧰', label: 'Crafted Goods' },
  'construction progress': { icon: '🏗️', label: 'Construction Progress' },
  preservedFood: { icon: '🥫', label: 'Preserved Food' },
  cookedMeals: { icon: '🍖', label: 'Cooked Meals' },
  hidesPrepared: { icon: '🧵', label: 'Prepared Hides' },
  mushrooms: { icon: '🍄', label: 'Mushrooms' },
  herbs: { icon: '🌿', label: 'Wild Herbs' },
  berries: { icon: '🍓', label: 'Wild Berries' },
  pinecones: { icon: '🌰', label: 'Pinecones' },
  'plant fibers': { icon: '🌾', label: 'Plant Fibers' },
  water: { icon: '💧', label: 'Water' },
  grain: { icon: '🌾', label: 'Grain' },
  'root vegetables': { icon: '🥕', label: 'Root Vegetables' },
  salt: { icon: '🧂', label: 'Salt' },
  spices: { icon: '🧄', label: 'Spices' },
  feathers: { icon: '🪶', label: 'Feathers' },
  'animal fat': { icon: '🧈', label: 'Animal Fat' },
  milk: { icon: '🥛', label: 'Milk' },
  cord: { icon: '🪢', label: 'Cord' },
  'sharpened stone': { icon: '🗡️', label: 'Sharpened Stone' },
  'straight branch': { icon: '🌿', label: 'Straight Branch' },
  'sturdy haft stick': { icon: '🥢', label: 'Sturdy Haft Stick' },
  'seasoned wood': { icon: '🪑', label: 'Seasoned Wood' },
  'prepared hides': { icon: '🧵', label: 'Prepared Hides' },
  'raw ore': { icon: '⛏️', label: 'Raw Ore' },
  'bronze ingot': { icon: '🔶', label: 'Bronze Ingot' },
  'iron ingot': { icon: '⛓️', label: 'Iron Ingot' },
  'steel ingot': { icon: '⚙️', label: 'Steel Ingot' },
  charcoal: { icon: '⬛', label: 'Charcoal' },
  clay: { icon: '🧱', label: 'Clay' },
  'rendered tallow': { icon: '🕯️', label: 'Rendered Tallow' },
  'ground flour': { icon: '🥣', label: 'Ground Flour' },
  'hearty meal': { icon: '🍲', label: 'Hearty Meal' },
  'bone broth': { icon: '🍜', label: 'Bone Broth' },
  "traveler's bread": { icon: '🥖', label: "Traveler's Bread" },
  'comfort meal': { icon: '🥣', label: 'Comfort Meal' },
  'smoked provisions': { icon: '🥩', label: 'Smoked Provisions' },
  'preserved vegetables': { icon: '🥬', label: 'Preserved Vegetables' },
  seeds: { icon: '🌱', label: 'Seeds' },
  'aromatic sachet': { icon: '🪷', label: 'Aromatic Sachet' },
  'herbal poultice': { icon: '🩹', label: 'Herbal Poultice' },
  'restorative tonic': { icon: '🧪', label: 'Restorative Tonic' },
  'soothing salve': { icon: '💧', label: 'Soothing Salve' }
};

listEquipment().forEach(item => {
  const existing = RESOURCE_ICON_MAP[item.id] || {};
  RESOURCE_ICON_MAP[item.id] = {
    icon: item.icon || existing.icon || '🎒',
    label: item.label || existing.label || item.id
  };
});

export function getResourceIcon(name) {
  if (!name) return null;
  const entry = RESOURCE_ICON_MAP[name];
  if (entry) return entry;
  const equipment = getEquipmentDefinition(name);
  if (equipment) {
    return { icon: equipment.icon, label: equipment.label };
  }
  return null;
}

export function getResourceLabel(name) {
  if (!name) return '';
  const entry = getResourceIcon(name);
  if (entry?.label) return entry.label;
  if (typeof name === 'string' && name.trim()) {
    return name
      .split(/\s+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  return '';
}

export function renderIconLabel(name, { includeText = false } = {}) {
  const entry = getResourceIcon(name);
  if (!entry) {
    return includeText ? getResourceLabel(name) || name : null;
  }
  if (includeText) {
    return `${entry.icon} ${entry.label}`;
  }
  return entry.icon;
}

export default RESOURCE_ICON_MAP;
