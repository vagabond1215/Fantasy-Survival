// @ts-nocheck
import store from './state.js';
import { resolveWorldParameters } from './difficulty.js';
import {
  DEFAULT_LANDMASS_TYPE,
  LANDMASS_PRESETS,
  resolveLandmassPreset
} from './map/landmassPresets/index.js';
import { TERRAIN_SYMBOLS } from './map/terrainSymbols.js';
import { generateWorldMap } from './world/mapAdapter.js';

export const GRID_DISTANCE_METERS = 100;

export const DEFAULT_MAP_SIZE = 64;
export const DEFAULT_MAP_WIDTH = DEFAULT_MAP_SIZE;
export const DEFAULT_MAP_HEIGHT = DEFAULT_MAP_SIZE;

export { TERRAIN_SYMBOLS } from './map/terrainSymbols.js';
export { generateWorldMap, adaptWorldToMapData, computeDefaultSpawn } from './world/mapAdapter.js';

function isTruthyDebugValue(value) {
  if (value == null) return false;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return false;
    return !['0', 'false', 'no', 'off'].includes(normalized);
  }
  if (typeof value === 'function') {
    try {
      return isTruthyDebugValue(value());
    } catch (error) {
      console.warn('Failed to evaluate debug flag function', error);
      return false;
    }
  }
  return Boolean(value);
}

function isMapProfilingEnabled() {
  if (typeof globalThis !== 'undefined') {
    const globalFlag =
      globalThis.__FS_DEBUG_MAP_PROFILING__ ??
      globalThis.__FS_MAP_PROFILING__ ??
      globalThis.__FS_DEBUG?.mapProfiling;
    if (globalFlag !== undefined) {
      if (isTruthyDebugValue(globalFlag)) {
        return true;
      }
      return false;
    }
  }

  if (typeof process !== 'undefined' && process?.env) {
    const envFlag =
      process.env.FS_DEBUG_MAP_PROFILING ??
      process.env.FS_MAP_PROFILING ??
      process.env.VITE_FS_DEBUG_MAP_PROFILING;
    if (envFlag !== undefined) {
      return isTruthyDebugValue(envFlag);
    }
  }

  return false;
}

function createMapGenerationProfiler() {
  if (!isMapProfilingEnabled()) {
    return null;
  }

  const timings = Object.create(null);
  return {
    timings,
    total: 0,
    record(label, durationMs) {
      if (!Number.isFinite(durationMs)) return;
      timings[label] = (timings[label] ?? 0) + durationMs;
      this.total += durationMs;
    }
  };
}

function profilerNow() {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}

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
  plains: '#facc15'
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
  plains: '--legend-plains'
});

let terrainColorCache = null;

function readCssVariable(styles, variableName) {
  if (!styles || typeof styles.getPropertyValue !== 'function') {
    return '';
  }
  try {
    return styles.getPropertyValue(variableName) || '';
  } catch (error) {
    return '';
  }
}

function resolveTerrainColorPalette() {
  let styles = null;
  if (typeof document !== 'undefined' && document.documentElement) {
    try {
      styles = getComputedStyle(document.documentElement);
    } catch (error) {
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
          writable: false
        };
      }
      return undefined;
    }
  }
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
  'mangrove'
]);

const MARINE_HYDRO_TYPES = new Set([
  'ocean',
  'open_ocean',
  'polar_sea',
  'abyssal_deep',
  'seamount',
  'estuary',
  'delta',
  'mangrove_forest',
  'kelp_forest',
  'coral_reef'
]);

const STANDING_WATER_BODIES = new Set(['lake', 'pond', 'marsh', 'swamp', 'bog', 'fen']);

const FLOWING_WATER_BODIES = new Set(['river', 'stream']);

export function isWaterTerrain(type) {
  return type ? WATER_TERRAIN_TYPES.has(type) : false;
}

