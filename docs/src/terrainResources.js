// @ts-nocheck
import store from './state.js';
import { getBiome } from './biomes.js';
import { coordinateRandom, TERRAIN_SYMBOLS } from './map.js';

const TREE_YIELDS = {
  small: { 'small logs': 1, firewood: 2 },
  medium: { 'medium logs': 1, 'small logs': 1, firewood: 4, planks: 1 },
  large: { 'large logs': 1, 'medium logs': 1, 'small logs': 1, firewood: 6, planks: 2, 'building lumber': 1 }
};

const TREE_TIME = { small: 0.35, medium: 0.75, large: 1.5 };

const ORE_DEFINITIONS = [
  { type: 'iron ore', hardness: 2 },
  { type: 'copper ore', hardness: 2 },
  { type: 'tin ore', hardness: 1 },
  { type: 'coal', hardness: 1 },
  { type: 'silver ore', hardness: 3 }
];

const ORE_TIME = { 1: 0.6, 2: 1, 3: 1.6 };

function getLocation(locationId) {
  if (!locationId) return null;
  return store.locations.get(locationId) || null;
}

function getTerrainType(location, x, y) {
  const map = location?.map;
  if (!map?.types?.length) return null;
  const xStart = Number.isFinite(map.xStart) ? Math.trunc(map.xStart) : 0;
  const yStart = Number.isFinite(map.yStart) ? Math.trunc(map.yStart) : 0;
  const col = Math.trunc(x) - xStart;
  const row = Math.trunc(y) - yStart;
  if (row < 0 || col < 0) return null;
  const rowData = map.types[row];
  if (!rowData || col >= rowData.length) return null;
  return rowData[col];
}

function setTerrainType(location, x, y, type) {
  if (!location?.map?.types) return;
  const xStart = Number.isFinite(location.map.xStart) ? Math.trunc(location.map.xStart) : 0;
  const yStart = Number.isFinite(location.map.yStart) ? Math.trunc(location.map.yStart) : 0;
  const col = Math.trunc(x) - xStart;
  const row = Math.trunc(y) - yStart;
  if (row < 0 || col < 0) return;
  if (!location.map.types[row] || col >= location.map.types[row].length) return;
  location.map.types[row][col] = type;
  if (location.map.tiles?.[row]?.length) {
    const symbol = TERRAIN_SYMBOLS[type] || TERRAIN_SYMBOLS.open || '?';
    location.map.tiles[row][col] = symbol;
  }
}

function ensureResourceNodes(location) {
  if (!location.map) location.map = {};
  if (!location.map.resourceNodes || typeof location.map.resourceNodes !== 'object') {
    location.map.resourceNodes = {};
  }
  return location.map.resourceNodes;
}

function nodeKey(x, y) {
  return `${Math.trunc(x)}:${Math.trunc(y)}`;
}

function generateForestNode(location, x, y) {
  const map = location.map || {};
  const seed = map.seed ?? `${location.id}`;
  const biome = getBiome(location.biome) || {};
  const densityRoll = coordinateRandom(seed, x, y, 'forest-density');
  const sizeMix = coordinateRandom(seed, x, y, 'forest-sizes');
  const woodMod = Number.isFinite(biome.woodMod) ? biome.woodMod : 1;
  const baseTrees = 3 + Math.round(densityRoll * 5);
  const totalTrees = Math.max(1, Math.round(baseTrees * woodMod));
  const largeShare = Math.min(0.4, sizeMix * 0.4);
  const mediumShare = Math.min(0.5, 0.3 + sizeMix * 0.3);
  const large = Math.max(0, Math.round(totalTrees * largeShare));
  const medium = Math.max(0, Math.round(totalTrees * mediumShare));
  const small = Math.max(0, totalTrees - large - medium);
  return {
    type: 'forest',
    trees: { small, medium, large },
    stockpiles: {
      'small logs': 0,
      'medium logs': 0,
      'large logs': 0,
      firewood: 0,
      planks: 0,
      'building lumber': 0
    }
  };
}

function pickOreDefinition(seed, x, y, offset = 0) {
  const roll = coordinateRandom(seed, x + offset, y - offset, `ore-type-${offset}`);
  const idx = Math.floor(roll * ORE_DEFINITIONS.length) % ORE_DEFINITIONS.length;
  return ORE_DEFINITIONS[Math.max(0, idx)];
}

