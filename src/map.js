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

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function elevationNoise(seed, x, y, scale) {
  const nx = x / scale;
  const ny = y / scale;
  const x0 = Math.floor(nx);
  const y0 = Math.floor(ny);
  const x1 = x0 + 1;
  const y1 = y0 + 1;
  const sx = nx - x0;
  const sy = ny - y0;

  const n00 = coordRand(seed, x0, y0, 'elev');
  const n10 = coordRand(seed, x1, y0, 'elev');
  const n01 = coordRand(seed, x0, y1, 'elev');
  const n11 = coordRand(seed, x1, y1, 'elev');

  const ix0 = lerp(n00, n10, sx);
  const ix1 = lerp(n01, n11, sx);
  return lerp(ix0, ix1, sy);
}

function getElevation(seed, x, y, options = {}) {
  const { base = 0.5, variance = 0.5, scale = 50 } = options;
  const noise = elevationNoise(seed, x, y, scale);
  return base + (noise - 0.5) * 2 * variance;
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
  const elevations = [];

  for (let y = 0; y < height; y++) {
    const row = [];
    const eRow = [];
    for (let x = 0; x < width; x++) {
      const gx = xStart + x;
      const gy = yStart + y;
      const elevation = getElevation(seed, gx, gy, biome?.elevation);
      eRow.push(elevation);
      let type = coordRand(seed, gx, gy, 'terrain') < openLand ? 'open' : 'forest';
      const waterLevel = biome?.elevation?.waterLevel ?? 0.3;
      if (waterFeature && elevation < waterLevel) type = 'water';
      if (coordRand(seed, gx, gy, 'ore') < 0.02 && elevation >= waterLevel) type = 'ore';
      row.push(FEATURE_COLORS[type]);
    }
    pixels.push(row);
    elevations.push(eRow);
  }

  return { scale: 100, seed, xStart, yStart, pixels, elevations };
}
