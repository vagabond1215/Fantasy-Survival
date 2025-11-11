// @ts-nocheck

/** @typedef {import('./world/generate.ts').WorldArtifact} WorldArtifact */

export const GRID_DISTANCE_METERS = 100;

export const DEFAULT_MAP_SIZE = 64;
export const DEFAULT_MAP_WIDTH = DEFAULT_MAP_SIZE;
export const DEFAULT_MAP_HEIGHT = DEFAULT_MAP_SIZE;

export { TERRAIN_SYMBOLS } from './map/terrainSymbols.js';
export { generateWorldMap, adaptWorldToMapData, computeDefaultSpawn } from './world/mapAdapter.js';

export const DEFAULT_TERRAIN_COLORS = Object.freeze({
  water: '#2d7ff9',
  ocean: '#2563eb',
  lake: '#38bdf8',
  river: '#0ea5e9',
  stream: '#38bdf8',
  pond: '#67e8f9',
  marsh: '#4ade80',
  swamp: '#166534',
  bog: '#0f5132',
  fen: '#22c55e',
  mangrove: '#065f46',
  estuary: '#2563eb',
  delta: '#3b82f6',
  mangrove_forest: '#047857',
  kelp_forest: '#0f766e',
  coral_reef: '#f97316',
  polar_sea: '#bae6fd',
  open_ocean: '#1d4ed8',
  abyssal_deep: '#0f172a',
  seamount: '#334155',
  open: '#facc15',
  grassland: '#a3e635',
  forest: '#16a34a',
  ore: '#f97316',
  stone: '#94a3b8',
  desert: '#f4b76b',
  tundra: '#9ac5ff',
  taiga: '#2f6b2a',
  savanna: '#f59e0b',
  rainforest: '#047857',
  jungle: '#0f766e',
  wetland: '#22c55e',
  sand: '#fcd34d',
  coast: '#0ea5e9',
  island: '#38bdf8',
  mountain: '#64748b',
  alpine: '#60a5fa',
  volcanic: '#ea580c',
  temperate: '#4ade80',
  tropical: '#10b981',
  plains: '#facc15',
});

const TERRAIN_COLOR_VARIABLES = Object.freeze({
  water: '--legend-water',
  ocean: '--legend-ocean',
  lake: '--legend-lake',
  river: '--legend-river',
  stream: '--legend-stream',
  pond: '--legend-pond',
  marsh: '--legend-marsh',
  swamp: '--legend-swamp',
  bog: '--legend-bog',
  fen: '--legend-fen',
  mangrove: '--legend-mangrove',
  estuary: '--legend-estuary',
  delta: '--legend-delta',
  mangrove_forest: '--legend-mangrove-forest',
  kelp_forest: '--legend-kelp-forest',
  coral_reef: '--legend-coral-reef',
  polar_sea: '--legend-polar-sea',
  open_ocean: '--legend-open-ocean',
  abyssal_deep: '--legend-abyssal-deep',
  seamount: '--legend-seamount',
  open: '--legend-open',
  grassland: '--legend-grassland',
  forest: '--legend-forest',
  ore: '--legend-ore',
  stone: '--legend-stone',
  desert: '--legend-desert',
  tundra: '--legend-tundra',
  taiga: '--legend-taiga',
  savanna: '--legend-savanna',
  rainforest: '--legend-rainforest',
  jungle: '--legend-jungle',
  wetland: '--legend-wetland',
  sand: '--legend-sand',
  coast: '--legend-coast',
  island: '--legend-island',
  mountain: '--legend-mountain',
  alpine: '--legend-alpine',
  volcanic: '--legend-volcanic',
  temperate: '--legend-temperate',
  tropical: '--legend-tropical',
  plains: '--legend-plains',
});

let terrainColorCache = null;

function readCssVariable(styles, variableName) {
  if (!styles || typeof styles.getPropertyValue !== 'function') {
    return '';
  }
  try {
    return styles.getPropertyValue(variableName) || '';
  } catch (_error) {
    return '';
  }
}

