import store from './state.js';
import { getBiome } from './biomes.js';

export function generateLocation(id, biome) {
  const features = getBiome(biome)?.features || [];
  const location = { id, biome, features };
  store.addItem('locations', location);
  return location;
}

export function allLocations() {
  return [...store.locations.values()];
}
