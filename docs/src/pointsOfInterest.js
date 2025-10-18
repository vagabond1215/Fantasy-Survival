export const pointsOfInterestData = {
  'alpine': ['glacial cave', 'frozen waterfall', 'mountain spring', 'rocky ravine'],
  'boreal-taiga': ['ice cave', 'pine river', 'bog', 'spring-fed pond'],
  'coastal-temperate': ['pebble beach', 'sea cave', 'river mouth', 'tidal pool'],
  'coastal-tropical': ['sandy beach', 'coral lagoon', 'freshwater spring', 'sea cave'],
  'flooded-grasslands': ['reed marsh', 'shallow lake', 'slow river', 'muddy spring'],
  'island-temperate': ['rocky beach', 'cliff cave', 'forest spring', 'tidal pool'],
  'island-tropical': ['palm beach', 'volcanic cave', 'jungle river', 'hidden lagoon'],
  'mangrove': ['tidal creek', 'brackish lagoon', 'mudflat', 'freshwater spring'],
  'mediterranean-woodland': ['limestone cave', 'rocky spring', 'seasonal river', 'stone ravine'],
  'montane-cloud': ['misty waterfall', 'mountain spring', 'steep ravine', 'cloud forest cave'],
  'savanna': ['watering hole', 'seasonal river', 'acacia grove', 'rocky outcrop cave'],
  'temperate-deciduous': ['forest stream', 'limestone cave', 'spring-fed pond', 'river gorge'],
  'temperate-rainforest': ['mossy waterfall', 'river gorge', 'cedar bog', 'sea cave'],
  'tropical-monsoon': ['river delta', 'monsoon waterfall', 'limestone cave', 'seasonal lagoon'],
  'tropical-rainforest': ['jungle river', 'hidden waterfall', 'limestone cave', 'forest spring']
};

export function getPointsOfInterest(id) {
  return pointsOfInterestData[id] || [];
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
