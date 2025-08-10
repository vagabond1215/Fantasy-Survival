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