function resolveTerrainColorPalette() {
  let styles = null;
  if (typeof document !== 'undefined' && document.documentElement) {
    try {
      styles = getComputedStyle(document.documentElement);
    } catch (_error) {
      styles = null;
    }
  }

  const palette = {};
  for (const [type, variable] of Object.entries(TERRAIN_COLOR_VARIABLES)) {
    const fallback = DEFAULT_TERRAIN_COLORS[type];
    const value = readCssVariable(styles, variable).trim();
    palette[type] = value || fallback;
  }
  return palette;
}

export function getTerrainColors({ forceRefresh = false } = {}) {
  if (forceRefresh) {
    terrainColorCache = null;
  }
  if (terrainColorCache) {
    return { ...terrainColorCache };
  }
  const palette = resolveTerrainColorPalette();
  terrainColorCache = palette;
  return { ...palette };
}

export const TERRAIN_COLORS = new Proxy(
  {},
  {
    get(_target, property) {
      if (typeof property === 'string') {
        const palette = getTerrainColors();
        if (Object.prototype.hasOwnProperty.call(palette, property)) {
          return palette[property];
        }
        if (Object.prototype.hasOwnProperty.call(DEFAULT_TERRAIN_COLORS, property)) {
          return DEFAULT_TERRAIN_COLORS[property];
        }
      }
      return undefined;
    },
    has(_target, property) {
      return Object.prototype.hasOwnProperty.call(DEFAULT_TERRAIN_COLORS, property);
    },
    ownKeys() {
      return Reflect.ownKeys(DEFAULT_TERRAIN_COLORS);
    },
    getOwnPropertyDescriptor(_target, property) {
      if (Object.prototype.hasOwnProperty.call(DEFAULT_TERRAIN_COLORS, property)) {
        return {
          configurable: true,
          enumerable: true,
          value: getTerrainColors()[property],
          writable: false,
        };
      }
      return undefined;
    },
  },
);

const WATER_TERRAIN_TYPES = new Set([
  'water',
  'ocean',
  'open_ocean',
  'polar_sea',
  'abyssal_deep',
  'seamount',
  'estuary',
  'delta',
  'mangrove_forest',
  'kelp_forest',
  'coral_reef',
  'lake',
  'pond',
  'river',
  'stream',
  'marsh',
  'swamp',
  'bog',
  'fen',
  'mangrove',
]);

export function isWaterTerrain(type) {
  return type ? WATER_TERRAIN_TYPES.has(type) : false;
}

export function computeCenteredStart(
  width = DEFAULT_MAP_WIDTH,
  height = DEFAULT_MAP_HEIGHT,
  focusX = 0,
  focusY = 0,
) {
  const normalizedWidth = Math.max(1, Math.trunc(width));
  const normalizedHeight = Math.max(1, Math.trunc(height));
  const halfCols = Math.floor(normalizedWidth / 2);
  const halfRows = Math.floor(normalizedHeight / 2);
  return {
    xStart: Math.round(focusX) - halfCols,
    yStart: Math.round(focusY) - halfRows,
  };
}

