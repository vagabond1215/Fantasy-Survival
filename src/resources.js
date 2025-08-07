// Resource production and consumption calculations.
// Values are expressed using SAE units (feet, pounds, etc.)
// to allow for future conversion to metric.

import { hasTechnology } from './technology.js';

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
export function harvestWood(workers = 0, biome = 'plains') {
  let tech = 'stone-hand-axe';
  if (hasTechnology('bronze-tools')) tech = 'bronze-axe';
  if (hasTechnology('iron-tools')) tech = 'iron-axe';
  const perWorker = woodYieldPerDay[tech] || 0;
  const biomeMod = {
    desert: 0.2,
    taiga: 1.0,
    tundra: 0.5,
    plains: 0.8
  }[biome] || 1;
  return workers * perWorker * biomeMod;
}

// Placeholder for other resource calculations such as food gathering,
// fishing, farming, etc. Each function should take into account both
// technology and local biome in determining yields.

