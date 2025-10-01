// Resource production and consumption calculations.
// Values are expressed using SAE units (feet, pounds, etc.)
// to allow for future conversion to metric.

import { hasTechnology } from './technology.js';
import { getBiome } from './biomes.js';

// Base wood yield per lumberjack per day in pounds depending on tool tech.
// The values roughly correspond to the weight of a tree that could be felled
// by a single worker using the specified technology.
const woodYieldPerDay = {
  'stone-hand-axe': 300, // ~7 cubic feet assuming 45 lb/ft^3
  'bronze-axe': 800,
  'iron-axe': 1500
};

/**
 * Calculate wood harvested based on number of workers and technology level.
 * @param {number} workers - number of lumberjacks
 * @param {string} biome - current location biome
 * @returns {number} pounds of wood harvested per day
 */
export function harvestWood(workers = 0, biome = 'temperate-deciduous') {
  let tech = 'stone-hand-axe';
  if (hasTechnology('bronze-tools')) tech = 'bronze-axe';
  if (hasTechnology('iron-tools')) tech = 'iron-axe';
  const perWorker = woodYieldPerDay[tech] || 0;
  const biomeMod = getBiome(biome)?.woodMod ?? 1;
  return workers * perWorker * biomeMod;
}

// Base carrying capacity per scavenger in pounds for an 8 hour period.
// Transport to and from the work site reduces the effective amount that
// can be hauled back. The modifier represents time spent walking rather
// than gathering.
const CARRY_CAPACITY_LBS = 50;
const TRANSPORT_MOD = 0.8; // 20% of time lost to travel
const EFFECTIVE_CAPACITY = CARRY_CAPACITY_LBS * TRANSPORT_MOD;

// Weight in pounds for a single unit of each gathered resource.
const SCAVENGE_RESOURCES = [
  { name: 'firewood', weight: 5 },
  { name: 'food', weight: 1 },
  { name: 'small stones', weight: 2 },
  { name: 'pebbles', weight: 1 }
];

const SCAVENGE_DISTRIBUTION = {
  firewood: 0.25,
  food: 0.4,
  'small stones': 0.2,
  pebbles: 0.15
};

const AVERAGE_LOAD_FACTOR = 0.95;
const HUNTING_FOOD_PER_WORKER_HOUR = 3;
const HUNTING_HIDE_PER_WORKER_HOUR = 0.35;
const CRAFTING_GOODS_PER_WORKER_HOUR = 0.5;
const CRAFTING_FIREWOOD_CONSUMPTION_PER_WORKER_HOUR = 0.5;
const BUILDING_WOOD_CONSUMPTION_PER_WORKER_HOUR = 3;
const BUILDING_PROGRESS_PER_WORKER_HOUR = 0.3;

function randomScavengeDistribution() {
  const total = 0.9 + Math.random() * 0.1; // 90-100% of capacity
  const weights = SCAVENGE_RESOURCES.map(() => Math.random());
  const sum = weights.reduce((a, b) => a + b, 0);
  const pct = {};
  SCAVENGE_RESOURCES.forEach((r, i) => {
    pct[r.name] = (weights[i] / sum) * total;
  });
  return pct;
}

/**
 * Calculate resources gathered by scavengers over an 8 hour period.
 * The amounts are randomized per worker but generally fill 90-100% of
 * their carrying capacity.
 *
 * @param {number} workers - number of scavengers
 * @returns {Object} total items gathered per resource
 */
export function scavengeResources(workers = 0) {
  const totals = {};
  SCAVENGE_RESOURCES.forEach(r => (totals[r.name] = 0));

  for (let i = 0; i < workers; i++) {
    const pct = randomScavengeDistribution();
    SCAVENGE_RESOURCES.forEach(r => {
      const weight = pct[r.name] * EFFECTIVE_CAPACITY;
      totals[r.name] += weight / r.weight;
    });
  }
  SCAVENGE_RESOURCES.forEach(r => {
    totals[r.name] = Math.round(totals[r.name]);
  });
  return totals;
}