function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let index = 0; index < str.length; index += 1) {
    h = Math.imul(h ^ str.charCodeAt(index), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function next() {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

function mulberry32(a) {
  return function rng() {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function coordRand(seed, x, y, salt = '') {
  const rng = mulberry32(xmur3(`${seed}:${x}:${y}:${salt}`)());
  return rng();
}

export function coordinateRandom(seed, x, y, salt = '') {
  return coordRand(seed, x, y, salt);
}

function clampChannel(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(255, Math.max(0, Math.round(value)));
}

function packRgba(r, g, b, a = 255) {
  return (
    (clampChannel(a) << 24) |
    (clampChannel(b) << 16) |
    (clampChannel(g) << 8) |
    clampChannel(r)
  ) >>> 0;
}

const DEFAULT_PACKED_COLOR = packRgba(100, 116, 139, 255);

function parseHexColor(value) {
  if (!value || typeof value !== 'string') {
    return null;
  }
  const match = value.trim().match(/^#?([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
  if (!match) {
    return null;
  }
  let hex = match[1];
  if (hex.length === 3 || hex.length === 4) {
    hex = hex
      .split('')
      .map(ch => ch + ch)
      .join('');
  }
  if (hex.length === 6) {
    hex += 'ff';
  }
  const intValue = Number.parseInt(hex, 16);
  if (Number.isNaN(intValue)) {
    return null;
  }
  return {
    r: (intValue >> 24) & 255,
    g: (intValue >> 16) & 255,
    b: (intValue >> 8) & 255,
    a: intValue & 255,
  };
}

function parseRgbColor(value) {
  if (!value || typeof value !== 'string') {
    return null;
  }
  const match = value.trim().match(/^rgba?\(([^)]+)\)$/i);
  if (!match) {
    return null;
  }
  const parts = match[1]
    .split(/[,\s]+/)
    .filter(Boolean)
    .map(component => Number.parseFloat(component));
  if (parts.length < 3 || parts.some(component => Number.isNaN(component))) {
    return null;
  }
  const alpha = parts.length >= 4 ? Math.round(parts[3] * 255) : 255;
  return {
    r: clampChannel(parts[0]),
    g: clampChannel(parts[1]),
    b: clampChannel(parts[2]),
    a: clampChannel(alpha),
  };
}

function toPackedColor(value) {
  if (value == null) {
    return DEFAULT_PACKED_COLOR;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value > 0xffffff) {
      return value >>> 0;
    }
    const r = (value >> 16) & 255;
    const g = (value >> 8) & 255;
    const b = value & 255;
    return packRgba(r, g, b, 255);
  }
  if (Array.isArray(value)) {
    const [r = 0, g = 0, b = 0, a = 255] = value;
    return packRgba(r, g, b, a);
  }
  if (typeof value === 'string') {
    const hex = parseHexColor(value);
    if (hex) {
      return packRgba(hex.r, hex.g, hex.b, hex.a);
    }
    const rgb = parseRgbColor(value);
    if (rgb) {
      return packRgba(rgb.r, rgb.g, rgb.b, rgb.a);
    }
  }
  return DEFAULT_PACKED_COLOR;
}

function readPaletteEntry(palette, code) {
  if (palette == null) {
    return undefined;
  }
  if (typeof palette === 'function') {
    try {
      return palette(code);
    } catch (_error) {
      return undefined;
    }
  }
  if (palette instanceof Map) {
    if (palette.has(code)) return palette.get(code);
    const key = String(code);
    if (palette.has(key)) return palette.get(key);
    return undefined;
  }
  if (Array.isArray(palette) || ArrayBuffer.isView(palette)) {
    return palette[code];
  }
  if (typeof palette === 'object') {
    if (Object.prototype.hasOwnProperty.call(palette, code)) {
      return palette[code];
    }
    const key = String(code);
    if (Object.prototype.hasOwnProperty.call(palette, key)) {
      return palette[key];
    }
    if (Object.prototype.hasOwnProperty.call(palette, 'default')) {
      return palette.default;
    }
  }
  return undefined;
}

/**
 * @param {WorldArtifact | null | undefined} world
 * @param {unknown} palette
 * @param {ImageData | null | undefined} imageData
 * @returns {ImageData | null}
 */
export function generateColorMap(world, palette, imageData = null) {
  if (!world || !world.layers?.biome || !world.dimensions) {
    return null;
  }

  const width = Math.max(0, Math.trunc(world.dimensions.width || 0));
  const height = Math.max(0, Math.trunc(world.dimensions.height || 0));
  if (!width || !height) {
    return null;
  }

  const size = width * height;
  let target = imageData instanceof ImageData ? imageData : null;
  if (!target || target.width !== width || target.height !== height) {
    if (typeof ImageData !== 'function') {
      throw new Error('ImageData constructor is not available in this environment.');
    }
    target = new ImageData(width, height);
  }

  const pixelView = new Uint32Array(target.data.buffer, target.data.byteOffset, size);
  const biomeLayer = world.layers.biome;
  const cache = new Map();

  for (let index = 0; index < size; index += 1) {
    const code = biomeLayer[index] ?? 0;
    let packed = cache.get(code);
    if (packed === undefined) {
      const entry = readPaletteEntry(palette, code);
      packed = toPackedColor(entry);
      cache.set(code, packed);
    }
    pixelView[index] = packed;
  }

  return target;
}
