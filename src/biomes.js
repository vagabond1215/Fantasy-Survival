export const biomes = [
  {
    id: 'alpine',
    name: 'Alpine',
    features: ['snow-capped peaks', 'glacial valley', 'rocky slopes'],
    woodMod: 0.3,
    openLand: 0.2,
    food: 0.2,
    elevation: { base: 0.8, variance: 0.2, scale: 20, waterLevel: 0.3 },
    description: 'High mountains where trees are sparse and the air is thin.'
  },
  {
    id: 'boreal-taiga',
    name: 'Boreal (Taiga)',
    features: ['conifer forest', 'bog', 'cold rivers'],
    woodMod: 1.0,
    openLand: 0.3,
    food: 0.4,
    elevation: { base: 0.4, variance: 0.2, scale: 60, waterLevel: 0.3 },
    description: 'Cold northern forests dominated by pines and dotted with bogs.'
  },
  {
    id: 'coastal-temperate',
    name: 'Coastal (Temperate)',
    features: ['rocky shore', 'tide pools', 'windy cliffs'],
    woodMod: 0.8,
    openLand: 0.5,
    food: 0.6,
    elevation: { base: 0.2, variance: 0.1, scale: 50, waterLevel: 0.15 },
    description: 'Cool coasts with rocky beaches and windswept cliffs.'
  },
  {
    id: 'coastal-tropical',
    name: 'Coastal (Tropical)',
    features: ['sandy beaches', 'coral reefs', 'lagoon'],
    woodMod: 0.9,
    openLand: 0.5,
    food: 0.9,
    elevation: { base: 0.2, variance: 0.1, scale: 50, waterLevel: 0.15 },
    description: 'Warm shores of sand and reef washed by gentle tropical seas.'
  },
  {
    id: 'flooded-grasslands',
    name: 'Flooded Grasslands / Swamp',
    features: ['marsh', 'reed beds', 'shallow lakes'],
    woodMod: 0.7,
    openLand: 0.4,
    food: 0.6,
    elevation: { base: 0.1, variance: 0.05, scale: 80, waterLevel: 0.2 },
    description: 'Waterlogged plains filled with reeds, marshes and standing water.'
  },
  {
    id: 'island-temperate',
    name: 'Island (Temperate)',
    features: ['pebble beach', 'forest interior', 'cliffs'],
    woodMod: 0.8,
    openLand: 0.5,
    food: 0.7,
    elevation: { base: 0.25, variance: 0.1, scale: 40, waterLevel: 0.2 },
    description: 'A temperate island with forests, cliffs and cool seas.'
  },
  {
    id: 'island-tropical',
    name: 'Island (Tropical)',
    features: ['palm beach', 'volcanic ridge', 'lagoon'],
    woodMod: 0.9,
    openLand: 0.5,
    food: 0.9,
    elevation: { base: 0.25, variance: 0.1, scale: 40, waterLevel: 0.2 },
    description: 'Lush tropical islands fringed by palms and volcanic heights.'
  },
  {
    id: 'mangrove',
    name: 'Mangrove',
    features: ['mangrove forest', 'brackish water', 'mudflats'],
    woodMod: 1.0,
    openLand: 0.3,
    food: 0.8,
    elevation: { base: 0.15, variance: 0.05, scale: 30, waterLevel: 0.18 },
    description: 'Dense coastal forests rooted in tidal mud and brackish water.'
  },
  {
    id: 'mediterranean-woodland',
    name: 'Mediterranean Woodland',
    features: ['scrubland', 'olive groves', 'rocky hills'],
    woodMod: 0.9,
    openLand: 0.6,
    food: 0.7,
    elevation: { base: 0.3, variance: 0.15, scale: 70, waterLevel: 0.2 },
    description: 'Warm dry woodlands with scrub and hardy trees.'
  },
  {
    id: 'montane-cloud',
    name: 'Montane / Cloud',
    features: ['misty forest', 'steep terrain', 'waterfalls'],
    woodMod: 0.8,
    openLand: 0.3,
    food: 0.5,
    elevation: { base: 0.6, variance: 0.2, scale: 40, waterLevel: 0.25 },
    description: 'High elevation forests perpetually shrouded in mist.'
  },
  {
    id: 'savanna',
    name: 'Savanna',
    features: ['grassland', 'acacia trees', 'watering hole'],
    woodMod: 0.6,
    openLand: 0.8,
    food: 0.5,
    elevation: { base: 0.3, variance: 0.15, scale: 80, waterLevel: 0.18 },
    description: 'Vast grassy plains dotted with trees and seasonal water.'
  },
  {
    id: 'temperate-deciduous',
    name: 'Temperate Deciduous',
    features: ['broadleaf forest', 'meadow', 'stream'],
    woodMod: 1.1,
    openLand: 0.6,
    food: 0.7,
    elevation: { base: 0.35, variance: 0.15, scale: 60, waterLevel: 0.2 },
    description: 'Forests of broadleaf trees that change with the seasons.'
  },
  {
    id: 'temperate-rainforest',
    name: 'Temperate Rainforest',
    features: ['wet forest', 'coastal cliffs', 'mossy ground'],
    woodMod: 1.1,
    openLand: 0.4,
    food: 0.8,
    elevation: { base: 0.3, variance: 0.15, scale: 50, waterLevel: 0.2 },
    description: 'Mild coastal forests kept lush by constant rain and fog.'
  },
  {
    id: 'tropical-monsoon',
    name: 'Tropical Monsoon',
    features: ['seasonal forest', 'river delta', 'monsoon rains'],
    woodMod: 1.0,
    openLand: 0.5,
    food: 1.0,
    elevation: { base: 0.3, variance: 0.2, scale: 60, waterLevel: 0.25 },
    description: 'Tropical forests with distinct wet and dry seasons.'
  },
  {
    id: 'tropical-rainforest',
    name: 'Tropical Rainforest',
    features: ['dense jungle', 'river', 'rolling hills'],
    woodMod: 1.2,
    openLand: 0.3,
    food: 1.2,
    elevation: { base: 0.35, variance: 0.15, scale: 70, waterLevel: 0.25 },
    description: 'Hot, humid jungles teeming with life and thick vegetation.'
  }
];

const biomeMap = new Map(biomes.map(b => [b.id, b]));

export function getBiome(id) {
  return biomeMap.get(id);
}

