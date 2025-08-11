import { getBiome } from './biomes.js';

export const FEATURE_COLORS = {
  water: '#1E90FF', // blue
  open: '#7CFC00', // light green
  forest: '#228B22', // forest green
  ore: '#B87333' // coppery brown for ore deposits
};

function hasWaterFeature(features = []) {
  return features.some(f => /(water|river|lake|shore|beach|lagoon|reef|marsh|bog|swamp|delta|stream|tide|coast)/i.test(f));
}

export function generateColorMap(biomeId) {
  const size = 200; // doubled map dimensions
  const biome = getBiome(biomeId);
  const openLand = biome?.openLand ?? 0.5;
  const waterChance = biome && hasWaterFeature(biome.features) ? 0.2 : 0.05;
  const oreChance = 0.02; // rare ore deposits
  const pixels = [];
  for (let y = 0; y < size; y++) {
    const row = [];
    for (let x = 0; x < size; x++) {
      const r = Math.random();
      let feature;
      if (r < waterChance) feature = 'water';
      else if (r < waterChance + oreChance) feature = 'ore';
      else if (r < waterChance + oreChance + openLand) feature = 'open';
      else feature = 'forest';
      row.push(FEATURE_COLORS[feature]);
    }
    pixels.push(row);
  }
  return { scale: 100, pixels };
}
