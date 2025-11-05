export const rawBiomeSchema = [
  {
    id: 'mountain-alpine',
    legacyIds: ['alpine'],
    name: 'Alpine Highlands',
    color: '#c8d9eb',
    category: 'mountain',
    latitudeRange: { min: 55, max: 75 },
    elevationRange: { min: 0.75, max: 1 },
    climate: {
      temperature: 'frigid',
      precipitation: 'low',
      hints: [
        'permanent snowfields and windswept ridges',
        'thin air that shortens workdays without preparation'
      ]
    },
    freshwater: {
      springs: 5,
      streams: 3,
      lakes: 2,
      wetlands: 0
    },
    transitions: {
      upslope: ['perennial-glacier'],
      downslope: ['mountain-cloudforest', 'boreal-conifer'],
      lateral: ['boreal-conifer']
    },
    openTerrainHints: ['tundra', 'alpine'],
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
    id: 'boreal-conifer',
    legacyIds: ['boreal-taiga'],
    name: 'Boreal Conifer Forest',
    color: '#b9cfc2',
    category: 'subpolar-forest',
    latitudeRange: { min: 50, max: 70 },
    elevationRange: { min: 0.3, max: 0.6 },
    climate: {
      temperature: 'cold',
      precipitation: 'moderate',
      hints: ['long winters with thaw-limited growing seasons', 'frequent bogs and muskeg lowlands']
    },
    freshwater: {
      springs: 3,
      streams: 4,
      lakes: 4,
      wetlands: 3
    },
    transitions: {
      upslope: ['mountain-alpine'],
      downslope: ['temperate-broadleaf'],
      lateral: ['wetland-floodplain']
    },
    openTerrainHints: ['taiga', 'tundra'],
    features: ['conifer forest', 'bog', 'cold rivers', 'glacial lake'],
    woodMod: 1.0,
    openLand: 0.3,
    openTerrainId: 'taiga',
    food: 0.4,
    elevation: { base: 0.4, variance: 0.2, scale: 60, waterLevel: 0.3 },
    description: 'Cold northern forests dominated by pines and dotted with bogs.'
  },
  {
    id: 'temperate-maritime',
    legacyIds: ['coastal-temperate', 'island-temperate'],
    name: 'Temperate Maritime Coast',
    color: '#bcd7e6',
    category: 'coastal-temperate',
    latitudeRange: { min: 35, max: 60 },
    elevationRange: { min: 0, max: 0.35 },
    climate: {
      temperature: 'cool',
      precipitation: 'high',
      hints: ['persistent sea fog', 'strong tidal currents exposing tide pools']
    },
    freshwater: {
      springs: 3,
      streams: 4,
      lakes: 2,
      wetlands: 2
    },
    transitions: {
      upslope: ['temperate-broadleaf'],
      downslope: ['continental-shelf'],
      lateral: ['temperate-coastal-rainforest']
    },
    openTerrainHints: ['coast'],
    features: ['rocky shore', 'tide pools', 'windy cliffs', 'sea inlet'],
    woodMod: 0.8,
    openLand: 0.5,
    openTerrainId: 'coast',
    food: 0.6,
    elevation: { base: 0.2, variance: 0.1, scale: 50, waterLevel: 0.15 },
    description: 'Cool coasts with rocky beaches and windswept cliffs.'
  },
  {
    id: 'tropical-maritime',
    legacyIds: ['coastal-tropical', 'island-tropical'],
    name: 'Tropical Maritime Coast',
    color: '#f4d7b7',
    category: 'coastal-tropical',
    latitudeRange: { min: 5, max: 25 },
    elevationRange: { min: 0, max: 0.3 },
    climate: {
      temperature: 'hot',
      precipitation: 'moderate',
      hints: ['warm ocean currents', 'coral reefs lining lagoon waters']
    },
    freshwater: {
      springs: 4,
      streams: 3,
      lakes: 2,
      wetlands: 3
    },
    transitions: {
      upslope: ['tropical-monsoon-forest'],
      downslope: ['coral-sea'],
      lateral: ['coastal-mangrove']
    },
    openTerrainHints: ['sand', 'coast'],
    features: ['sandy beaches', 'coral reefs', 'lagoon', 'tidal creek'],
    woodMod: 0.9,
    openLand: 0.5,
    openTerrainId: 'sand',
    food: 0.9,
    elevation: { base: 0.2, variance: 0.1, scale: 50, waterLevel: 0.15 },
    description: 'Warm shores of sand and reef washed by gentle tropical seas.'
  },
  {
    id: 'wetland-floodplain',
    legacyIds: ['flooded-grasslands'],
    name: 'Floodplain Wetlands',
    color: '#c5d9c4',
    category: 'wetland',
    latitudeRange: { min: 10, max: 45 },
    elevationRange: { min: 0.05, max: 0.25 },
    climate: {
      temperature: 'warm',
      precipitation: 'high',
      hints: ['seasonal inundation', 'sediment-rich backwaters']
    },
    freshwater: {
      springs: 2,
      streams: 4,
      lakes: 5,
      wetlands: 5
    },
    transitions: {
      upslope: ['temperate-broadleaf', 'tropical-monsoon-forest'],
      downslope: ['coastal-mangrove'],
      lateral: ['tropical-savanna']
    },
    openTerrainHints: ['wetland', 'plains'],
    features: ['marsh', 'reed beds', 'shallow lakes', 'bog'],
    woodMod: 0.7,
    openLand: 0.4,
    openTerrainId: 'wetland',
    food: 0.6,
    elevation: { base: 0.1, variance: 0.05, scale: 80, waterLevel: 0.2 },
    description: 'Waterlogged plains filled with reeds, marshes and standing water.'
  },
  {
    id: 'coastal-mangrove',
    legacyIds: ['mangrove'],
    name: 'Coastal Mangrove',
    color: '#c9e0d0',
    category: 'wetland',
    latitudeRange: { min: 0, max: 25 },
    elevationRange: { min: 0, max: 0.15 },
    climate: {
      temperature: 'hot',
      precipitation: 'high',
      hints: ['brackish tides', 'dense prop-root thickets']
    },
    freshwater: {
      springs: 3,
      streams: 2,
      lakes: 1,
      wetlands: 5
    },
    transitions: {
      upslope: ['tropical-monsoon-forest'],
      downslope: ['tropical-maritime'],
      lateral: ['wetland-floodplain']
    },
    openTerrainHints: ['wetland', 'coast'],
    features: ['mangrove forest', 'brackish water', 'mudflats', 'tidal creek'],
    woodMod: 1.0,
    openLand: 0.3,
    openTerrainId: 'wetland',
    food: 0.8,
    elevation: { base: 0.15, variance: 0.05, scale: 30, waterLevel: 0.18 },
    description: 'Dense coastal forests rooted in tidal mud and brackish water.'
  },
  {
    id: 'mediterranean-scrub',
    legacyIds: ['mediterranean-woodland'],
    name: 'Mediterranean Scrub Woodland',
    color: '#e4d2bb',
    category: 'mediterranean',
    latitudeRange: { min: 25, max: 45 },
    elevationRange: { min: 0.2, max: 0.5 },
    climate: {
      temperature: 'warm',
      precipitation: 'seasonal',
      hints: ['dry summers with mistral winds', 'winter rains encouraging quick regrowth']
    },
    freshwater: {
      springs: 3,
      streams: 3,
      lakes: 2,
      wetlands: 1
    },
    transitions: {
      upslope: ['mountain-cloudforest'],
      downslope: ['temperate-maritime'],
      lateral: ['temperate-broadleaf']
    },
    openTerrainHints: ['grassland', 'plains'],
    features: ['scrubland', 'olive groves', 'rocky hills', 'seasonal stream'],
    woodMod: 0.9,
    openLand: 0.6,
    openTerrainId: 'grassland',
    food: 0.7,
    elevation: { base: 0.3, variance: 0.15, scale: 70, waterLevel: 0.2 },
    description: 'Warm dry woodlands with scrub and hardy trees.'
  },
  {
    id: 'mountain-cloudforest',
    legacyIds: ['montane-cloud'],
    name: 'Montane Cloud Forest',
    color: '#d0d8e8',
    category: 'mountain-forest',
    latitudeRange: { min: 15, max: 40 },
    elevationRange: { min: 0.55, max: 0.8 },
    climate: {
      temperature: 'cool',
      precipitation: 'very-high',
      hints: ['orographic rainfall', 'perpetual mist and waterfalls']
    },
    freshwater: {
      springs: 4,
      streams: 5,
      lakes: 3,
      wetlands: 2
    },
    transitions: {
      upslope: ['mountain-alpine'],
      downslope: ['tropical-monsoon-forest', 'mediterranean-scrub'],
      lateral: ['temperate-coastal-rainforest']
    },
    openTerrainHints: ['alpine', 'rainforest'],
    features: ['misty forest', 'steep terrain', 'waterfalls', 'cloud-fed springs'],
    woodMod: 0.8,
    openLand: 0.3,
    openTerrainId: 'alpine',
    food: 0.5,
    elevation: { base: 0.6, variance: 0.2, scale: 40, waterLevel: 0.25 },
    description: 'High elevation forests perpetually shrouded in mist.'
  },
  {
    id: 'tropical-savanna',
    legacyIds: ['savanna'],
    name: 'Tropical Savanna',
    color: '#ead9b8',
    category: 'tropical-grassland',
    latitudeRange: { min: 5, max: 25 },
    elevationRange: { min: 0.2, max: 0.45 },
    climate: {
      temperature: 'hot',
      precipitation: 'seasonal',
      hints: ['extended dry season with lightning storms', 'grass fires rejuvenating grazing land']
    },
    freshwater: {
      springs: 2,
      streams: 3,
      lakes: 2,
      wetlands: 1
    },
    transitions: {
      upslope: ['tropical-monsoon-forest'],
      downslope: ['wetland-floodplain'],
      lateral: ['tropical-maritime']
    },
    openTerrainHints: ['savanna', 'grassland'],
    features: ['grassland', 'acacia trees', 'watering hole', 'seasonal river'],
    woodMod: 0.6,
    openLand: 0.8,
    openTerrainId: 'savanna',
    food: 0.5,
    elevation: { base: 0.3, variance: 0.15, scale: 80, waterLevel: 0.18 },
    description: 'Vast grassy plains dotted with trees and seasonal water.'
  },
  {
    id: 'temperate-broadleaf',
    legacyIds: ['temperate-deciduous'],
    name: 'Temperate Broadleaf Forest',
    color: '#d5dfc5',
    category: 'temperate-forest',
    latitudeRange: { min: 30, max: 55 },
    elevationRange: { min: 0.2, max: 0.5 },
    climate: {
      temperature: 'mild',
      precipitation: 'moderate',
      hints: ['distinct seasons', 'lush understory after spring rains']
    },
    freshwater: {
      springs: 3,
      streams: 5,
      lakes: 3,
      wetlands: 2
    },
    transitions: {
      upslope: ['mountain-cloudforest'],
      downslope: ['temperate-maritime', 'wetland-floodplain'],
      lateral: ['mediterranean-scrub']
    },
    openTerrainHints: ['plains', 'temperate'],
    features: ['broadleaf forest', 'meadow', 'stream', 'forest lake'],
    woodMod: 1.1,
    openLand: 0.6,
    openTerrainId: 'plains',
    food: 0.7,
    elevation: { base: 0.35, variance: 0.15, scale: 60, waterLevel: 0.2 },
    description: 'Forests of broadleaf trees that change with the seasons.'
  },
  {
    id: 'temperate-coastal-rainforest',
    legacyIds: ['temperate-rainforest'],
    name: 'Temperate Coastal Rainforest',
    color: '#c2dccc',
    category: 'temperate-forest',
    latitudeRange: { min: 40, max: 60 },
    elevationRange: { min: 0.25, max: 0.55 },
    climate: {
      temperature: 'cool',
      precipitation: 'very-high',
      hints: ['constant drizzle and fog', 'towering evergreen canopies']
    },
    freshwater: {
      springs: 3,
      streams: 5,
      lakes: 4,
      wetlands: 3
    },
    transitions: {
      upslope: ['mountain-cloudforest'],
      downslope: ['temperate-maritime'],
      lateral: ['temperate-broadleaf']
    },
    openTerrainHints: ['temperate', 'rainforest'],
    features: ['wet forest', 'coastal cliffs', 'mossy ground', 'rain-fed river'],
    woodMod: 1.1,
    openLand: 0.4,
    openTerrainId: 'temperate',
    food: 0.8,
    elevation: { base: 0.3, variance: 0.15, scale: 50, waterLevel: 0.2 },
    description: 'Mild coastal forests kept lush by constant rain and fog.'
  },
  {
    id: 'tropical-monsoon-forest',
    legacyIds: ['tropical-monsoon'],
    name: 'Tropical Monsoon Forest',
    color: '#f1d4c3',
    category: 'tropical-forest',
    latitudeRange: { min: 5, max: 20 },
    elevationRange: { min: 0.2, max: 0.55 },
    climate: {
      temperature: 'hot',
      precipitation: 'extreme-seasonal',
      hints: ['intense wet seasons', 'dry seasons concentrating wildlife near rivers']
    },
    freshwater: {
      springs: 4,
      streams: 5,
      lakes: 3,
      wetlands: 3
    },
    transitions: {
      upslope: ['mountain-cloudforest'],
      downslope: ['tropical-maritime', 'coastal-mangrove'],
      lateral: ['equatorial-rainforest']
    },
    openTerrainHints: ['tropical', 'rainforest'],
    features: ['seasonal forest', 'river delta', 'monsoon rains', 'seasonal lagoon'],
    woodMod: 1.0,
    openLand: 0.5,
    openTerrainId: 'tropical',
    food: 1.0,
    elevation: { base: 0.3, variance: 0.2, scale: 60, waterLevel: 0.25 },
    description: 'Tropical forests with distinct wet and dry seasons.'
  },
  {
    id: 'equatorial-rainforest',
    legacyIds: ['tropical-rainforest'],
    name: 'Equatorial Rainforest',
    color: '#c4e0c0',
    category: 'tropical-forest',
    latitudeRange: { min: 0, max: 10 },
    elevationRange: { min: 0.25, max: 0.55 },
    climate: {
      temperature: 'hot',
      precipitation: 'constant',
      hints: ['daily convection storms', 'dense canopy with layered understory']
    },
    freshwater: {
      springs: 4,
      streams: 5,
      lakes: 4,
      wetlands: 4
    },
    transitions: {
      upslope: ['mountain-cloudforest'],
      downslope: ['tropical-maritime', 'coastal-mangrove'],
      lateral: ['tropical-monsoon-forest']
    },
    openTerrainHints: ['rainforest', 'jungle'],
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
    legacyIds: ['random'],
    name: 'Random',
    color: '#d6cbe3',
    category: 'special',
    latitudeRange: { min: 0, max: 90 },
    elevationRange: { min: 0, max: 1 },
    climate: {
      temperature: 'varies',
      precipitation: 'varies',
      hints: ['Selects one of the other biomes using your seed before play begins.']
    },
    freshwater: {
      springs: 1,
      streams: 1,
      lakes: 1,
      wetlands: 1
    },
    transitions: {
      any: [
        'mountain-alpine',
        'temperate-broadleaf',
        'equatorial-rainforest',
        'temperate-maritime'
      ]
    },
    openTerrainHints: ['temperate'],
    features: ['Varies with each seed'],
    woodMod: 1.0,
    openLand: 0.5,
    openTerrainId: 'temperate',
    food: 0.6,
    elevation: { base: 0.35, variance: 0.15, scale: 60, waterLevel: 0.2 },
    description: 'Selects one of the other biomes using your seed before play begins.'
  }
];