function createFallbackMap({
  width,
  height,
  xStart,
  yStart,
  seed,
  season,
  world,
  openTerrainType,
  message,
  diagnostics,
  waterLevel = 0.35
}) {
  const mapWidth = Math.max(1, Math.trunc(width));
  const mapHeight = Math.max(1, Math.trunc(height));
  const safeOpenTerrain =
    typeof openTerrainType === 'string' && openTerrainType.trim() ? openTerrainType : 'open';

  const tiles = Array.from({ length: mapHeight }, () => new Array(mapWidth));
  const terrainTypes = Array.from({ length: mapHeight }, () => new Array(mapWidth));
  const substrateTypes = Array.from({ length: mapHeight }, () => new Array(mapWidth));
  const hydrologyTypes = Array.from({ length: mapHeight }, () => new Array(mapWidth));
  const elevations = Array.from({ length: mapHeight }, () => new Array(mapWidth));
  const waterTable = Array.from({ length: mapHeight }, () => new Array(mapWidth));

  const centerX = (mapWidth - 1) / 2;
  const centerY = (mapHeight - 1) / 2;
  const maxRadius = Math.max(centerX, centerY, 1);

  for (let y = 0; y < mapHeight; y++) {
    for (let x = 0; x < mapWidth; x++) {
      const dx = x - centerX;
      const dy = y - centerY;
      const distanceRatio = Math.hypot(dx, dy) / maxRadius;

      let terrain = safeOpenTerrain;
      let hydroType = 'land';
      let elevation = waterLevel + 0.25 - distanceRatio * 0.15;

      if (distanceRatio >= 0.95) {
        terrain = 'ocean';
        hydroType = 'ocean';
        elevation = waterLevel - 0.05;
      } else if (distanceRatio >= 0.8) {
        terrain = 'coast';
        hydroType = 'coast';
        elevation = waterLevel + 0.02;
      } else if (distanceRatio >= 0.6 && safeOpenTerrain === 'open') {
        terrain = 'grassland';
      }

      terrainTypes[y][x] = terrain;
      substrateTypes[y][x] = terrain;
      hydrologyTypes[y][x] = hydroType;
      elevations[y][x] = clamp(elevation, 0, 1);
      waterTable[y][x] = hydroType === 'land' ? Math.max(waterLevel + 0.05, elevations[y][x]) : waterLevel;

      const symbol = TERRAIN_SYMBOLS[terrain] || terrain || TERRAIN_SYMBOLS.open;
      tiles[y][x] = symbol;
    }
  }

  const fallbackMessage = message && typeof message === 'string' ? message : null;
  const solverMessages = fallbackMessage ? [fallbackMessage] : [];

  const diagnosticDetail = {
    fallback: true,
    ...(diagnostics || {})
  };

  return {
    scale: 100,
    seed,
    xStart,
    yStart,
    width: mapWidth,
    height: mapHeight,
    tiles,
    types: terrainTypes,
    substrateTypes,
    elevations,
    season,
    waterLevel,
    hydrology: {
      seaLevel: waterLevel,
      types: hydrologyTypes,
      waterTable,
      filledElevation: waterTable
    },
    solver: {
      metrics: null,
      history: [],
      iterations: 0,
      messages: solverMessages
    },
    worldSettings: world,
    viewport: {
      xStart,
      yStart,
      width: mapWidth,
      height: mapHeight
    },
    openTerrainType: safeOpenTerrain,
    diagnostics: diagnosticDetail
  };
}

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
  return features.some(f =>
    /(water|river|lake|shore|beach|lagoon|reef|marsh|bog|swamp|delta|stream|tide|coast|mangrove)/i.test(f)
  );
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

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function sliderValue(world, key, fallback = 50) {
  if (!world || typeof world !== 'object') {
    return clamp(fallback, 0, 100);
  }
  const raw = Number(world[key]);
  if (!Number.isFinite(raw)) {
    return clamp(fallback, 0, 100);
  }
  return clamp(raw, 0, 100);
}

function sliderBias(world, key, fallback = 50) {
  return (sliderValue(world, key, fallback) - 50) / 50;
}

