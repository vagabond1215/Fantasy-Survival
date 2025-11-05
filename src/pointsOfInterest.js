import { biomes, getBiome } from './biomes.js';

export const pointsOfInterestData = Object.freeze({
  'mountain-alpine': Object.freeze([
    'glacial cave',
    'frozen waterfall',
    'mountain spring',
    'rocky ravine'
  ]),
  'boreal-conifer': Object.freeze([
    'ice cave',
    'pine river',
    'bog',
    'spring-fed pond'
  ]),
  'temperate-maritime': Object.freeze([
    'pebble beach',
    'sea cave',
    'river mouth',
    'tidal pool'
  ]),
  'tropical-maritime': Object.freeze([
    'sandy beach',
    'coral lagoon',
    'freshwater spring',
    'sea cave'
  ]),
  'wetland-floodplain': Object.freeze([
    'reed marsh',
    'shallow lake',
    'slow river',
    'muddy spring'
  ]),
  'coastal-mangrove': Object.freeze([
    'tidal creek',
    'brackish lagoon',
    'mudflat',
    'freshwater spring'
  ]),
  'mediterranean-scrub': Object.freeze([
    'limestone cave',
    'rocky spring',
    'seasonal river',
    'stone ravine'
  ]),
  'mountain-cloudforest': Object.freeze([
    'misty waterfall',
    'mountain spring',
    'steep ravine',
    'cloud forest cave'
  ]),
  'tropical-savanna': Object.freeze([
    'watering hole',
    'seasonal river',
    'acacia grove',
    'rocky outcrop cave'
  ]),
  'temperate-broadleaf': Object.freeze([
    'forest stream',
    'limestone cave',
    'spring-fed pond',
    'river gorge'
  ]),
  'temperate-coastal-rainforest': Object.freeze([
    'mossy waterfall',
    'river gorge',
    'cedar bog',
    'sea cave'
  ]),
  'tropical-monsoon-forest': Object.freeze([
    'river delta',
    'monsoon waterfall',
    'limestone cave',
    'seasonal lagoon'
  ]),
  'equatorial-rainforest': Object.freeze([
    'jungle river',
    'hidden waterfall',
    'limestone cave',
    'forest spring'
  ])
});

const pointsOfInterestMap = new Map(Object.entries(pointsOfInterestData));

biomes.forEach(biome => {
  const canonical = pointsOfInterestMap.get(biome.id);
  if (!canonical) return;
  const aliases = Array.isArray(biome.legacyIds) ? biome.legacyIds : [];
  aliases.forEach(alias => {
    if (!pointsOfInterestMap.has(alias)) {
      pointsOfInterestMap.set(alias, canonical);
    }
  });
});

export function getPointsOfInterest(id) {
  if (!id) return [];
  const biome = getBiome(id);
  const list = pointsOfInterestMap.get(biome?.id ?? id);
  return Array.isArray(list) ? [...list] : [];
}

export function generatePointsOfInterest(id, count = 3) {
  const list = getPointsOfInterest(id);
  const shuffled = [...list];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