function generateOreNode(location, x, y) {
  const map = location.map || {};
  const seed = map.seed ?? `${location.id}`;
  const richness = coordinateRandom(seed, x, y, 'ore-richness');
  const veinCount = richness > 0.8 ? 3 : richness > 0.55 ? 2 : 1;
  const deposits = [];
  for (let i = 0; i < veinCount; i += 1) {
    const def = pickOreDefinition(seed, x, y, i + 1);
    const qtyRoll = coordinateRandom(seed, x - i, y + i, `ore-qty-${i}`);
    const amount = Math.max(1, Math.round(3 + qtyRoll * 5));
    deposits.push({ type: def.type, quantity: amount, hardness: def.hardness });
  }
  const stoneBase = Math.max(2, Math.round(4 + richness * 6));
  return {
    type: 'ore',
    deposits,
    stone: stoneBase,
    stockpiles: { stone: 0 }
  };
}

function ensureTileNode(location, x, y, terrain) {
  const nodes = ensureResourceNodes(location);
  const key = nodeKey(x, y);
  if (!nodes[key]) {
    if (terrain === 'forest') {
      nodes[key] = generateForestNode(location, x, y);
    } else if (terrain === 'ore') {
      nodes[key] = generateOreNode(location, x, y);
    } else {
      nodes[key] = { type: terrain || 'open' };
    }
  } else if (terrain === 'forest') {
    if (!nodes[key].trees) {
      nodes[key].trees = { small: 0, medium: 0, large: 0 };
    }
  }
  if (!nodes[key].stockpiles || typeof nodes[key].stockpiles !== 'object') {
    nodes[key].stockpiles = {};
  }
  return nodes[key];
}

function determineFellingCapability(toolNames = []) {
  const tools = new Set(toolNames.map(name => String(name).toLowerCase()));
  let rank = 0;
  if (tools.has('sharpened stone') || tools.has('stone knife')) rank = Math.max(rank, 1);
  if (tools.has('stone hand axe')) rank = Math.max(rank, 2);
  if (tools.has('bronze axe') || tools.has('iron axe') || tools.has('steel axe') || tools.has('steel saw')) {
    rank = Math.max(rank, 3);
  }
  return rank;
}

function determineMiningCapability(toolNames = []) {
  const tools = new Set(toolNames.map(name => String(name).toLowerCase()));
  let rank = 0;
  if (tools.has('wooden hammer') || tools.has('sharpened stone')) rank = Math.max(rank, 1);
  if (tools.has('stone hand axe') || tools.has('stone pick')) rank = Math.max(rank, 2);
  if (tools.has('bronze pick') || tools.has('iron pick') || tools.has('steel pick')) rank = Math.max(rank, 3);
  return rank;
}

function applyYield(target, yields = {}) {
  Object.entries(yields).forEach(([name, amount]) => {
    if (!amount) return;
    target[name] = (target[name] || 0) + amount;
  });
  return target;
}

export function fellTreesAtTile({ locationId, x = 0, y = 0, tools = [] } = {}) {
  const location = getLocation(locationId);
  if (!location) return { success: false, reason: 'Unknown location.' };
  const terrain = getTerrainType(location, x, y);
  if (terrain !== 'forest') {
    return { success: false, reason: 'No standing trees remain here.' };
  }
  const node = ensureTileNode(location, x, y, terrain);
  const capability = determineFellingCapability(tools);
  if (capability <= 0) {
    return { success: false, reason: 'You need an axe or saw to fell trees here.' };
  }
  const accessibleSizes = [];
  if (capability >= 1) accessibleSizes.push('small');
  if (capability >= 2) accessibleSizes.push('medium');
  if (capability >= 3) accessibleSizes.push('large');
  const availableTrees = accessibleSizes.reduce((sum, size) => sum + (node.trees?.[size] || 0), 0);
  if (availableTrees <= 0) {
    return { success: false, reason: 'Only massive trunks remain that require sturdier tools.' };
  }
  const felled = { small: 0, medium: 0, large: 0 };
  const yields = {};
  let time = 0;
  const attempt = Math.max(1, Math.round(1 + Math.random() * (1 + capability)));
  let remaining = Math.min(attempt, availableTrees);
  const priority = capability >= 3 ? ['large', 'medium', 'small'] : capability >= 2 ? ['medium', 'small'] : ['small'];
  priority.forEach(size => {
    if (remaining <= 0) return;
    const count = Math.min(node.trees[size] || 0, remaining);
    if (count <= 0) return;
    felled[size] += count;
    node.trees[size] -= count;
    remaining -= count;
    time += TREE_TIME[size] * count;
    const perTree = TREE_YIELDS[size] || {};
    Object.entries(perTree).forEach(([name, amount]) => {
      const total = amount * count;
      if (!total) return;
      yields[name] = (yields[name] || 0) + total;
      if (node.stockpiles) {
        node.stockpiles[name] = (node.stockpiles[name] || 0) + total;
      }
    });
  });
  const totalFelled = felled.small + felled.medium + felled.large;
  if (!totalFelled) {
    return { success: false, reason: 'The trees here resist your efforts.' };
  }
  const remainingTrees = (node.trees.small || 0) + (node.trees.medium || 0) + (node.trees.large || 0);
  const cleared = remainingTrees <= 0;
  if (cleared) {
    setTerrainType(location, x, y, 'open');
  }
  return {
    success: true,
    felled,
    yields,
    timeHours: time,
    cleared
  };
}

