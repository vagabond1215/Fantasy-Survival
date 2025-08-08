export const biomes = [
  { id: 'desert', name: 'Desert', features: ['dunes', 'oasis', 'mesa'], woodMod: 0.2 },
  { id: 'taiga', name: 'Taiga', features: ['pine forest', 'bog', 'hills'], woodMod: 1.0 },
  { id: 'tundra', name: 'Tundra', features: ['permafrost', 'ice field', 'rocky plain'], woodMod: 0.5 },
  { id: 'plains', name: 'Plains', features: ['grassland', 'river', 'cliff'], woodMod: 0.8 }
];

export function getBiome(id) {
  return biomes.find(b => b.id === id);
}
