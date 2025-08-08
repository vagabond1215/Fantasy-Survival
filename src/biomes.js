export const biomes = [
  { id: 'desert', name: 'Desert', features: ['dunes', 'oasis', 'mesa'], woodMod: 0.2 },
  { id: 'taiga', name: 'Taiga', features: ['pine forest', 'bog', 'hills'], woodMod: 1.0 },
  { id: 'tundra', name: 'Tundra', features: ['permafrost', 'ice field', 'rocky plain'], woodMod: 0.5 },
  { id: 'plains', name: 'Plains', features: ['grassland', 'river', 'cliff'], woodMod: 0.8 },
  { id: 'tropical-rainforest', name: 'Tropical Rainforest', features: ['dense jungle', 'river', 'waterfall'], woodMod: 1.2 },
  { id: 'temperate-rainforest', name: 'Temperate Rainforest', features: ['coastal forest', 'mossy undergrowth', 'hills'], woodMod: 1.1 },
  { id: 'boreal-forest', name: 'Boreal Forest', features: ['conifer forest', 'lakes', 'bog'], woodMod: 1.0 }
];

export function getBiome(id) {
  return biomes.find(b => b.id === id);
}
