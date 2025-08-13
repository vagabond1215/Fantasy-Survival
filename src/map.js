import { getBiome } from './biomes.js';
import store from './state.js';

// Color themes for each biome and season
export const BIOME_COLOR_THEMES = {
  alpine: {
    Spring: { water: '#1E90FF', open: '#9ACD32', forest: '#2E8B57', ore: '#B87333' },
    Summer: { water: '#1E90FF', open: '#7CFC00', forest: '#228B22', ore: '#B87333' },
    Autumn: { water: '#1E90FF', open: '#DEB887', forest: '#556B2F', ore: '#B87333' },
    Winter: { water: '#ADD8E6', open: '#FFFFFF', forest: '#A9A9A9', ore: '#B87333' }
  },
  'boreal-taiga': {
    Spring: { water: '#4682B4', open: '#98FB98', forest: '#2E8B57', ore: '#B87333' },
    Summer: { water: '#4682B4', open: '#6B8E23', forest: '#006400', ore: '#B87333' },
    Autumn: { water: '#4682B4', open: '#CD853F', forest: '#556B2F', ore: '#B87333' },
    Winter: { water: '#87CEFA', open: '#F5F5F5', forest: '#A9A9A9', ore: '#B87333' }
  },
  'coastal-temperate': {
    Spring: { water: '#87CEFA', open: '#90EE90', forest: '#228B22', ore: '#B87333' },
    Summer: { water: '#1E90FF', open: '#7CFC00', forest: '#006400', ore: '#B87333' },
    Autumn: { water: '#87CEEB', open: '#DAA520', forest: '#8B4513', ore: '#B87333' },
    Winter: { water: '#B0C4DE', open: '#D3D3D3', forest: '#A9A9A9', ore: '#B87333' }
  },
  'coastal-tropical': {
    Spring: { water: '#00CED1', open: '#FFE4B5', forest: '#2E8B57', ore: '#B87333' },
    Summer: { water: '#00CED1', open: '#FFDAB9', forest: '#228B22', ore: '#B87333' },
    Autumn: { water: '#00CED1', open: '#FFE4B5', forest: '#228B22', ore: '#B87333' },
    Winter: { water: '#00CED1', open: '#FFE4B5', forest: '#228B22', ore: '#B87333' }
  },
  'flooded-grasslands': {
    Spring: { water: '#2E8B57', open: '#ADFF2F', forest: '#556B2F', ore: '#B87333' },
    Summer: { water: '#228B22', open: '#7FFF00', forest: '#006400', ore: '#B87333' },
    Autumn: { water: '#2E8B57', open: '#CD853F', forest: '#556B2F', ore: '#B87333' },
    Winter: { water: '#4682B4', open: '#F0E68C', forest: '#A9A9A9', ore: '#B87333' }
  },
  'island-temperate': {
    Spring: { water: '#1E90FF', open: '#90EE90', forest: '#228B22', ore: '#B87333' },
    Summer: { water: '#1E90FF', open: '#7CFC00', forest: '#006400', ore: '#B87333' },
    Autumn: { water: '#1E90FF', open: '#DAA520', forest: '#8B4513', ore: '#B87333' },
    Winter: { water: '#87CEEB', open: '#D3D3D3', forest: '#A9A9A9', ore: '#B87333' }
  },
  'island-tropical': {
    Spring: { water: '#00BFFF', open: '#FFE4B5', forest: '#2E8B57', ore: '#B87333' },
    Summer: { water: '#00BFFF', open: '#FFDAB9', forest: '#228B22', ore: '#B87333' },
    Autumn: { water: '#00BFFF', open: '#FFE4B5', forest: '#228B22', ore: '#B87333' },
    Winter: { water: '#00BFFF', open: '#FFE4B5', forest: '#228B22', ore: '#B87333' }
  },
  mangrove: {
    Spring: { water: '#2F4F4F', open: '#BDB76B', forest: '#556B2F', ore: '#B87333' },
    Summer: { water: '#2F4F4F', open: '#BDB76B', forest: '#2E8B57', ore: '#B87333' },
    Autumn: { water: '#2F4F4F', open: '#CD853F', forest: '#556B2F', ore: '#B87333' },
    Winter: { water: '#2F4F4F', open: '#C0C0C0', forest: '#A9A9A9', ore: '#B87333' }
  },
  'mediterranean-woodland': {
    Spring: { water: '#4682B4', open: '#9ACD32', forest: '#556B2F', ore: '#B87333' },
    Summer: { water: '#4682B4', open: '#C2B280', forest: '#6B8E23', ore: '#B87333' },
    Autumn: { water: '#4682B4', open: '#CD853F', forest: '#8B4513', ore: '#B87333' },
    Winter: { water: '#4682B4', open: '#D3D3D3', forest: '#A9A9A9', ore: '#B87333' }
  },
  'montane-cloud': {
    Spring: { water: '#87CEEB', open: '#66CDAA', forest: '#2E8B57', ore: '#B87333' },
    Summer: { water: '#87CEEB', open: '#7FFFD4', forest: '#228B22', ore: '#B87333' },
    Autumn: { water: '#87CEEB', open: '#DAA520', forest: '#556B2F', ore: '#B87333' },
    Winter: { water: '#B0E0E6', open: '#F0F8FF', forest: '#A9A9A9', ore: '#B87333' }
  },
  savanna: {
    Spring: { water: '#1E90FF', open: '#ADFF2F', forest: '#556B2F', ore: '#B87333' },
    Summer: { water: '#1E90FF', open: '#DAA520', forest: '#6B8E23', ore: '#B87333' },
    Autumn: { water: '#1E90FF', open: '#CD853F', forest: '#8B4513', ore: '#B87333' },
    Winter: { water: '#1E90FF', open: '#F0E68C', forest: '#808000', ore: '#B87333' }
  },
  'temperate-deciduous': {
    Spring: { water: '#1E90FF', open: '#90EE90', forest: '#228B22', ore: '#B87333' },
    Summer: { water: '#1E90FF', open: '#7CFC00', forest: '#006400', ore: '#B87333' },
    Autumn: { water: '#1E90FF', open: '#DEB887', forest: '#8B4513', ore: '#B87333' },
    Winter: { water: '#87CEFA', open: '#F5F5F5', forest: '#A9A9A9', ore: '#B87333' }
  },
  'temperate-rainforest': {
    Spring: { water: '#4682B4', open: '#90EE90', forest: '#2E8B57', ore: '#B87333' },
    Summer: { water: '#4682B4', open: '#7CFC00', forest: '#006400', ore: '#B87333' },
    Autumn: { water: '#4682B4', open: '#8FBC8F', forest: '#556B2F', ore: '#B87333' },
    Winter: { water: '#4682B4', open: '#98FB98', forest: '#2F4F4F', ore: '#B87333' }
  },
  'tropical-monsoon': {
    Spring: { water: '#00CED1', open: '#32CD32', forest: '#228B22', ore: '#B87333' },
    Summer: { water: '#00CED1', open: '#7CFC00', forest: '#006400', ore: '#B87333' },
    Autumn: { water: '#00CED1', open: '#ADFF2F', forest: '#228B22', ore: '#B87333' },
    Winter: { water: '#00CED1', open: '#C2B280', forest: '#556B2F', ore: '#B87333' }
  },
  'tropical-rainforest': {
    Spring: { water: '#00BFFF', open: '#32CD32', forest: '#006400', ore: '#B87333' },
    Summer: { water: '#00BFFF', open: '#00FF7F', forest: '#006400', ore: '#B87333' },
    Autumn: { water: '#00BFFF', open: '#3CB371', forest: '#228B22', ore: '#B87333' },
    Winter: { water: '#00BFFF', open: '#2E8B57', forest: '#2E8B57', ore: '#B87333' }
  }
};

