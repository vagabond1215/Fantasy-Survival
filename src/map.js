// @ts-nocheck
import { getBiome } from './biomes.js';
import store from './state.js';
import { resolveWorldParameters } from './difficulty.js';
import { notifySanityCheck } from './notifications.js';
import { AdjustmentSolver } from './map/generation/adjustmentSolver.js';
import { createElevationSampler } from './map/generation/elevation.js';
import { generateHydrology } from './map/generation/hydrology.js';
import { applyMangroveZones } from './map/generation/vegetation.js';
import { resolveBiomeOpenTerrain } from './terrainTypes.js';

export const GRID_DISTANCE_METERS = 100;

export const DEFAULT_MAP_SIZE = 64;
export const DEFAULT_MAP_WIDTH = DEFAULT_MAP_SIZE;
export const DEFAULT_MAP_HEIGHT = DEFAULT_MAP_SIZE;

export const TERRAIN_SYMBOLS = {
  water: 'water',
  ocean: 'ocean',
  lake: 'lake',
  river: 'river',
  marsh: 'marsh',
  mangrove: 'mangrove',
  open: 'open',
  grassland: 'grassland',
  plains: 'plains',
  savanna: 'savanna',
  tundra: 'tundra',
  taiga: 'taiga',
  desert: 'desert',
  sand: 'sand',
  wetland: 'wetland',
  coast: 'coast',
  temperate: 'temperate',
  tropical: 'tropical',
  rainforest: 'rainforest',
  jungle: 'jungle',
  alpine: 'alpine',
  swamp: 'swamp',
  island: 'island',
  mountain: 'mountain',
  volcanic: 'volcanic',
  forest: 'forest',
  ore: 'ore',
  stone: 'stone'
};

