import store from './state.js';
import { getBiome } from './biomes.js';
import { generatePointsOfInterest } from './pointsOfInterest.js';
import { generateColorMap } from './map.js';

export function generateLocation(id, biome, season = store.time.season, seed = Date.now()) {
  const features = getBiome(biome)?.features || [];
  const pointsOfInterest = generatePointsOfInterest(biome);
  const map = generateColorMap(biome, seed, 0, 0, 80, 40, season);
  const location = { id, biome, features, pointsOfInterest, map };
  store.addItem('locations', location);
  return location;
}

export function allLocations() {
  return [...store.locations.values()];
}
