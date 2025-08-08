export const biomes = [
  {
    id: 'alpine',
    name: 'Alpine',
    features: ['snow-capped peaks', 'glacial valley', 'rocky slopes'],
    woodMod: 0.3,
    description: 'High mountains where trees are sparse and the air is thin.'
  },
  {
    id: 'boreal-taiga',
    name: 'Boreal (Taiga)',
    features: ['conifer forest', 'bog', 'cold rivers'],
    woodMod: 1.0,
    description: 'Cold northern forests dominated by pines and dotted with bogs.'
  },
  {
    id: 'coastal-temperate',
    name: 'Coastal (Temperate)',
    features: ['rocky shore', 'tide pools', 'windy cliffs'],
    woodMod: 0.8,
    description: 'Cool coasts with rocky beaches and windswept cliffs.'
  },
  {
    id: 'coastal-tropical',
    name: 'Coastal (Tropical)',
    features: ['sandy beaches', 'coral reefs', 'lagoon'],
    woodMod: 0.9,
    description: 'Warm shores of sand and reef washed by gentle tropical seas.'
  },
  {
    id: 'flooded-grasslands',
    name: 'Flooded Grasslands / Swamp',
    features: ['marsh', 'reed beds', 'shallow lakes'],
    woodMod: 0.7,
    description: 'Waterlogged plains filled with reeds, marshes and standing water.'
  },
  {
    id: 'island-temperate',
    name: 'Island (Temperate)',
    features: ['pebble beach', 'forest interior', 'cliffs'],
    woodMod: 0.8,
    description: 'A temperate island with forests, cliffs and cool seas.'
  },
  {
    id: 'island-tropical',
    name: 'Island (Tropical)',
    features: ['palm beach', 'volcanic ridge', 'lagoon'],
    woodMod: 0.9,
    description: 'Lush tropical islands fringed by palms and volcanic heights.'
  },
  {
    id: 'mangrove',
    name: 'Mangrove',
    features: ['mangrove forest', 'brackish water', 'mudflats'],
    woodMod: 1.0,
    description: 'Dense coastal forests rooted in tidal mud and brackish water.'
  },
  {
    id: 'mediterranean-woodland',
    name: 'Mediterranean Woodland',
    features: ['scrubland', 'olive groves', 'rocky hills'],
    woodMod: 0.9,
    description: 'Warm dry woodlands with scrub and hardy trees.'
  },
  {
    id: 'montane-cloud',
    name: 'Montane / Cloud',
    features: ['misty forest', 'steep terrain', 'waterfalls'],
    woodMod: 0.8,
    description: 'High elevation forests perpetually shrouded in mist.'
  },
  {
    id: 'savanna',
    name: 'Savanna',
    features: ['grassland', 'acacia trees', 'watering hole'],
    woodMod: 0.6,
    description: 'Vast grassy plains dotted with trees and seasonal water.'
  },
  {
    id: 'temperate-deciduous',
    name: 'Temperate Deciduous',
    features: ['broadleaf forest', 'meadow', 'stream'],
    woodMod: 1.1,
    description: 'Forests of broadleaf trees that change with the seasons.'
  },
  {
    id: 'temperate-rainforest',
    name: 'Temperate Rainforest',
    features: ['wet forest', 'coastal cliffs', 'mossy ground'],
    woodMod: 1.1,
    description: 'Mild coastal forests kept lush by constant rain and fog.'
  },
  {
    id: 'tropical-monsoon',
    name: 'Tropical Monsoon',
    features: ['seasonal forest', 'river delta', 'monsoon rains'],
    woodMod: 1.0,
    description: 'Tropical forests with distinct wet and dry seasons.'
  },
  {
    id: 'tropical-rainforest',
    name: 'Tropical Rainforest',
    features: ['dense jungle', 'river', 'rolling hills'],
    woodMod: 1.2,
    description: 'Hot, humid jungles teeming with life and thick vegetation.'
  }
];

const biomeMap = new Map(biomes.map(b => [b.id, b]));

export function getBiome(id) {
  return biomeMap.get(id);
}