export function deriveLandmassModifiers(world, { skipResolve = false } = {}) {
  const resolved = skipResolve ? world : resolveWorldParameters(world || {});
  const rawMapType = resolved?.mapType;
  let normalizedMapType = '';
  if (typeof rawMapType === 'string') {
    normalizedMapType = rawMapType.trim();
  } else if (rawMapType != null) {
    normalizedMapType = String(rawMapType).trim();
  }

  const isKnownMapType = Object.prototype.hasOwnProperty.call(
    LANDMASS_PRESETS,
    normalizedMapType
  );

  const landmassType = normalizedMapType && isKnownMapType ? normalizedMapType : DEFAULT_LANDMASS_TYPE;

  if (normalizedMapType && !isKnownMapType) {
    console.warn(
      `Unknown map type "${normalizedMapType}" supplied to deriveLandmassModifiers. Falling back to ${DEFAULT_LANDMASS_TYPE}.`
    );
  }

  const preset = resolveLandmassPreset(landmassType) || {};
  const islandsBias = sliderBias(resolved, 'mapIslands', 50);

  const maskStrengthBase = preset.maskStrength ?? 0.55;
  const maskBiasBase = preset.maskBias ?? 0;
  const worldScaleFactorBase = preset.worldScaleFactor ?? 1.2;
  const waterCoverageTargetBase = preset.waterCoverageTarget ?? 0.32;
  const minOceanFractionBase = preset.minOceanFraction ?? 0.02;
  const openLandBiasBase = preset.openLandBias ?? 0;

  const maskStrength = clamp(maskStrengthBase + islandsBias * 0.22, 0.28, 0.92);
  const maskBias = clamp(maskBiasBase + islandsBias * -0.12, -0.3, 0.3);
  const worldScaleFactor = clamp(worldScaleFactorBase + islandsBias * -0.12, 0.6, 1.8);
  const waterCoverageTarget = clamp(waterCoverageTargetBase + islandsBias * 0.18, 0.08, 0.85);
  const minOceanFraction = clamp(minOceanFractionBase + islandsBias * 0.12, 0, 0.4);
  const openLandBias = clamp(openLandBiasBase + islandsBias * -0.14, -0.5, 0.5);

  return {
    landmassType,
    maskStrength,
    maskBias,
    worldScaleFactor,
    waterCoverageTarget,
    minOceanFraction,
    openLandBias
  };
}

