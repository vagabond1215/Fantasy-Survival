export const biomes = [
  {
    id: 'alpine',
    name: 'Alpine',
    color: '#c8d9eb',
    features: [
      'snow-capped peaks',
      'glacial valley',
      'rocky slopes',
      'alpine lake',
      'mountain stream'
    ],
    woodMod: 0.3,
    openLand: 0.2,
    openTerrainId: 'tundra',
    food: 0.2,
    elevation: { base: 0.8, variance: 0.2, scale: 20, waterLevel: 0.3 },
    description: 'High mountains where trees are sparse and the air is thin.'
  },
  {
    id: 'boreal-taiga',
    name: 'Boreal (Taiga)',
    color: '#b9cfc2',
    features: ['conifer forest', 'bog', 'cold rivers', 'glacial lake'],
    woodMod: 1.0,
    openLand: 0.3,
    openTerrainId: 'taiga',
    food: 0.4,
    elevation: { base: 0.4, variance: 0.2, scale: 60, waterLevel: 0.3 },
    description: 'Cold northern forests dominated by pines and dotted with bogs.'
  },
  {
    id: 'coastal-temperate',
    name: 'Coastal (Temperate)',
    color: '#bcd7e6',
    features: ['rocky shore', 'tide pools', 'windy cliffs', 'sea inlet'],
    woodMod: 0.8,
    openLand: 0.5,
    openTerrainId: 'coast',
    food: 0.6,
    elevation: { base: 0.2, variance: 0.1, scale: 50, waterLevel: 0.15 },
    description: 'Cool coasts with rocky beaches and windswept cliffs.'
  },
  {
    id: 'coastal-tropical',
    name: 'Coastal (Tropical)',
    color: '#f4d7b7',
    features: ['sandy beaches', 'coral reefs', 'lagoon', 'tidal creek'],
    woodMod: 0.9,
    openLand: 0.5,
    openTerrainId: 'sand',
    food: 0.9,
    elevation: { base: 0.2, variance: 0.1, scale: 50, waterLevel: 0.15 },
    description: 'Warm shores of sand and reef washed by gentle tropical seas.'
  },
  {
    id: 'flooded-grasslands',
    name: 'Flooded Grasslands / Swamp',
    color: '#c5d9c4',
    features: ['marsh', 'reed beds', 'shallow lakes', 'bog'],
    woodMod: 0.7,
    openLand: 0.4,
    openTerrainId: 'wetland',
    food: 0.6,
    elevation: { base: 0.1, variance: 0.05, scale: 80, waterLevel: 0.2 },
    description: 'Waterlogged plains filled with reeds, marshes and standing water.'
  },
  {
    id: 'island-temperate',
    name: 'Island (Temperate)',
    color: '#d6dbe8',
    features: ['pebble beach', 'forest interior', 'cliffs', 'tidal inlet'],
    woodMod: 0.8,
    openLand: 0.5,
    openTerrainId: 'grassland',
    food: 0.7,
    elevation: { base: 0.25, variance: 0.1, scale: 40, waterLevel: 0.2 },
    description: 'A temperate island with forests, cliffs and cool seas.'
  },
  {
    id: 'island-tropical',
    name: 'Island (Tropical)',
    color: '#f7dcbf',
    features: ['palm beach', 'volcanic ridge', 'lagoon', 'coral reef'],
    woodMod: 0.9,
    openLand: 0.5,
    openTerrainId: 'tropical',
    food: 0.9,
    elevation: { base: 0.25, variance: 0.1, scale: 40, waterLevel: 0.2 },
    description: 'Lush tropical islands fringed by palms and volcanic heights.'
  },
  {
    id: 'mangrove',
    name: 'Mangrove',
    color: '#c9e0d0',
    features: ['mangrove forest', 'brackish water', 'mudflats', 'tidal creek'],
    woodMod: 1.0,
    openLand: 0.3,
    openTerrainId: 'wetland',
    food: 0.8,
    elevation: { base: 0.15, variance: 0.05, scale: 30, waterLevel: 0.18 },
    description: 'Dense coastal forests rooted in tidal mud and brackish water.'
  },
  {
    id: 'mediterranean-woodland',
    name: 'Mediterranean Woodland',
    color: '#e4d2bb',
    features: ['scrubland', 'olive groves', 'rocky hills', 'seasonal stream'],
    woodMod: 0.9,
    openLand: 0.6,
    openTerrainId: 'grassland',
    food: 0.7,
    elevation: { base: 0.3, variance: 0.15, scale: 70, waterLevel: 0.2 },
    description: 'Warm dry woodlands with scrub and hardy trees.'
  },
  {
    id: 'montane-cloud',
    name: 'Montane / Cloud',
    color: '#d0d8e8',
    features: ['misty forest', 'steep terrain', 'waterfalls', 'cloud-fed springs'],
    woodMod: 0.8,
    openLand: 0.3,
    openTerrainId: 'alpine',
    food: 0.5,
    elevation: { base: 0.6, variance: 0.2, scale: 40, waterLevel: 0.25 },
    description: 'High elevation forests perpetually shrouded in mist.'
  },
  {
    id: 'savanna',
    name: 'Savanna',
    color: '#ead9b8',
    features: ['grassland', 'acacia trees', 'watering hole', 'seasonal river'],
    woodMod: 0.6,
    openLand: 0.8,
    openTerrainId: 'savanna',
    food: 0.5,
    elevation: { base: 0.3, variance: 0.15, scale: 80, waterLevel: 0.18 },
    description: 'Vast grassy plains dotted with trees and seasonal water.'
  },
  {
    id: 'temperate-deciduous',
    name: 'Temperate Deciduous',
    color: '#d5dfc5',
    features: ['broadleaf forest', 'meadow', 'stream', 'forest lake'],
    woodMod: 1.1,
    openLand: 0.6,
    openTerrainId: 'plains',
    food: 0.7,
    elevation: { base: 0.35, variance: 0.15, scale: 60, waterLevel: 0.2 },
    description: 'Forests of broadleaf trees that change with the seasons.'
  },
  {
    id: 'temperate-rainforest',
    name: 'Temperate Rainforest',
    color: '#c2dccc',
    features: ['wet forest', 'coastal cliffs', 'mossy ground', 'rain-fed river'],
    woodMod: 1.1,
    openLand: 0.4,
    openTerrainId: 'temperate',
    food: 0.8,
    elevation: { base: 0.3, variance: 0.15, scale: 50, waterLevel: 0.2 },
    description: 'Mild coastal forests kept lush by constant rain and fog.'
  },
  {
    id: 'tropical-monsoon',
    name: 'Tropical Monsoon',
    color: '#f1d4c3',
    features: ['seasonal forest', 'river delta', 'monsoon rains', 'seasonal lagoon'],
    woodMod: 1.0,
    openLand: 0.5,
    openTerrainId: 'tropical',
    food: 1.0,
    elevation: { base: 0.3, variance: 0.2, scale: 60, waterLevel: 0.25 },
    description: 'Tropical forests with distinct wet and dry seasons.'
  },
  {
    id: 'tropical-rainforest',
    name: 'Tropical Rainforest',
    color: '#c4e0c0',
    features: ['dense jungle', 'river', 'rolling hills', 'hidden waterfall'],
    woodMod: 1.2,
    openLand: 0.3,
    openTerrainId: 'rainforest',
    food: 1.2,
    elevation: { base: 0.35, variance: 0.15, scale: 70, waterLevel: 0.25 },
    description: 'Hot, humid jungles teeming with life and thick vegetation.'
  },
  {
    id: 'random',
    name: 'Random',
    color: '#d6cbe3',
    features: ['Varies with each seed'],
    woodMod: 1.0,
    openLand: 0.5,
    openTerrainId: 'temperate',
    food: 0.6,
    elevation: { base: 0.35, variance: 0.15, scale: 60, waterLevel: 0.2 },
    description: 'Selects one of the other biomes using your seed before play begins.'
  }
];

const biomeMap = new Map(biomes.map(b => [b.id, b]));

export function getBiome(id) {
  return biomeMap.get(id);
}

