export const biomes = [
  {
    id: 'desert',
    name: 'Desert',
    features: ['dunes', 'oasis', 'mesa'],
    woodMod: 0.2,
    description: 'A vast sandy landscape with dunes, sparse oases, and extreme temperatures.'
  },
  {
    id: 'taiga',
    name: 'Taiga',
    features: ['pine forest', 'bog', 'hills'],
    woodMod: 1.0,
    description: 'Cold forests of pines and bogs stretching across the north.'
  },
  {
    id: 'tundra',
    name: 'Tundra',
    features: ['permafrost', 'ice field', 'rocky plain'],
    woodMod: 0.5,
    description: 'Frozen, treeless plains with permafrost and icy winds.'
  },
  {
    id: 'plains',
    name: 'Plains',
    features: ['grassland', 'river', 'cliff'],
    woodMod: 0.8,
    description: 'Open grasslands dotted with rivers and occasional cliffs.'
  },
  {
    id: 'tropical-rainforest',
    name: 'Tropical Rainforest',
    features: ['dense jungle', 'river', 'rolling hills'],
    woodMod: 1.2,
    description: 'Dense, humid jungle teeming with life and rolling hills.'
  },
  {
    id: 'temperate-rainforest',
    name: 'Temperate Rainforest',
    features: ['wet forest', 'coastal cliffs', 'mossy ground'],
    woodMod: 1.1,
    description: 'Wet, mossy forests near coasts with towering trees.'
  },
  {
    id: 'boreal-forest',
    name: 'Boreal Forest',
    features: ['conifer forest', 'lakes', 'bog'],
    woodMod: 0.9,
    description: 'Coniferous woodland interspersed with lakes and boggy ground.'
  }
];

export function getBiome(id) {
  return biomes.find(b => b.id === id);
}
