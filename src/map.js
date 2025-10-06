import { getBiome } from './biomes.js';
import store from './state.js';

export const GRID_DISTANCE_METERS = 100;

export const DEFAULT_MAP_SIZE = 64;
export const DEFAULT_MAP_WIDTH = DEFAULT_MAP_SIZE;
export const DEFAULT_MAP_HEIGHT = DEFAULT_MAP_SIZE;

export const TERRAIN_SYMBOLS = {
  water: '💧',
  open: '🌾',
  forest: '🌲',
  ore: '⛏️',
  stone: '🪨'
};

export const TERRAIN_COLORS = {
  water: '#2d7ff9',
  open: '#facc15',
  forest: '#16a34a',
  ore: '#f97316',
  stone: '#94a3b8'
};

export function computeCenteredStart(width = DEFAULT_MAP_WIDTH, height = DEFAULT_MAP_HEIGHT, focusX = 0, focusY = 0) {
  const normalizedWidth = Math.max(1, Math.trunc(width));
  const normalizedHeight = Math.max(1, Math.trunc(height));
  const halfCols = Math.floor(normalizedWidth / 2);
  const halfRows = Math.floor(normalizedHeight / 2);
  return {
    xStart: Math.round(focusX) - halfCols,
    yStart: Math.round(focusY) - halfRows
  };
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

export function coordinateRandom(seed, x, y, salt = '') {
  return coordRand(seed, x, y, salt);
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
  xStart = null,
  yStart = null,
  width = DEFAULT_MAP_WIDTH,
  height = width,
  season = store.time.season,
  waterLevelOverride,
  viewport = null
) {
  const mapWidth = Math.max(1, Math.trunc(width));
  const mapHeight = Math.max(1, Math.trunc(height ?? width ?? DEFAULT_MAP_WIDTH));
  const { xStart: defaultX, yStart: defaultY } = computeCenteredStart(mapWidth, mapHeight);
  const effectiveXStart = Number.isFinite(xStart) ? Math.trunc(xStart) : defaultX;
  const effectiveYStart = Number.isFinite(yStart) ? Math.trunc(yStart) : defaultY;
  const biome = getBiome(biomeId);
  const openLand = biome?.openLand ?? 0.5;
  const waterFeature = biome && hasWaterFeature(biome.features);
  const tiles = [];
  const terrainTypes = [];
  const elevations = [];
  const waterLevel = waterLevelOverride ?? biome?.elevation?.waterLevel ?? 0.3;
  // scale for vegetation pattern: more open land -> larger contiguous clearings
  const vegScale = 20 + openLand * 80;

  for (let y = 0; y < mapHeight; y++) {
    const row = [];
    const typeRow = [];
    const eRow = [];
    for (let x = 0; x < mapWidth; x++) {
      const gx = effectiveXStart + x;
      const gy = effectiveYStart + y;
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

      if (gx === 0 && gy === 0) {
        type = 'open';
      }

      const symbol = gx === 0 && gy === 0 ? '🚩' : TERRAIN_SYMBOLS[type] || '?';
      row.push(symbol);
      typeRow.push(type);
    }
    tiles.push(row);
    terrainTypes.push(typeRow);
    elevations.push(eRow);
  }

  const viewportDetails = viewport
    ? {
        xStart: Number.isFinite(viewport.xStart) ? Math.trunc(viewport.xStart) : effectiveXStart,
        yStart: Number.isFinite(viewport.yStart) ? Math.trunc(viewport.yStart) : effectiveYStart,
        width: Math.max(1, Math.trunc(viewport.width ?? mapWidth)),
        height: Math.max(1, Math.trunc(viewport.height ?? mapHeight))
      }
    : {
        xStart: effectiveXStart,
        yStart: effectiveYStart,
        width: mapWidth,
        height: mapHeight
      };

  return {
    scale: 100,
    seed,
    xStart: effectiveXStart,
    yStart: effectiveYStart,
    width: mapWidth,
    height: mapHeight,
    tiles,
    types: terrainTypes,
    elevations,
    season,
    waterLevel,
    viewport: viewportDetails
  };
}
