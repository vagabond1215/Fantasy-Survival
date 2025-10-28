import store from './state.js';
import { getBiome, OPEN_TERRAIN_TYPES } from './biomes.js';
import { generatePointsOfInterest } from './pointsOfInterest.js';
import {
  computeCenteredStart,
  DEFAULT_MAP_HEIGHT,
  DEFAULT_MAP_WIDTH,
  generateColorMap,
  GRID_DISTANCE_METERS
} from './map.js';

const CLEAR_TERRAIN_TYPES = new Set([...OPEN_TERRAIN_TYPES, 'ore', 'stone']);

function normalizeNumber(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return 0;
  return num;
}

function computeSiteCapacities(map) {
  if (!map || !Array.isArray(map.types)) {
    return { forest: 0, cleared: 0 };
  }
  const areaPerTile = normalizeNumber(GRID_DISTANCE_METERS) ** 2 || 0;
  let forestTiles = 0;
  let clearedTiles = 0;
  map.types.forEach(row => {
    row.forEach(type => {
      if (type === 'forest') {
        forestTiles += 1;
      } else if (CLEAR_TERRAIN_TYPES.has(type)) {
        clearedTiles += 1;
      }
    });
  });
  return {
    forest: forestTiles * areaPerTile,
    cleared: clearedTiles * areaPerTile
  };
}

function ensureSiteCapacities(location) {
  if (!location) return location;
  if (location.siteCapacities && typeof location.siteCapacities === 'object') {
    return location;
  }
  const capacities = computeSiteCapacities(location.map);
  location.siteCapacities = capacities;
  if (location.id) {
    store.updateItem('locations', { id: location.id, siteCapacities: capacities });
  }
  return location;
}

export function generateLocation(
  id,
  biome,
  season = store.time.season,
  seed = Date.now(),
  worldSettings = null
) {
  const features = getBiome(biome)?.features || [];
  const pointsOfInterest = generatePointsOfInterest(biome);
  const width = DEFAULT_MAP_WIDTH;
  const height = DEFAULT_MAP_HEIGHT;
  const { xStart, yStart } = computeCenteredStart(width, height);
  const map = generateColorMap(
    biome,
    seed,
    xStart,
    yStart,
    width,
    height,
    season,
    undefined,
    undefined,
    worldSettings
  );
  const siteCapacities = computeSiteCapacities(map);
  const location = {
    id,
    biome,
    features,
    pointsOfInterest,
    map,
    siteCapacities,
    worldSettings: map.worldSettings
  };
  store.addItem('locations', location);
  return location;
}

export function allLocations() {
  return [...store.locations.values()].map(entry => ensureSiteCapacities(entry));
}

export function getLocationSiteCapacities(locationId) {
  if (!locationId) {
    const first = allLocations()[0];
    return (first && ensureSiteCapacities(first).siteCapacities) || { forest: 0, cleared: 0 };
  }
  const location = store.getItem('locations', locationId);
  if (!location) return { forest: 0, cleared: 0 };
  return ensureSiteCapacities(location).siteCapacities || { forest: 0, cleared: 0 };
}

export function ensureLocationSiteCapacities(locationId) {
  if (!locationId) return;
  const location = store.getItem('locations', locationId);
  if (!location) return;
  ensureSiteCapacities(location);
}
