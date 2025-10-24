import { GRID_DISTANCE_METERS, isWaterTerrain } from './map.js';

const BASE_WALK_SPEED_METERS_PER_HOUR = 4200; // ~4.2 km/h average travel speed

const TERRAIN_TIME_MULTIPLIER = {
  open: 1,
  forest: 1.7,
  ore: 1.3,
  stone: 1.4,
  water: 4,
  ocean: 4.2,
  lake: 4,
  river: 3.8,
  marsh: 2.8,
  default: 1.25
};

function terrainMultiplier(type) {
  if (!type) return TERRAIN_TIME_MULTIPLIER.default;
  return TERRAIN_TIME_MULTIPLIER[type] ?? TERRAIN_TIME_MULTIPLIER.default;
}

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

export function calculateTravelTime({
  fromTerrain = 'open',
  toTerrain = 'open',
  distance = GRID_DISTANCE_METERS,
  swimmingLevel = 1
} = {}) {
  const baseDistance = Math.max(1, Number.isFinite(distance) ? distance : GRID_DISTANCE_METERS);
  const originMultiplier = terrainMultiplier(fromTerrain);
  const destinationMultiplier = terrainMultiplier(toTerrain);
  let combinedMultiplier = (originMultiplier + destinationMultiplier) / 2;
  let blocked = false;
  let reason = '';

  if (isWaterTerrain(toTerrain) || isWaterTerrain(fromTerrain)) {
    const swimSkill = clamp(swimmingLevel, 1, 100);
    if (swimSkill < 8) {
      blocked = true;
      reason = 'The current is too strong to cross without better swimming skill.';
    } else {
      const swimPenalty = clamp(3.5 - swimSkill / 25, 1.5, 3.5);
      combinedMultiplier *= swimPenalty;
      if (swimSkill < 25) {
        reason = 'Crossing the water is slow and exhausting.';
      }
    }
  }

  const hours = (baseDistance / BASE_WALK_SPEED_METERS_PER_HOUR) * combinedMultiplier;
  return {
    hours,
    blocked,
    reason,
    distance: baseDistance,
    multiplier: combinedMultiplier
  };
}

export function describeTerrainDifficulty(type) {
  switch (type) {
    case 'forest':
      return 'Dense canopy and underbrush slow travel.';
    case 'ore':
      return 'Rocky outcrops require careful footing.';
    case 'stone':
      return 'Jagged stone forces a cautious pace.';
    case 'water':
    case 'lake':
    case 'ocean':
      return 'Requires swimming or a boat to cross safely.';
    case 'river':
      return 'Swift currents complicate fording attempts.';
    case 'marsh':
      return 'Slogging through wetlands is slow and exhausting.';
    case 'open':
    default:
      return 'Gentle terrain allows steady progress.';
  }
}