export function deriveElevationOptions(biome, world, { skipResolve = false } = {}) {
  const resolved = skipResolve ? world : resolveWorldParameters(world || {});
  const adv = resolved?.advanced || {};

  const rainfallBias = sliderBias(resolved, 'rainfall', 50);
  const waterBias = sliderBias(resolved, 'waterTable', 50);
  const mountainsBias = sliderBias(resolved, 'mountains', 50);
  const elevationBias = sliderBias(resolved, 'mapElevationMax', 50);
  const varianceBias = sliderBias(resolved, 'mapElevationVariance', 50);

  const baseElevation = biome?.elevation?.base ?? 0.5;
  const baseVariance = biome?.elevation?.variance ?? 0.5;
  const baseScale = biome?.elevation?.scale ?? 50;

  const elevationBaseBias = (((adv.elevationBase ?? 50) - 50) / 100) * 0.3;
  const elevationVarianceBias = (((adv.elevationVariance ?? 50) - 50) / 100) * 0.5;
  const elevationScaleBias = (((adv.elevationScale ?? 50) - 50) / 100) * 70;

  const base = clamp(
    baseElevation +
      waterBias * -0.12 +
      rainfallBias * -0.08 +
      mountainsBias * 0.05 +
      elevationBaseBias +
      elevationBias * 0.35,
    0.05,
    0.95
  );

  const variance = clamp(
    baseVariance +
      mountainsBias * 0.45 +
      elevationVarianceBias +
      varianceBias * 0.6,
    0.05,
    1.5
  );

  const scale = clamp(
    baseScale +
      mountainsBias * 40 +
      elevationScaleBias +
      varianceBias * -20 +
      elevationBias * -10,
    12,
    200
  );

  return { base, variance, scale };
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function scanRadius(
  terrainTypes,
  startX,
  startY,
  centerX = 0,
  centerY = 0,
  radius = 100
) {
  if (!Array.isArray(terrainTypes) || terrainTypes.length === 0) {
    return {
      total: 0,
      land: 0,
      water: 0,
      ore: 0,
      usable: 0
    };
  }

  const radiusSq = radius * radius;
  const stats = { total: 0, land: 0, water: 0, ore: 0, usable: 0 };

  for (let row = 0; row < terrainTypes.length; row++) {
    const rowData = terrainTypes[row];
    if (!rowData) continue;
    const worldY = startY + row;
    const dy = worldY - centerY;
    if (dy * dy > radiusSq) continue;
    for (let col = 0; col < rowData.length; col++) {
      const type = rowData[col];
      if (!type) continue;
      const worldX = startX + col;
      const dx = worldX - centerX;
      if (dx * dx + dy * dy > radiusSq) continue;
      stats.total++;
      if (isWaterTerrain(type)) {
        stats.water++;
        continue;
      }
      stats.land++;
      if (type === 'ore') {
        stats.ore++;
      } else {
        stats.usable++;
      }
    }
  }

  return stats;
}

export function validateStartingArea(
  terrainTypes,
  startX,
  startY,
  centerX = 0,
  centerY = 0,
  radius = 100,
  thresholds = { minLand: 0.5, maxOre: 0.4 }
) {
  const stats = scanRadius(terrainTypes, startX, startY, centerX, centerY, radius);
  const total = Math.max(1, stats.total);
  const usableLand = Math.max(1, stats.usable);
  const landRatio = clamp(stats.land / total, 0, 1);
  const oreRatio = clamp(stats.ore / usableLand, 0, 1);
  const minLand = Number.isFinite(thresholds?.minLand) ? thresholds.minLand : 0.5;
  const maxOre = Number.isFinite(thresholds?.maxOre) ? thresholds.maxOre : 0.4;
  return {
    stats,
    landRatio,
    oreRatio,
    meetsLand: landRatio >= minLand,
    meetsOre: oreRatio <= maxOre
  };
}

function collectTilesWithinRadius(
  terrainTypes,
  startX,
  startY,
  radius,
  centerX,
  centerY,
  matchType
) {
  if (!Array.isArray(terrainTypes) || terrainTypes.length === 0) return [];
  const radiusSq = radius * radius;
  const tiles = [];

  for (let row = 0; row < terrainTypes.length; row++) {
    const rowData = terrainTypes[row];
    if (!rowData) continue;
    const worldY = startY + row;
    const dy = worldY - centerY;
    if (dy * dy > radiusSq) continue;
    for (let col = 0; col < rowData.length; col++) {
      const type = rowData[col];
      if (!type) continue;
      const matches =
        typeof matchType === 'function'
          ? matchType(type)
          : matchType === 'water'
            ? isWaterTerrain(type)
            : type === matchType;
      if (!matches) continue;
      const worldX = startX + col;
      const dx = worldX - centerX;
      if (dx * dx + dy * dy > radiusSq) continue;
      tiles.push({ row, col, worldX, worldY, distance: Math.hypot(dx, dy) });
    }
  }

  return tiles;
}

function formatDistance(dx, dy) {
  const dist = Math.round(Math.hypot(dx, dy));
  return dist;
}

const DEFAULT_CHUNK_SIZE = 16;

function createChunkRenderer({ width, height, tiles, terrainTypes, chunkSize = DEFAULT_CHUNK_SIZE }) {
  const size = Math.max(1, Math.trunc(chunkSize));
  const columns = Math.ceil(Math.max(1, Math.trunc(width)) / size);
  const rows = Math.ceil(Math.max(1, Math.trunc(height)) / size);

  function renderChunk(rowIndex, columnIndex) {
    const rowStart = rowIndex * size;
    const columnStart = columnIndex * size;
    for (let localY = 0; localY < size; localY++) {
      const y = rowStart + localY;
      if (y >= height) break;
      const typeRow = terrainTypes[y];
      const tileRow = tiles[y];
      if (!typeRow || !tileRow) continue;
      for (let localX = 0; localX < size; localX++) {
        const x = columnStart + localX;
        if (x >= width) break;
        const type = typeRow[x];
        const symbol =
          typeof type === 'string' && type
            ? TERRAIN_SYMBOLS[type] || type
            : TERRAIN_SYMBOLS.open;
        tileRow[x] = symbol || TERRAIN_SYMBOLS.open;
      }
    }
  }

  function renderAll() {
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        renderChunk(row, column);
      }
    }
  }

  function renderDirty({ full = false, chunks = [] } = {}) {
    if (full) {
      renderAll();
      return;
    }
    if (!Array.isArray(chunks) || chunks.length === 0) {
      return;
    }
    chunks.forEach(entry => {
      if (!entry) return;
      const row = Math.trunc(entry.row);
      const column = Math.trunc(entry.column);
      if (Number.isNaN(row) || Number.isNaN(column)) {
        return;
      }
      if (row < 0 || column < 0 || row >= rows || column >= columns) {
        return;
      }
      renderChunk(row, column);
    });
  }

  return {
    chunkSize: size,
    chunkRows: rows,
    chunkColumns: columns,
    renderAll,
    renderDirty,
    renderChunk
  };
}