function resourceWeightLookup(name) {
  const entry = SCAVENGE_RESOURCES.find(r => r.name === name);
  return entry ? entry.weight : 1;
}

function addToTotals(target, deltas = {}) {
  Object.entries(deltas).forEach(([name, amount]) => {
    if (!Number.isFinite(amount) || amount === 0) return;
    target[name] = (target[name] || 0) + amount;
  });
  return target;
}

function multiplyResources(map, factor) {
  const result = {};
  Object.entries(map).forEach(([name, amount]) => {
    result[name] = amount * factor;
  });
  return result;
}

function expectedScavengePerHour(workers = 0) {
  const perWorkerLoadPerHour = (EFFECTIVE_CAPACITY * AVERAGE_LOAD_FACTOR) / 8;
  const totals = {};
  Object.entries(SCAVENGE_DISTRIBUTION).forEach(([name, share]) => {
    const weight = perWorkerLoadPerHour * share;
    totals[name] = (weight / resourceWeightLookup(name)) * workers;
  });
  return totals;
}

export function expectedScavengeYield(workers = 0, hours = 8) {
  if (hours <= 0) return {};
  const perHour = expectedScavengePerHour(workers);
  return multiplyResources(perHour, hours);
}

export function calculateStartingGoods(config = {}) {
  const { people = 0, foodDays = 0, firewoodDays = 0, tools = {} } = config;
  const items = {};
  const foodPerPersonPerDay = 1;
  if (people > 0 && foodDays > 0) {
    items.food = people * foodDays * foodPerPersonPerDay;
  }
  if (people > 0 && firewoodDays > 0) {
    items.firewood = people * firewoodDays;
  }
  Object.entries(tools).forEach(([name, qty]) => {
    if (!qty) return;
    items[name] = (items[name] || 0) + qty;
  });
  return items;
}

function huntingPerHour(order) {
  const workers = order?.workers || 0;
  return {
    food: workers * HUNTING_FOOD_PER_WORKER_HOUR,
    hides: workers * HUNTING_HIDE_PER_WORKER_HOUR
  };
}

function craftingPerHour(order) {
  const workers = order?.workers || 0;
  return {
    'crafted goods': workers * CRAFTING_GOODS_PER_WORKER_HOUR,
    firewood: -workers * CRAFTING_FIREWOOD_CONSUMPTION_PER_WORKER_HOUR
  };
}

function buildingPerHour(order) {
  const workers = order?.workers || 0;
  return {
    wood: -workers * BUILDING_WOOD_CONSUMPTION_PER_WORKER_HOUR,
    'construction progress': workers * BUILDING_PROGRESS_PER_WORKER_HOUR
  };
}

export function getOrderHourlyEffect(order) {
  if (!order) return {};
  switch (order.type) {
    case 'gathering':
      return expectedScavengePerHour(order.workers);
    case 'hunting':
      return huntingPerHour(order);
    case 'crafting':
      return craftingPerHour(order);
    case 'building':
      return buildingPerHour(order);
    case 'combat':
    default:
      return {};
  }
}

export function calculateOrderDelta(order, hours = 1) {
  if (!order || hours <= 0) return {};
  const perHour = getOrderHourlyEffect(order);
  return multiplyResources(perHour, hours);
}

export function calculateExpectedInventoryChanges(orders = []) {
  const totals = {};
  orders
    .filter(o => o.status === 'pending' || o.status === 'active')
    .forEach(order => {
      const hours = order.status === 'pending' ? order.durationHours : order.remainingHours;
      addToTotals(totals, calculateOrderDelta(order, hours));
    });
  return totals;
}

export function applyResourceDelta(delta = {}) {
  const totals = {};
  addToTotals(totals, delta);
  return totals;
}

