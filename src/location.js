import store from './state.js';
import { getBiome } from './biomes.js';
import { generatePointsOfInterest } from './pointsOfInterest.js';
import { computeCenteredStart, DEFAULT_MAP_HEIGHT, DEFAULT_MAP_WIDTH, generateColorMap } from './map.js';

export function generateLocation(id, biome, season = store.time.season, seed = Date.now()) {
  const features = getBiome(biome)?.features || [];
  const pointsOfInterest = generatePointsOfInterest(biome);
  const width = DEFAULT_MAP_WIDTH;
  const height = DEFAULT_MAP_HEIGHT;
  const { xStart, yStart } = computeCenteredStart(width, height);
  const map = generateColorMap(biome, seed, xStart, yStart, width, height, season);
  const location = { id, biome, features, pointsOfInterest, map };
  store.addItem('locations', location);
  return location;
}

export function allLocations() {
  return [...store.locations.values()];
}