export function findValidSpawn(
  terrainTypes,
  startX,
  startY,
  radius = 100,
  thresholds = { minLand: 0.5, maxOre: 0.4 },
  options = {}
) {
  if (!Array.isArray(terrainTypes) || terrainTypes.length === 0) return null;
  const centerX = options?.centerX ?? 0;
  const centerY = options?.centerY ?? 0;
  const limit = clamp(Math.trunc(options?.limit ?? 200), 1, 2000);
  const candidates = [];

  for (let row = 0; row < terrainTypes.length; row++) {
    const rowData = terrainTypes[row];
    if (!rowData) continue;
    for (let col = 0; col < rowData.length; col++) {
      const type = rowData[col];
      if (!type || isWaterTerrain(type)) continue;
      const worldX = startX + col;
      const worldY = startY + row;
      const distance = Math.hypot(worldX - centerX, worldY - centerY);
      candidates.push({ row, col, worldX, worldY, distance });
    }
  }

  candidates.sort((a, b) => {
    if (a.distance !== b.distance) return a.distance - b.distance;
    if (a.worldY !== b.worldY) return a.worldY - b.worldY;
    return a.worldX - b.worldX;
  });

  let best = null;
  const capped = Math.min(limit, candidates.length);
  for (let i = 0; i < capped; i++) {
    const candidate = candidates[i];
    const validation = validateStartingArea(
      terrainTypes,
      startX,
      startY,
      candidate.worldX,
      candidate.worldY,
      radius,
      thresholds
    );
    const score = validation.landRatio - validation.oreRatio * 0.2;
    const entry = { ...candidate, validation, score };
    if (validation.meetsLand && validation.meetsOre) {
      return entry;
    }
    if (!best || entry.score > best.score) {
      best = entry;
    }
  }

  return best;
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

function vegetationNoise(seed, x, y, scale) {
  return noise2D(seed, x, y, scale, 'veg');
}

function oreNoise(seed, x, y, scale) {
  return noise2D(seed, x, y, scale, 'ore');
}


// Legacy adapter retained for modules that still import the historical
// `generateColorMap` API. Internally this now delegates to the world
// generation pipeline and reshapes the result to the classic map
// structure so existing consumers continue to function.
export function generateColorMap(
  biomeId,
  seed = Date.now(),
  xStart = null,
  yStart = null,
  width = DEFAULT_MAP_WIDTH,
  height = width,
  season = store.time.season,
  waterLevelOverride,
  viewport = null,
  worldSettings = null,
  skipSanityChecks = false
) {
  const mapWidth = Math.max(1, Math.trunc(width));
  const mapHeight = Math.max(1, Math.trunc(height ?? width ?? DEFAULT_MAP_WIDTH));
  const { xStart: defaultX, yStart: defaultY } = computeCenteredStart(mapWidth, mapHeight);
  const normalizedXStart = Number.isFinite(xStart) ? Math.trunc(xStart) : defaultX;
  const normalizedYStart = Number.isFinite(yStart) ? Math.trunc(yStart) : defaultY;

  const resolvedSeason = season ?? store.time.season ?? null;
  const normalizedViewport = viewport && typeof viewport === 'object' ? { ...viewport } : null;
  const normalizedWorldSettings = worldSettings && typeof worldSettings === 'object' ? { ...worldSettings } : null;

  const { world, map, seedInfo } = generateWorldMap({
    width: mapWidth,
    height: mapHeight,
    seed,
    season: resolvedSeason,
    xStart: normalizedXStart,
    yStart: normalizedYStart,
    viewport: normalizedViewport,
    worldSettings: normalizedWorldSettings,
    startingBiomeId: biomeId ?? null,
  });

  if (!map.worldSettings) {
    map.worldSettings = normalizedWorldSettings || {};
  }
  if (map.worldSettings) {
    if (seedInfo) {
      map.worldSettings.seedHash = seedInfo.hex;
      map.worldSettings.seedLanes = Array.from(seedInfo.lanes);
      if (!map.worldSettings.seed) {
        map.worldSettings.seed = seedInfo.raw ?? (typeof seed === 'string' ? seed : String(seed ?? ''));
      }
    }
    if (biomeId && !map.worldSettings.startingBiomeId) {
      map.worldSettings.startingBiomeId = biomeId;
    }
  }

  map.seedHash = seedInfo?.hex ?? null;
  map.seedLanes = seedInfo ? Array.from(seedInfo.lanes) : [];
  map.biomeId = biomeId ?? null;
  map.waterLevel = Number.isFinite(waterLevelOverride)
    ? Math.max(0, Math.min(1, Number(waterLevelOverride)))
    : null;
  map.skipSanityChecks = Boolean(skipSanityChecks);
  map.generator = 'world';
  map.world = world;
  map.openTerrainType = map.openTerrainType ?? 'open';
  map.substrateTypes = map.substrateTypes ?? null;
  map.hydrology = map.hydrology ?? null;

  return map;
}