export function getFeatureColors(biomeId, season = store.time.season) {
  const biomeColors = BIOME_COLOR_THEMES[biomeId];
  if (biomeColors && biomeColors[season]) return biomeColors[season];
  return { water: '#1E90FF', open: '#7CFC00', forest: '#228B22', ore: '#B87333' };
}

export function hasWaterFeature(features = []) {
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

function noise2D(seed, x, y, scale, salt) {
  const nx = x / scale;
  const ny = y / scale;
  const x0 = Math.floor(nx);
  const y0 = Math.floor(ny);
  const x1 = x0 + 1;
  const y1 = y0 + 1;
  const sx = nx - x0;
  const sy = ny - y0;

  const n00 = coordRand(seed, x0, y0, salt);
  const n10 = coordRand(seed, x1, y0, salt);
  const n01 = coordRand(seed, x0, y1, salt);
  const n11 = coordRand(seed, x1, y1, salt);

  const ix0 = lerp(n00, n10, sx);
  const ix1 = lerp(n01, n11, sx);
  return lerp(ix0, ix1, sy);
}

function elevationNoise(seed, x, y, scale) {
  return noise2D(seed, x, y, scale, 'elev');
}

function vegetationNoise(seed, x, y, scale) {
  return noise2D(seed, x, y, scale, 'veg');
}

function oreNoise(seed, x, y, scale) {
  return noise2D(seed, x, y, scale, 'ore');
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
  height = 200,
  season = store.time.season,
  waterLevelOverride
) {
  const biome = getBiome(biomeId);
  const openLand = biome?.openLand ?? 0.5;
  const waterFeature = biome && hasWaterFeature(biome.features);
  const pixels = [];
  const elevations = [];
  const colors = getFeatureColors(biomeId, season);
  const waterLevel = waterLevelOverride ?? biome?.elevation?.waterLevel ?? 0.3;
  // scale for vegetation pattern: more open land -> larger contiguous clearings
  const vegScale = 20 + openLand * 80;

  for (let y = 0; y < height; y++) {
    const row = [];
    const eRow = [];
    for (let x = 0; x < width; x++) {
      const gx = xStart + x;
      const gy = yStart + y;
      const elevation = getElevation(seed, gx, gy, biome?.elevation);
      eRow.push(elevation);
      let type;
      if (waterFeature && elevation < waterLevel) {
        type = 'water';
      } else {
        type = vegetationNoise(seed, gx, gy, vegScale) < openLand ? 'open' : 'forest';
        const oreVal = oreNoise(seed, gx, gy, 12);
        if (oreVal > 0.85 && elevation >= waterLevel) type = 'ore';
      }
      row.push(colors[type]);
    }
    pixels.push(row);
    elevations.push(eRow);
  }

  return { scale: 100, seed, xStart, yStart, pixels, elevations, season };
}
export function getBiomeBorderColor(biomeId, season = store.time.season) {
  const biome = getBiome(biomeId);
  const colors = getFeatureColors(biomeId, season);
  if (!biome) return colors.open;
  if (hasWaterFeature(biome.features)) return colors.water;
  return biome.openLand > 0.5 ? colors.open : colors.forest;
}
