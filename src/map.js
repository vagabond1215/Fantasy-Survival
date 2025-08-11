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

// Deterministic pseudo-random generator based on string seed
function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = h << 13 | h >>> 19;
  }
  return function () {
    h = Math.imul(h ^ h >>> 16, 2246822507);
    h = Math.imul(h ^ h >>> 13, 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

function mulberry32(a) {
  return function () {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Produces a deterministic random number for a coordinate pair
function coordRand(seed, x, y, salt = '') {
  const rng = mulberry32(xmur3(`${seed}:${x}:${y}:${salt}`)());
  return rng();
}

export function generateColorMap(
  biomeId,
  seed = Date.now(),
  xStart = 0,
  yStart = 0,
  width = 200,
  height = 200
) {
  const biome = getBiome(biomeId);
  const openLand = biome?.openLand ?? 0.5;
  const waterFeature = biome && hasWaterFeature(biome.features);
  const pixels = [];

  for (let y = 0; y < height; y++) {
    const row = [];
    for (let x = 0; x < width; x++) {
      const gx = xStart + x;
      const gy = yStart + y;
      let type = coordRand(seed, gx, gy, 'terrain') < openLand ? 'open' : 'forest';
      if (waterFeature && coordRand(seed, gx, gy, 'water') < 0.05) type = 'water';
      if (coordRand(seed, gx, gy, 'ore') < 0.02) type = 'ore';
      row.push(FEATURE_COLORS[type]);
    }
    pixels.push(row);
  }

  return { scale: 100, seed, xStart, yStart, pixels };
}