function freezeRecord(source) {
  if (!source || typeof source !== 'object') {
    return Object.freeze({});
  }
  return Object.freeze({ ...source });
}

function freezeRecordOfArrays(source) {
  if (!source || typeof source !== 'object') {
    return Object.freeze({});
  }
  const entries = Object.entries(source).reduce((acc, [key, value]) => {
    if (Array.isArray(value)) {
      acc[key] = Object.freeze([...value]);
    } else if (value && typeof value === 'object') {
      acc[key] = freezeRecordOfArrays(value);
    } else if (value !== undefined) {
      acc[key] = value;
    }
    return acc;
  }, {});
  return Object.freeze(entries);
}

function uniqueStrings(values = []) {
  if (!Array.isArray(values)) return [];
  const normalized = values
    .map(value => (typeof value === 'string' ? value : String(value || '')))
    .filter(Boolean);
  return Array.from(new Set(normalized));
}

export const biomes = rawBiomeSchema.map(definition => {
  const legacyIds = uniqueStrings([...(definition.legacyIds || []), definition.id]);
  const openTerrainHints = definition.openTerrainHints?.length
    ? uniqueStrings(definition.openTerrainHints)
    : uniqueStrings([definition.openTerrainId]);
  return Object.freeze({
    ...definition,
    legacyIds: Object.freeze(legacyIds),
    climate: freezeRecord(definition.climate),
    latitudeRange: freezeRecord(definition.latitudeRange),
    elevationRange: freezeRecord(definition.elevationRange),
    freshwater: freezeRecord(definition.freshwater),
    transitions: freezeRecordOfArrays(definition.transitions),
    features: Object.freeze([...(definition.features || [])]),
    openTerrainHints: Object.freeze(openTerrainHints)
  });
});

const biomeMap = new Map();

biomes.forEach(biome => {
  biomeMap.set(biome.id, biome);
  biome.legacyIds.forEach(alias => {
    if (!biomeMap.has(alias)) {
      biomeMap.set(alias, biome);
    }
  });
});

export function getBiome(id) {
  if (!id) return undefined;
  return biomeMap.get(id) || undefined;
}
