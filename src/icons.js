const RESOURCE_ICON_MAP = {
  wood: { icon: '🪵', label: 'Wood' },
  firewood: { icon: '🔥', label: 'Firewood' },
  food: { icon: '🍲', label: 'Food Rations' },
  hides: { icon: '🦬', label: 'Animal Hides' },
  'small stones': { icon: '🪨', label: 'Small Stones' },
  pebbles: { icon: '⚪', label: 'Pebbles' },
  'crafted goods': { icon: '🧰', label: 'Crafted Goods' },
  'construction progress': { icon: '🏗️', label: 'Construction Progress' },
  preservedFood: { icon: '🥫', label: 'Preserved Food' },
  cookedMeals: { icon: '🍖', label: 'Cooked Meals' },
  hidesPrepared: { icon: '🧵', label: 'Prepared Hides' }
};

export function getResourceIcon(name) {
  if (!name) return null;
  return RESOURCE_ICON_MAP[name] || null;
}

export function renderIconLabel(name, { includeText = false } = {}) {
  const entry = getResourceIcon(name);
  if (!entry) {
    return includeText ? name : null;
  }
  if (includeText) {
    return `${entry.icon} ${entry.label}`;
  }
  return entry.icon;
}

export default RESOURCE_ICON_MAP;