function selectDepositsForCapability(node, capability) {
  if (!node?.deposits) return [];
  return node.deposits.filter(dep => dep.quantity > 0 && dep.hardness <= capability);
}

function consumeDeposit(node, deposit, amount) {
  if (!deposit || amount <= 0) return;
  deposit.quantity = Math.max(0, deposit.quantity - amount);
  if (deposit.quantity <= 0 && Array.isArray(node.deposits)) {
    node.deposits = node.deposits.filter(entry => entry.quantity > 0);
  }
}

export function mineOreAtTile({ locationId, x = 0, y = 0, tools = [] } = {}) {
  const location = getLocation(locationId);
  if (!location) return { success: false, reason: 'Unknown location.' };
  const terrain = getTerrainType(location, x, y);
  if (terrain !== 'ore') {
    return { success: false, reason: 'No exposed ore can be found here.' };
  }
  const node = ensureTileNode(location, x, y, terrain);
  const capability = determineMiningCapability(tools);
  if (capability <= 0) {
    return { success: false, reason: 'You need a hammer or pick to chip ore from the rock.' };
  }
  const candidates = selectDepositsForCapability(node, capability);
  const yields = {};
  let time = 0;
  let mined = 0;
  const attempt = Math.max(1, Math.round(1 + Math.random() * (capability + 1)));
  candidates.sort((a, b) => b.hardness - a.hardness);
  for (const deposit of candidates) {
    if (mined >= attempt) break;
    const available = Math.max(0, deposit.quantity);
    if (!available) continue;
    const desired = Math.min(available, attempt - mined);
    if (desired <= 0) continue;
    consumeDeposit(node, deposit, desired);
    yields[deposit.type] = (yields[deposit.type] || 0) + desired;
    time += (ORE_TIME[deposit.hardness] || 1) * desired;
    mined += desired;
  }
  if (mined < attempt && node.stone > 0 && capability >= 1) {
    const stoneAmount = Math.min(node.stone, attempt - mined);
    node.stone -= stoneAmount;
    yields['stone blocks'] = (yields['stone blocks'] || 0) + stoneAmount;
    time += (ORE_TIME[1] || 1) * stoneAmount;
    mined += stoneAmount;
  }
  if (!mined) {
    return { success: false, reason: 'The deposit is too tough for the tools on hand.' };
  }
  Object.entries(yields).forEach(([name, amount]) => {
    node.stockpiles[name] = (node.stockpiles[name] || 0) + amount;
  });
  const exhausted = (!node.deposits || node.deposits.length === 0) && (node.stone || 0) <= 0;
  if (exhausted) {
    setTerrainType(location, x, y, 'stone');
  }
  return {
    success: true,
    yields,
    timeHours: time,
    exhausted
  };
}

export function getTileResource(locationId, x, y) {
  const location = getLocation(locationId);
  if (!location) return null;
  const terrain = getTerrainType(location, x, y);
  const node = ensureTileNode(location, x, y, terrain);
  return node ? { ...node, trees: { ...(node.trees || {}) }, stockpiles: { ...(node.stockpiles || {}) } } : null;
}

export default { fellTreesAtTile, mineOreAtTile, getTileResource };
