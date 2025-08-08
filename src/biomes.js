const coreBiomes = [
  {
    id: 'desert',
    name: 'Desert',
    features: ['dunes', 'oasis', 'mesa'],
    woodMod: 0.2
  },
  {
    id: 'taiga',
    name: 'Taiga',
    features: ['pine forest', 'bog', 'hills'],
    woodMod: 1.0
  },
  {
    id: 'tundra',
    name: 'Tundra',
    features: ['permafrost', 'ice field', 'rocky plain'],
    woodMod: 0.5
  },
  {
    id: 'plains',
    name: 'Plains',
    features: ['grassland', 'river', 'cliff'],
    woodMod: 0.8
  },
  {
    id: 'tropical-rainforest',
    name: 'Tropical Rainforest',
    features: ['dense jungle', 'river', 'rolling hills'],
    woodMod: 1.2
  },
  {
    id: 'temperate-rainforest',
    name: 'Temperate Rainforest',
    features: ['wet forest', 'coastal cliffs', 'mossy ground'],
    woodMod: 1.1
  },
  {
    id: 'boreal-forest',
    name: 'Boreal Forest',
    features: ['conifer forest', 'lakes', 'bog'],
    woodMod: 0.9
  }
];

const biomeDescriptions = [
  {
    id: 'desert',
    description: 'A vast sandy landscape with dunes, sparse oases, and extreme temperatures.'
  },
  {
    id: 'taiga',
    description: 'Cold forests of pines and bogs stretching across the north.'
  },
  {
    id: 'tundra',
    description: 'Frozen, treeless plains with permafrost and icy winds.'
  },
  {
    id: 'plains',
    description: 'Open grasslands dotted with rivers and occasional cliffs.'
  },
  {
    id: 'tropical-rainforest',
    description: 'Dense, humid jungle teeming with life and rolling hills.'
  },
  {
    id: 'temperate-rainforest',
    description: 'Wet, mossy forests near coasts with towering trees.'
  },
  {
    id: 'boreal-forest',
    description: 'Coniferous woodland interspersed with lakes and boggy ground.'
  }
];

// Merge datasets and remove duplicates by biome id
const biomeMap = new Map();
[...coreBiomes, ...biomeDescriptions].forEach(b => {
  if (biomeMap.has(b.id)) {
    Object.assign(biomeMap.get(b.id), b);
  } else {
    biomeMap.set(b.id, { ...b });
  }
});

export const biomes = Array.from(biomeMap.values());

export function getBiome(id) {
  return biomeMap.get(id);
}