export const DEFAULT_TERRAIN_COLORS = Object.freeze({
  water: '#2d7ff9',
  ocean: '#2563eb',
  lake: '#38bdf8',
  river: '#0ea5e9',
  marsh: '#4ade80',
  mangrove: '#065f46',
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
  swamp: '#14532d',
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
  marsh: '--legend-marsh',
  mangrove: '--legend-mangrove',
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
  swamp: '--legend-swamp',
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

const WATER_TERRAIN_TYPES = new Set(['water', 'ocean', 'lake', 'river', 'marsh', 'mangrove']);

export function isWaterTerrain(type) {
  return type ? WATER_TERRAIN_TYPES.has(type) : false;
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

const LANDMASS_PRESETS = {
  continent: {
    maskStrength: 0.55,
    maskBias: 0,
    worldScaleFactor: 1.2,
    waterCoverageTarget: 0.32,
    minOceanFraction: 0.02,
    openLandBias: 0
  },
  island: {
    maskStrength: 0.82,
    maskBias: -0.06,
    worldScaleFactor: 0.9,
    waterCoverageTarget: 0.5,
    minOceanFraction: 0.14,
    openLandBias: -0.1
  },
  archipelago: {
    maskStrength: 0.68,
    maskBias: -0.04,
    worldScaleFactor: 0.95,
    waterCoverageTarget: 0.42,
    minOceanFraction: 0.1,
    openLandBias: -0.06
  },
  coastal: {
    maskStrength: 0.5,
    maskBias: -0.01,
    worldScaleFactor: 1.15,
    waterCoverageTarget: 0.35,
    minOceanFraction: 0.05,
    openLandBias: -0.02
  },
  pangea: {
    maskStrength: 0.38,
    maskBias: 0.08,
    worldScaleFactor: 1.45,
    waterCoverageTarget: 0.24,
    minOceanFraction: 0.02,
    openLandBias: 0.08
  },
  inland: {
    maskStrength: 0.34,
    maskBias: 0.1,
    worldScaleFactor: 1.35,
    waterCoverageTarget: 0.26,
    minOceanFraction: 0.02,
    openLandBias: 0.06
  }
};

const DEFAULT_LANDMASS_TYPE = 'continent';

function resolveLandmassPreset(type) {
  if (!type) {
    return LANDMASS_PRESETS[DEFAULT_LANDMASS_TYPE];
  }
  return LANDMASS_PRESETS[type] || LANDMASS_PRESETS[DEFAULT_LANDMASS_TYPE];
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
  let effectiveXStart = Number.isFinite(xStart) ? Math.trunc(xStart) : defaultX;
  let effectiveYStart = Number.isFinite(yStart) ? Math.trunc(yStart) : defaultY;
  const baseXStart = effectiveXStart;
  const baseYStart = effectiveYStart;
  const biome = getBiome(biomeId);
  const openTerrainType = resolveBiomeOpenTerrain(biome);
  const world = resolveWorldParameters(worldSettings || {});
  const landmassType = typeof world.mapType === 'string' ? world.mapType : DEFAULT_LANDMASS_TYPE;
  const landmassPreset = resolveLandmassPreset(landmassType);
  const adv = world.advanced || {};
  const rainfallBias = (world.rainfall - 50) / 100;
  const temperatureBias = (world.temperature - 50) / 100;
  const mountainsBias = (world.mountains - 50) / 100;
  const waterBias = (world.waterTable - 50) / 100;
  const riversBias = (world.rivers100 - 50) / 100;
  const lakesBias = (world.lakes100 - 50) / 100;

  let openLand = biome?.openLand ?? 0.5;
  openLand += temperatureBias * 0.18;
  openLand -= rainfallBias * 0.22;
  openLand -= Math.max(0, mountainsBias) * 0.12;
  openLand += landmassPreset.openLandBias ?? 0;
  openLand = clamp(openLand, 0.1, 0.9);

  const vegScaleBase = clamp(20 + openLand * 80, 10, 140);
  const vegScale = clamp(
    vegScaleBase + (((adv.vegetationScale ?? 50) - 50) / 50) * 25,
    8,
    160
  );

  const baseElevation = biome?.elevation?.base ?? 0.5;
  const baseVariance = biome?.elevation?.variance ?? 0.5;
  const baseScale = biome?.elevation?.scale ?? 50;

  const elevationOptions = {
    base: clamp(
      baseElevation +
        waterBias * -0.12 +
        rainfallBias * -0.08 +
        mountainsBias * 0.05 +
        (((adv.elevationBase ?? 50) - 50) / 100) * 0.3,
      0.05,
      0.95
    ),
    variance: clamp(
      baseVariance +
        mountainsBias * 0.45 +
        (((adv.elevationVariance ?? 50) - 50) / 100) * 0.5,
      0.05,
      1.5
    ),
    scale: clamp(
      baseScale +
        mountainsBias * 40 +
        (((adv.elevationScale ?? 50) - 50) / 100) * 70,
      12,
      200
    )
  };

  const oreThresholdBase = clamp(0.95 - (world.oreDensity / 100) * 0.35, 0.55, 0.98);
  const oreThreshold = clamp(
    oreThresholdBase - (((adv.oreThresholdOffset ?? 50) - 50) / 100) * 0.2,
    0.5,
    0.98
  );
  const oreScale = clamp(10 + ((adv.oreNoiseScale ?? 50) / 100) * 24, 6, 40);

  const tiles = Array.from({ length: mapHeight }, () => Array(mapWidth).fill('?'));
  const terrainTypes = Array.from({ length: mapHeight }, () => new Array(mapWidth));
  const substrateTypes = Array.from({ length: mapHeight }, () => new Array(mapWidth));
  const elevations = [];

  const worldScale = Math.max(mapWidth, mapHeight) * (landmassPreset.worldScaleFactor ?? 1.2);
  const maskStrengthBase = landmassPreset.maskStrength ?? 0.55;
  const maskBiasBase = landmassPreset.maskBias ?? 0;
  const maskStrength = clamp(maskStrengthBase + mountainsBias * 0.15 - waterBias * 0.1, 0.2, 0.92);
  const maskBias = clamp(maskBiasBase + (waterBias + rainfallBias) * -0.08, -0.3, 0.3);
  const elevationSampler = createElevationSampler(seed, {
    base: elevationOptions.base,
    variance: elevationOptions.variance,
    scale: elevationOptions.scale,
    worldScale,
    maskStrength,
    maskBias
  });

  for (let y = 0; y < mapHeight; y++) {
    const eRow = [];
    for (let x = 0; x < mapWidth; x++) {
      const gx = baseXStart + x;
      const gy = baseYStart + y;
      const elevation = elevationSampler.sample(gx, gy);
      eRow.push(elevation);
    }
    elevations.push(eRow);
  }

  const waterCoverageTarget = clamp(landmassPreset.waterCoverageTarget ?? 0.32, 0.08, 0.85);
  const minOceanFraction = clamp(landmassPreset.minOceanFraction ?? 0.02, 0, 0.4);

  const hydrology = generateHydrology({
    seed,
    width: mapWidth,
    height: mapHeight,
    elevations,
    biome: biome
      ? { id: biome.id, features: biome.features, elevation: biome.elevation }
      : null,
    world: {
      ...world,
      waterCoverageTarget,
      minOceanFraction
    }
  });

  const mangroveReport = applyMangroveZones({
    hydrology,
    elevations,
    seed,
    random: (x, y, salt = '') =>
      coordinateRandom(seed, baseXStart + x, baseYStart + y, `mangrove:${salt}`)
  });

  if (mangroveReport) {
    hydrology.mangroveStats = mangroveReport;
  }

  const waterTable = hydrology.waterTable ?? hydrology.filledElevation;
  let seaLevelAdjustment = 0;

  const baseHydroTypes = hydrology.types.map(row => row.slice());

  function classifyTerrain(seaLevel) {
    const adjustedSeaLevel = clamp(seaLevel, 0, 1);
    hydrology.seaLevel = adjustedSeaLevel;
    if (hydrology.rules) {
      hydrology.rules.seaLevel = adjustedSeaLevel;
    }
    const oreField = Array.from({ length: mapHeight }, () => new Array(mapWidth).fill(0));
    const stoneThreshold = clamp(oreThreshold - 0.08, 0.3, 0.92);
    const oreCells = [];
    const newHydroTypes = Array.from({ length: mapHeight }, () => new Array(mapWidth));

    for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
        const elevation = elevations[y][x];
        const originalHydro = baseHydroTypes[y]?.[x] ?? 'land';
        let hydroType = originalHydro ?? 'land';
        if (hydroType === 'ocean' || hydroType === 'lake') {
          if (elevation >= adjustedSeaLevel) {
            hydroType = 'land';
          }
        } else if (hydroType === 'land' || hydroType === 'coast' || hydroType === 'marsh') {
          if (elevation < adjustedSeaLevel) {
            hydroType = 'ocean';
          }
        }
        newHydroTypes[y][x] = hydroType;
      }
    }

    const ORTHOGONAL_DIRECTIONS = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1]
    ];

    const hasLandOrRiverNeighbor = (types, x, y) => {
      let touchesLand = false;
      let touchesRiver = false;
      for (let i = 0; i < ORTHOGONAL_DIRECTIONS.length; i += 1) {
        const dx = ORTHOGONAL_DIRECTIONS[i][0];
        const dy = ORTHOGONAL_DIRECTIONS[i][1];
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= mapWidth || ny >= mapHeight) continue;
        const neighbor = types[ny]?.[nx];
        if (!WATER_TERRAIN_TYPES.has(neighbor)) {
          touchesLand = true;
        } else if (neighbor === 'river') {
          touchesRiver = true;
        }
        if (touchesLand && touchesRiver) {
          break;
        }
      }
      return { touchesLand, touchesRiver };
    };

    for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
        if (baseHydroTypes[y]?.[x] !== 'mangrove') continue;
        const elevation = elevations[y][x];
        if (elevation < adjustedSeaLevel) {
          newHydroTypes[y][x] = 'ocean';
          continue;
        }
        const { touchesLand, touchesRiver } = hasLandOrRiverNeighbor(newHydroTypes, x, y);
        if (!touchesLand && !touchesRiver) {
          newHydroTypes[y][x] = 'ocean';
        }
      }
    }

    for (let y = 0; y < mapHeight; y++) {
      const typeRow = terrainTypes[y];
      const substrateRow = substrateTypes[y];
      const oreRow = oreField[y];
      for (let x = 0; x < mapWidth; x++) {
        const gx = baseXStart + x;
        const gy = baseYStart + y;
        const hydroType = newHydroTypes[y]?.[x] ?? 'land';
        hydrology.types[y][x] = hydroType;
        let baseType;
        let oreVal = 0;
        if (hydroType && hydroType !== 'land') {
          baseType = hydroType;
        } else {
          const vegNoise = vegetationNoise(seed, gx, gy, vegScale);
          baseType = vegNoise < openLand ? openTerrainType : 'forest';
          oreVal = oreNoise(seed, gx, gy, oreScale);
        }
        substrateRow[x] = baseType;
        typeRow[x] = baseType;
        oreRow[x] = oreVal;
      }
    }

    for (let y = 0; y < mapHeight; y++) {
      const typeRow = terrainTypes[y];
      const substrateRow = substrateTypes[y];
      for (let x = 0; x < mapWidth; x++) {
        if (hydrology.types[y][x] !== 'land') continue;
        if (elevations[y][x] < adjustedSeaLevel) continue;
        if (oreField[y][x] <= stoneThreshold) continue;
        substrateRow[x] = 'stone';
        if (typeRow[x] !== 'ore') {
          typeRow[x] = 'stone';
        }
      }
    }

    for (let y = 0; y < mapHeight; y++) {
      const typeRow = terrainTypes[y];
      const substrateRow = substrateTypes[y];
      for (let x = 0; x < mapWidth; x++) {
        if (hydrology.types[y][x] !== 'land') continue;
        if (elevations[y][x] < adjustedSeaLevel) continue;
        if (oreField[y][x] <= oreThreshold) continue;
        substrateRow[x] = 'stone';
        typeRow[x] = 'ore';
        oreCells.push([x, y]);
      }
    }

    if (oreCells.length) {
      const neighborOffsets = [
        [-1, -1],
        [0, -1],
        [1, -1],
        [-1, 0],
        [1, 0],
        [-1, 1],
        [0, 1],
        [1, 1]
      ];
      for (const [ox, oy] of oreCells) {
        if (terrainTypes[oy]?.[ox] !== 'ore') continue;
        for (const [dx, dy] of neighborOffsets) {
          const nx = ox + dx;
          const ny = oy + dy;
          if (nx < 0 || ny < 0 || nx >= mapWidth || ny >= mapHeight) continue;
          const neighborRow = terrainTypes[ny];
          const neighborSubstrateRow = substrateTypes[ny];
          if (!neighborRow || !neighborSubstrateRow) continue;
          if (neighborRow[nx] === 'ore') continue;
          if (isWaterTerrain(neighborRow[nx])) continue;
          neighborSubstrateRow[nx] = 'stone';
          neighborRow[nx] = 'stone';
        }
      }

      for (const [ox, oy] of oreCells) {
        if (terrainTypes[oy]?.[ox] !== 'ore') continue;
        const hasStoneNeighbor = neighborOffsets.some(([dx, dy]) => {
          const nx = ox + dx;
          const ny = oy + dy;
          if (nx < 0 || ny < 0 || nx >= mapWidth || ny >= mapHeight) return false;
          return terrainTypes[ny]?.[nx] === 'stone';
        });
        if (hasStoneNeighbor) continue;
        let candidate = null;
        let candidateValue = Infinity;
        for (const [dx, dy] of neighborOffsets) {
          const nx = ox + dx;
          const ny = oy + dy;
          if (nx < 0 || ny < 0 || nx >= mapWidth || ny >= mapHeight) continue;
          const neighborRow = terrainTypes[ny];
          const neighborSubstrateRow = substrateTypes[ny];
          if (!neighborRow || !neighborSubstrateRow) continue;
          const neighborType = neighborRow[nx];
          if (isWaterTerrain(neighborType)) continue;
          if (neighborType !== 'ore') {
            candidate = { nx, ny };
            candidateValue = -1;
            break;
          }
          const oreValue = oreField[ny]?.[nx];
          if (!Number.isFinite(oreValue)) continue;
          if (oreValue < candidateValue) {
            candidateValue = oreValue;
            candidate = { nx, ny };
          }
        }
        if (candidate) {
          const { nx, ny } = candidate;
          const neighborRow = terrainTypes[ny];
          const neighborSubstrateRow = substrateTypes[ny];
          if (neighborRow && neighborSubstrateRow) {
            neighborSubstrateRow[nx] = 'stone';
            neighborRow[nx] = 'stone';
          }
        }
      }
    }
  }

  classifyTerrain(hydrology.seaLevel);

  const COAST_NEIGHBORS = [
    [-1, -1],
    [0, -1],
    [1, -1],
    [-1, 0],
    [1, 0],
    [-1, 1],
    [0, 1],
    [1, 1]
  ];

  function computeCoastlineRatio({ includeClusters = false } = {}) {
    const coastline = [];
    for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
        const terrain = terrainTypes[y]?.[x];
        if (!terrain || isWaterTerrain(terrain)) continue;
        const touchesOcean = COAST_NEIGHBORS.some(([dx, dy]) => {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= mapWidth || ny >= mapHeight) return false;
          return hydrology.types[ny]?.[nx] === 'ocean';
        });
        if (touchesOcean) {
          coastline.push([x, y]);
        }
      }
    }

    if (!coastline.length) {
      return { length: 0, largest: 0, ratio: 1, clusters: [], largestIndex: -1 };
    }

    const visited = new Set();
    const coastlineSet = new Set(coastline.map(([x, y]) => y * mapWidth + x));
    let largest = 0;
    let largestIndex = -1;
    const clusters = includeClusters ? [] : null;
    let clusterIndex = 0;

    for (const [sx, sy] of coastline) {
      const startKey = sy * mapWidth + sx;
      if (visited.has(startKey)) continue;
      const queue = [[sx, sy]];
      visited.add(startKey);
      let size = 0;
      const tiles = includeClusters ? [] : null;
      while (queue.length) {
        const [cx, cy] = queue.shift();
        size += 1;
        if (tiles) {
          tiles.push([cx, cy]);
        }
        for (const [dx, dy] of COAST_NEIGHBORS) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= mapWidth || ny >= mapHeight) continue;
          const key = ny * mapWidth + nx;
          if (!coastlineSet.has(key) || visited.has(key)) continue;
          visited.add(key);
          queue.push([nx, ny]);
        }
      }
      if (size > largest) {
        largest = size;
        largestIndex = clusterIndex;
      }
      if (tiles) {
        clusters.push({ size, tiles });
        clusterIndex += 1;
      }
    }

    return {
      length: coastline.length,
      largest,
      ratio: largest / coastline.length,
      clusters: clusters ?? [],
      largestIndex
    };
  }

  const chunkRenderer = createChunkRenderer({
    width: mapWidth,
    height: mapHeight,
    tiles,
    terrainTypes,
    chunkSize: DEFAULT_CHUNK_SIZE
  });

  chunkRenderer.renderAll();

  const baseSeaLevel = hydrology.seaLevel;

  function setSeaLevelAdjustment(adjustment) {
    const clamped = clamp(adjustment, -0.2, 0.2);
    if (Math.abs(clamped - seaLevelAdjustment) < 1e-6) {
      return false;
    }
    seaLevelAdjustment = clamped;
    classifyTerrain(baseSeaLevel + seaLevelAdjustment);
    chunkRenderer.renderAll();
    return true;
  }

  function smoothCoastlineClusters() {
    const coastline = computeCoastlineRatio({ includeClusters: true });
    if (!coastline.clusters.length || coastline.largestIndex < 0) {
      return false;
    }

    const largestCluster = coastline.clusters[coastline.largestIndex];
    if (!largestCluster || !largestCluster.tiles?.length) {
      return false;
    }

    const changedChunks = new Set();

    const markChunkForTile = (x, y) => {
      if (x < 0 || y < 0 || x >= mapWidth || y >= mapHeight) {
        return;
      }
      const chunkRow = Math.floor(y / chunkRenderer.chunkSize);
      const chunkColumn = Math.floor(x / chunkRenderer.chunkSize);
      if (
        chunkRow < 0 ||
        chunkColumn < 0 ||
        chunkRow >= chunkRenderer.chunkRows ||
        chunkColumn >= chunkRenderer.chunkColumns
      ) {
        return;
      }
      changedChunks.add(`${chunkRow}:${chunkColumn}`);
    };

    const ensureLandTile = (x, y) => {
      if (x < 0 || y < 0 || x >= mapWidth || y >= mapHeight) {
        return false;
      }
      const terrainRow = terrainTypes[y];
      const hydroRow = hydrology.types[y];
      if (!terrainRow || !hydroRow) {
        return false;
      }
      let updated = false;
      const current = terrainRow[x];
      if (!current || isWaterTerrain(current)) {
        terrainRow[x] = openTerrainType;
        updated = true;
      }
      if (hydroRow[x] !== 'land') {
        hydroRow[x] = 'land';
        updated = true;
      }
      if (updated) {
        markChunkForTile(x, y);
      }
      return updated;
    };

    const traceLine = (x0, y0, x1, y1) => {
      const points = [];
      let cx = Math.trunc(x0);
      let cy = Math.trunc(y0);
      const targetX = Math.trunc(x1);
      const targetY = Math.trunc(y1);
      let dx = Math.abs(targetX - cx);
      let dy = Math.abs(targetY - cy);
      const sx = cx < targetX ? 1 : -1;
      const sy = cy < targetY ? 1 : -1;
      let err = dx - dy;

      while (cx !== targetX || cy !== targetY) {
        points.push([cx, cy]);
        const e2 = err * 2;
        if (e2 > -dy) {
          err -= dy;
          cx += sx;
        }
        if (e2 < dx) {
          err += dx;
          cy += sy;
        }
      }
      points.push([cx, cy]);
      return points;
    };

    let changed = false;

    coastline.clusters.forEach((cluster, index) => {
      if (!cluster?.tiles?.length || index === coastline.largestIndex) {
        return;
      }

      let bestPair = null;
      let bestDistance = Infinity;
      for (const [cx, cy] of cluster.tiles) {
        for (const [lx, ly] of largestCluster.tiles) {
          const dx = cx - lx;
          const dy = cy - ly;
          const distance = dx * dx + dy * dy;
          if (distance < bestDistance) {
            bestDistance = distance;
            bestPair = {
              from: [cx, cy],
              to: [lx, ly]
            };
          }
        }
      }

      if (!bestPair) {
        return;
      }

      const path = traceLine(bestPair.from[0], bestPair.from[1], bestPair.to[0], bestPair.to[1]);
      let clusterChanged = false;
      for (let i = 1; i < path.length - 1; i++) {
        const [px, py] = path[i];
        clusterChanged = ensureLandTile(px, py) || clusterChanged;
      }

      if (clusterChanged) {
        changed = true;
      }
    });

    if (changed) {
      const chunks = Array.from(changedChunks).map(key => {
        const [row, column] = key.split(':').map(value => Number.parseInt(value, 10));
        return { row, column };
      });
      chunkRenderer.renderDirty({ chunks, full: false });
    }

    return changed;
  }

  const waterSurfaceThreshold = () => hydrology.seaLevel + 1e-5;
  const isHydrologyWaterCell = (row, col) => {
    const type = terrainTypes[row]?.[col];
    if (type && isWaterTerrain(type)) {
      return true;
    }
    const tableRow = waterTable?.[row];
    if (!tableRow) {
      return false;
    }
    const level = tableRow[col];
    return Number.isFinite(level) && level <= waterSurfaceThreshold();
  };

  function findNearestLandAnchor(currentXStart, currentYStart) {
    let closestLand = null;
    for (let row = 0; row < mapHeight; row++) {
      const rowData = terrainTypes[row];
      if (!rowData) continue;
      for (let col = 0; col < mapWidth; col++) {
        if (isHydrologyWaterCell(row, col)) continue;
        const worldX = currentXStart + col;
        const worldY = currentYStart + row;
        const distance = Math.hypot(worldX, worldY);
        if (
          !closestLand ||
          distance < closestLand.distance ||
          (distance === closestLand.distance &&
            (Math.abs(worldY) < Math.abs(closestLand.worldY) ||
              (Math.abs(worldY) === Math.abs(closestLand.worldY) &&
                Math.abs(worldX) < Math.abs(closestLand.worldX))))
        ) {
          closestLand = { worldX, worldY, distance };
        }
      }
    }
    return closestLand;
  }

  let waterLevel = Number.isFinite(waterLevelOverride)
    ? clamp(waterLevelOverride, 0, 1)
    : hydrology.seaLevel;

  let originShiftX = 0;
  let originShiftY = 0;

  const fairnessThresholds = { minLand: 0.5, maxOre: 0.4 };
  const fairnessRadius = 100;
  const solverSeed = worldSettings?.seed ?? seed;

  let solverResult = null;
  let solverMessages = [];

  if (!skipSanityChecks) {
    const solver = new AdjustmentSolver({
      parameters: {
        xStart: effectiveXStart,
        yStart: effectiveYStart,
        originShiftX,
        originShiftY,
        seaLevelAdjustment
      },
      maxIterations: 6,
      chunkSize: chunkRenderer.chunkSize,
      chunkRows: chunkRenderer.chunkRows,
      chunkColumns: chunkRenderer.chunkColumns,
      gridWidth: mapWidth,
      gridHeight: mapHeight,
      evaluate: ({ parameters }) => {
        const shiftX = parameters.originShiftX || 0;
        const shiftY = parameters.originShiftY || 0;
        const adjustedXStart = parameters.xStart - shiftX;
        const adjustedYStart = parameters.yStart - shiftY;
        const validation = validateStartingArea(
          terrainTypes,
          adjustedXStart,
          adjustedYStart,
          0,
          0,
          fairnessRadius,
          fairnessThresholds
        );
        const coastline = computeCoastlineRatio();
        const originCol = -adjustedXStart;
        const originRow = -adjustedYStart;
        const inBounds =
          originCol >= 0 && originCol < mapWidth && originRow >= 0 && originRow < mapHeight;
        const originIsWater = inBounds && isHydrologyWaterCell(originRow, originCol);
        const coastlineSatisfied = coastline.ratio >= 0.95;
        const score =
          validation.landRatio - validation.oreRatio * 0.2 - (originIsWater ? 0.25 : 0);
        return {
          ...validation,
          satisfied:
            validation.meetsLand && validation.meetsOre && !originIsWater && coastlineSatisfied,
          xStart: adjustedXStart,
          yStart: adjustedYStart,
          originShiftX: parameters.originShiftX,
          originShiftY: parameters.originShiftY,
          seaLevelAdjustment: parameters.seaLevelAdjustment || 0,
          coastline,
          coastlineSatisfied,
          coastlineRatio: coastline.ratio,
          origin: {
            col: originCol,
            row: originRow,
            inBounds,
            isWater: originIsWater
          },
          thresholds: fairnessThresholds,
          radius: fairnessRadius,
          seed: solverSeed,
          baseXStart: parameters.xStart,
          baseYStart: parameters.yStart,
          score
        };
      },
      regenerate: ({ parameters, metrics, context }) => {
        if (!metrics) {
          return null;
        }

        const solverRef = context?.solver;
        const markOriginChunk = (col, row) => {
          if (!solverRef) return;
          if (!Number.isFinite(col) || !Number.isFinite(row)) return;
          solverRef.markTileDirty(col, row);
        };

        const shiftX = parameters.originShiftX || 0;
        const shiftY = parameters.originShiftY || 0;
        const adjustedXStart = parameters.xStart - shiftX;
        const adjustedYStart = parameters.yStart - shiftY;

        if (metrics.origin?.isWater) {
          const fallback = findNearestLandAnchor(adjustedXStart, adjustedYStart);
          if (fallback) {
            markOriginChunk(metrics.origin.col, metrics.origin.row);
            const next = {
              originShiftX: shiftX + fallback.worldX,
              originShiftY: shiftY + fallback.worldY,
              seaLevelAdjustment: parameters.seaLevelAdjustment || 0
            };
            const nextAdjustedXStart = parameters.xStart - next.originShiftX;
            const nextAdjustedYStart = parameters.yStart - next.originShiftY;
            markOriginChunk(-nextAdjustedXStart, -nextAdjustedYStart);
            const distance = formatDistance(fallback.worldX, fallback.worldY);
            const message =
              distance > 0
                ? `Shifted the landing ${distance} tiles to escape flooded ground.`
                : 'Shifted the landing away from flooded ground.';
            return { parameters: next, message };
          }
        }

        if (!metrics.meetsLand) {
          const currentAdjustment = parameters.seaLevelAdjustment || 0;
          const nextAdjustment = clamp(currentAdjustment - 0.02, -0.3, 0.2);
          if (nextAdjustment !== currentAdjustment) {
            const adjusted = context.applySeaLevelAdjustment?.(nextAdjustment);
            if (adjusted) {
              return {
                parameters: {
                  xStart: parameters.xStart,
                  yStart: parameters.yStart,
                  originShiftX: shiftX,
                  originShiftY: shiftY,
                  seaLevelAdjustment: nextAdjustment
                },
                message: 'Lowered the sea level to reveal additional shoreline.',
                markAllDirty: true
              };
            }
          }
        }

        if (!metrics.meetsLand || !metrics.meetsOre) {
          const fallback = findValidSpawn(
            terrainTypes,
            adjustedXStart,
            adjustedYStart,
            fairnessRadius,
            fairnessThresholds,
            { limit: 400 }
          );
          const fallbackValid = fallback?.validation;
        if (
          fallback &&
          fallbackValid?.meetsLand &&
          fallbackValid?.meetsOre &&
          !fallbackValid.origin?.isWater &&
          (fallback.worldX !== 0 || fallback.worldY !== 0)
        ) {
          markOriginChunk(metrics.origin?.col, metrics.origin?.row);
          const next = {
            originShiftX: shiftX + fallback.worldX,
            originShiftY: shiftY + fallback.worldY,
            seaLevelAdjustment: parameters.seaLevelAdjustment || 0
          };
            const nextAdjustedXStart = parameters.xStart - next.originShiftX;
            const nextAdjustedYStart = parameters.yStart - next.originShiftY;
            markOriginChunk(-nextAdjustedXStart, -nextAdjustedYStart);
            const message =
              fallback.distance > 0
                ? `Relocated the landing ${fallback.distance} tiles for better terrain.`
                : 'Relocated the landing for improved terrain.';
            return { parameters: next, message };
          }
        }

      if (!metrics.meetsOre) {
        const next = {
          originShiftX: shiftX,
          originShiftY: shiftY,
          seaLevelAdjustment: parameters.seaLevelAdjustment || 0
        };
        const message = 'Expanded the survey radius to balance nearby resources.';
        return { parameters: next, message };
      }

      if (Number.isFinite(metrics.coastlineRatio) && metrics.coastlineRatio < 0.95) {
        const currentAdjustment = parameters.seaLevelAdjustment || 0;
        const nextAdjustment = clamp(currentAdjustment + 0.02, -0.3, 0.3);
        if (nextAdjustment !== currentAdjustment) {
          const adjusted = context.applySeaLevelAdjustment?.(nextAdjustment);
          if (adjusted) {
            return {
              parameters: {
                xStart: parameters.xStart,
                yStart: parameters.yStart,
                originShiftX: shiftX,
                originShiftY: shiftY,
                seaLevelAdjustment: nextAdjustment
              },
              message: 'Raised the sea level to smooth the coastline.',
              markAllDirty: true
            };
          }
        }
      }

      return { stop: true };
    }
  });

    solverResult = solver.solve({ applySeaLevelAdjustment: setSeaLevelAdjustment });
    solverMessages = solverResult?.messages ? [...solverResult.messages] : [];
    if (solverResult?.dirty) {
      chunkRenderer.renderDirty(solverResult.dirty);
    }

    let smoothingApplied = false;
    for (let pass = 0; pass < 6; pass += 1) {
      const changed = smoothCoastlineClusters();
      if (!changed) {
        break;
      }
      smoothingApplied = true;
      const coastStatus = computeCoastlineRatio();
      if (coastStatus.ratio >= 0.95) {
        break;
      }
    }
    if (smoothingApplied) {
      solverMessages.push('Smoothed minor coastline fragments for continuity.');
    }

    if (solverResult?.parameters) {
      originShiftX = solverResult.parameters.originShiftX || 0;
      originShiftY = solverResult.parameters.originShiftY || 0;
      effectiveXStart = solverResult.parameters.xStart - originShiftX;
      effectiveYStart = solverResult.parameters.yStart - originShiftY;
    }
  }

  if (!Number.isFinite(waterLevelOverride)) {
    waterLevel = hydrology.seaLevel;
  }

  const finalCoastline = computeCoastlineRatio();
  const finalValidation = validateStartingArea(
    terrainTypes,
    effectiveXStart,
    effectiveYStart,
    0,
    0,
    fairnessRadius,
    fairnessThresholds
  );
  const finalOriginCol = -effectiveXStart;
  const finalOriginRow = -effectiveYStart;
  const finalOriginInBounds =
    finalOriginCol >= 0 && finalOriginCol < mapWidth && finalOriginRow >= 0 && finalOriginRow < mapHeight;
  const finalOriginWater = finalOriginInBounds && isHydrologyWaterCell(finalOriginRow, finalOriginCol);
  const finalMetrics = {
    ...finalValidation,
    xStart: effectiveXStart,
    yStart: effectiveYStart,
    originShiftX,
    originShiftY,
    seaLevelAdjustment: solverResult?.parameters?.seaLevelAdjustment || 0,
    coastline: finalCoastline,
    coastlineRatio: finalCoastline.ratio,
    coastlineSatisfied: finalCoastline.ratio >= 0.95,
    origin: {
      col: finalOriginCol,
      row: finalOriginRow,
      inBounds: finalOriginInBounds,
      isWater: finalOriginWater
    },
    satisfied:
      finalValidation.meetsLand &&
      finalValidation.meetsOre &&
      !finalOriginWater &&
      finalCoastline.ratio >= 0.95
  };

  if (!skipSanityChecks && solverMessages.length) {
    const ratioSummary = finalMetrics
      ? ` (land ${Math.round(finalMetrics.landRatio * 100)}% • ore ${Math.round(
          finalMetrics.oreRatio * 100
        )}% of usable land)`
      : '';
    const detail = solverMessages.join(' ');
    notifySanityCheck(`Adjusted landing zone for fairness: ${detail}${ratioSummary}`, {
      metrics: finalMetrics,
      history: solverResult.history,
      iterations: solverResult.iterations
    });
  }

  const viewportDetails = viewport
    ? {
        xStart: Number.isFinite(viewport.xStart)
          ? Math.trunc(viewport.xStart - originShiftX)
          : effectiveXStart,
        yStart: Number.isFinite(viewport.yStart)
          ? Math.trunc(viewport.yStart - originShiftY)
          : effectiveYStart,
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
    substrateTypes,
    elevations,
    season,
    waterLevel,
    hydrology,
    solver: {
      metrics: finalMetrics,
      history: solverResult?.history ?? [],
      iterations: solverResult?.iterations ?? 0,
      messages: solverMessages
    },
    worldSettings: world,
    viewport: viewportDetails,
    openTerrainType
  };
}
