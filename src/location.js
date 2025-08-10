import store from './state.js';
import { getBiome } from './biomes.js';
import { generatePointsOfInterest } from './pointsOfInterest.js';
import { generateColorMap } from './map.js';

export function generateLocation(id, biome) {
  const features = getBiome(biome)?.features || [];
  const pointsOfInterest = generatePointsOfInterest(biome);
  const map = generateColorMap(biome);
  const location = { id, biome, features, pointsOfInterest, map };
  store.addItem('locations', location);
  return location;
}

export function allLocations() {
  return [...store.locations.values()];
}
