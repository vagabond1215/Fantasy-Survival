import store from './state.js';

const biomeFeatures = {
  desert: ['dunes', 'oasis', 'mesa'],
  taiga: ['pine forest', 'bog', 'hills'],
  tundra: ['permafrost', 'ice field', 'rocky plain'],
  plains: ['grassland', 'river', 'cliff']
};

export function generateLocation(id, biome) {
  const features = biomeFeatures[biome] || [];
  const location = { id, biome, features };
  store.addItem('locations', location);
  return location;
}

export function allLocations() {
  return [...store.locations.values()];
}
