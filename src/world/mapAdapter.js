import { TERRAIN_SYMBOLS } from '../map/terrainSymbols.js';
import { generateWorld } from './generate.js';
import { deriveGenerationTuning } from './parameters.js';

const WATER_ELEVATION_THRESHOLD = 0.32;
const WATER_ELEVATION_BUFFER = 0.08;
const WATER_RUNOFF_THRESHOLD = 0.82;
const WATER_MOISTURE_THRESHOLD = 0.88;
const FOREST_WOOD_THRESHOLD = 0.55;
const FOREST_VEGETATION_THRESHOLD = 0.65;
const STONE_ORE_THRESHOLD = 0.6;
const ORE_RICH_THRESHOLD = 0.78;
const HIGH_ELEVATION_THRESHOLD = 0.72;

const WATER_TERRAIN_TYPES = new Set([
  'water',
  'ocean',
  'lake',
  'river',
  'stream',
  'pond',
  'marsh',
  'swamp',
  'bog',
  'fen',
  'mangrove',
  'estuary',
  'delta',
  'mangrove_forest',
  'kelp_forest',
  'coral_reef',
  'polar_sea',
  'open_ocean',
  'abyssal_deep',
  'seamount',
]);

function computeCenteredStart(width, height, focusX = 0, focusY = 0) {
  const normalizedWidth = Math.max(1, Math.trunc(width));
  const normalizedHeight = Math.max(1, Math.trunc(height));
  const halfCols = Math.floor(normalizedWidth / 2);
  const halfRows = Math.floor(normalizedHeight / 2);
  return {
    xStart: Math.round(focusX) - halfCols,
    yStart: Math.round(focusY) - halfRows,
  };
}

export function fallbackCanonicalSeed(seedString = '') {
  const normalized = (seedString ?? '').trim();
  const lanes = new Array(8).fill(0);
  let hash = 0x811c9dc5;
  for (let index = 0; index < normalized.length; index += 1) {
    const code = normalized.charCodeAt(index);
    hash ^= code;
    hash = Math.imul(hash, 0x01000193) >>> 0;
    const laneIndex = index % lanes.length;
    lanes[laneIndex] = Math.imul(lanes[laneIndex] ^ hash, 0x27d4eb2d) >>> 0;
  }
  if (!normalized.length) {
    for (let i = 0; i < lanes.length; i += 1) {
      lanes[i] = (hash + i * 0x9e3779b1) >>> 0;
    }
  } else {
    for (let i = 0; i < lanes.length; i += 1) {
      if (!lanes[i]) {
        lanes[i] = (hash + i * 0x9e3779b1) >>> 0;
      }
    }
  }
  const hex = lanes.map(lane => lane.toString(16).padStart(8, '0')).join('');
  return {
    raw: seedString,
    normalized,
    hex,
    lanes,
  };
}

function ensureCanonicalSeed(seed) {
  if (seed && typeof seed === 'object' && Array.isArray(seed.lanes) && typeof seed.hex === 'string') {
    return seed;
  }
  if (seed && typeof seed === 'object' && typeof seed.raw === 'string' && Array.isArray(seed.lanes)) {
    return seed;
  }
  const seedString = seed == null ? '' : String(seed);
  return fallbackCanonicalSeed(seedString);
}

export function classifyWorldTile(tile, seaLevel = null) {
  if (!tile) return 'open';
  const elevation = Number.isFinite(tile.elevation) ? tile.elevation : 0;
  const runoff = Number.isFinite(tile.runoff) ? tile.runoff : 0;
  const moisture = Number.isFinite(tile.moisture) ? tile.moisture : 0;
  const resources = tile.resources || {};
  const ore = Number.isFinite(resources.ore) ? resources.ore : 0;
  const wood = Number.isFinite(resources.wood) ? resources.wood : 0;
  const vegetation = Number.isFinite(resources.vegetation) ? resources.vegetation : 0;

  const waterThreshold = Number.isFinite(seaLevel) ? seaLevel : WATER_ELEVATION_THRESHOLD;
  const bufferedThreshold = waterThreshold + WATER_ELEVATION_BUFFER;

  if (
    elevation <= waterThreshold ||
    (elevation <= bufferedThreshold && runoff >= WATER_RUNOFF_THRESHOLD) ||
    (moisture >= WATER_MOISTURE_THRESHOLD && elevation <= bufferedThreshold)
  ) {
    return 'water';
  }

  if (ore >= ORE_RICH_THRESHOLD) {
    return 'ore';
  }

  if (ore >= STONE_ORE_THRESHOLD || elevation >= HIGH_ELEVATION_THRESHOLD) {
    return 'stone';
  }

  if (wood >= FOREST_WOOD_THRESHOLD || vegetation >= FOREST_VEGETATION_THRESHOLD) {
    return 'forest';
  }

  return 'open';
}

function normalizeViewport(viewport, defaults) {
  if (!viewport) {
    return { ...defaults };
  }
  return {
    xStart: Number.isFinite(viewport.xStart) ? Math.trunc(viewport.xStart) : defaults.xStart,
    yStart: Number.isFinite(viewport.yStart) ? Math.trunc(viewport.yStart) : defaults.yStart,
    width: Math.max(1, Math.trunc(viewport.width ?? defaults.width)),
    height: Math.max(1, Math.trunc(viewport.height ?? defaults.height)),
  };
}

export function adaptWorldToMapData(world, options = {}) {
  if (!world) {
    return {
      seed: options.seedString || '',
      seedInfo: options.seedInfo || null,
      season: options.season || null,
      tiles: [],
      types: [],
      elevations: [],
      xStart: Number.isFinite(options.xStart) ? Math.trunc(options.xStart) : 0,
      yStart: Number.isFinite(options.yStart) ? Math.trunc(options.yStart) : 0,
      width: 0,
      height: 0,
      viewport: normalizeViewport(options.viewport, { xStart: 0, yStart: 0, width: 0, height: 0 }),
      tileData: [],
      tileMatrix: [],
      layerBuffers: {
        elevation: new Float32Array(0),
        temperature: new Float32Array(0),
        moisture: new Float32Array(0),
        runoff: new Float32Array(0),
        waterTable: new Float32Array(0),
      },
      worldSettings: options.worldSettings || null,
      hydrology: null,
      seaLevel: null,
      buffer: null,
      spawnSuggestion: null,
      world: null,
    };
  }

  const width = Math.max(1, Math.trunc(world.dimensions?.width ?? 0));
  const height = Math.max(1, Math.trunc(world.dimensions?.height ?? 0));
  const size = width * height;
  const defaults = computeCenteredStart(width, height, options.focusX ?? 0, options.focusY ?? 0);
  const xStart = Number.isFinite(options.xStart) ? Math.trunc(options.xStart) : defaults.xStart;
  const yStart = Number.isFinite(options.yStart) ? Math.trunc(options.yStart) : defaults.yStart;

  const tiles = new Array(height);
  const types = new Array(height);
  const elevations = new Array(height);
  const tileMatrix = new Array(height);
  const hydrology = world.hydrology || null;
  const hydrologyTypes = hydrology?.types || null;
  const hydrologyWaterTable = hydrology?.waterTable || hydrology?.filledElevation || null;
  const seaLevel = Number.isFinite(hydrology?.seaLevel) ? hydrology.seaLevel : null;

  const elevationLayer = world.layers?.elevation instanceof Float32Array
    ? world.layers.elevation
    : new Float32Array(size);
  const temperatureLayer = world.layers?.temperature instanceof Float32Array
    ? world.layers.temperature
    : new Float32Array(size);
  const moistureLayer = world.layers?.moisture instanceof Float32Array
    ? world.layers.moisture
    : new Float32Array(size);
  const runoffLayer = world.layers?.runoff instanceof Float32Array
    ? world.layers.runoff
    : new Float32Array(size);
  const waterTableLayer = world.layers?.waterTable instanceof Float32Array
    ? world.layers.waterTable
    : new Float32Array(size);
  if (hydrologyWaterTable) {
    for (let row = 0; row < height; row += 1) {
      const sourceRow = hydrologyWaterTable[row];
      if (!sourceRow) continue;
      for (let col = 0; col < width; col += 1) {
        const value = sourceRow[col];
        if (Number.isFinite(value)) {
          waterTableLayer[row * width + col] = value;
        }
      }
    }
  }

  for (let row = 0; row < height; row += 1) {
    const tileRow = new Array(width);
    const typeRow = new Array(width);
    const elevationRow = new Array(width);
    const tileDetailRow = new Array(width);
    for (let col = 0; col < width; col += 1) {
      const index = row * width + col;
      const tile = world.tiles?.[index] || null;
      const baseType = classifyWorldTile(tile, seaLevel);
      const hydrologyType = hydrologyTypes?.[row]?.[col];
      const elevationValue = elevationLayer[index] ?? 0;
      const nearSea = Number.isFinite(seaLevel) && elevationValue <= seaLevel + WATER_ELEVATION_BUFFER;
      const type = hydrologyType && hydrologyType !== 'land' && (baseType === 'water' || nearSea)
        ? hydrologyType
        : baseType;
      typeRow[col] = type;
      const symbol = TERRAIN_SYMBOLS[type] ?? TERRAIN_SYMBOLS.open ?? type ?? '?';
      tileRow[col] = symbol;
      elevationRow[col] = elevationLayer[index] ?? 0;
      tileDetailRow[col] = tile;
    }
    tiles[row] = tileRow;
    types[row] = typeRow;
    elevations[row] = elevationRow;
    tileMatrix[row] = tileDetailRow;
  }

  const viewport = normalizeViewport(options.viewport, {
    xStart,
    yStart,
    width,
    height,
  });

  const map = {
    seed: options.seedString ?? options.seedInfo?.raw ?? '',
    seedInfo: options.seedInfo ?? null,
    season: options.season ?? null,
    tiles,
    types,
    elevations,
    xStart,
    yStart,
    width,
    height,
    viewport,
    tileData: world.tiles ?? [],
    tileMatrix,
    layerBuffers: {
      elevation: elevationLayer,
      temperature: temperatureLayer,
      moisture: moistureLayer,
      runoff: runoffLayer,
      waterTable: waterTableLayer,
    },
    worldSettings: options.worldSettings || null,
    hydrology,
    seaLevel,
    buffer: null,
    spawnSuggestion: null,
    world,
  };

  map.buffer = {
    seed: map.seed,
    season: map.season,
    tiles,
    types,
    elevations,
    xStart,
    yStart,
    width,
    height,
    viewport,
    tileData: map.tileData,
    tileMatrix,
    layers: map.layerBuffers,
    worldSettings: map.worldSettings,
    hydrology: map.hydrology,
    seaLevel: map.seaLevel,
    world,
  };

  map.spawnSuggestion = computeDefaultSpawn(map);

  return map;
}

export function computeDefaultSpawn(map) {
  if (!map?.tileMatrix?.length || !map?.types?.length) return null;
  const width = Math.max(1, Math.trunc(map.width ?? map.tileMatrix[0]?.length ?? 0));
  const height = Math.max(1, Math.trunc(map.height ?? map.tileMatrix.length ?? 0));
  if (!width || !height) return null;
  const xStart = Number.isFinite(map.xStart) ? Math.trunc(map.xStart) : 0;
  const yStart = Number.isFinite(map.yStart) ? Math.trunc(map.yStart) : 0;
  const centerX = xStart + Math.floor(width / 2);
  const centerY = yStart + Math.floor(height / 2);

  let best = null;

  for (let row = 0; row < height; row += 1) {
    const typeRow = map.types[row];
    const detailRow = map.tileMatrix[row];
    if (!typeRow || !detailRow) continue;
    for (let col = 0; col < width; col += 1) {
      const type = typeRow[col];
      if (!type || WATER_TERRAIN_TYPES.has(type)) continue;
      const tile = detailRow[col];
      if (!tile) continue;

      const worldX = xStart + col;
      const worldY = yStart + row;
      const distance = Math.hypot(worldX - centerX, worldY - centerY);
      const resources = tile.resources || {};
      const fertility = Number.isFinite(resources.fertility) ? resources.fertility : 0;
      const forage = Number.isFinite(resources.forage) ? resources.forage : 0;
      const wood = Number.isFinite(resources.wood) ? resources.wood : 0;
      const freshWater = Number.isFinite(resources.freshWater) ? resources.freshWater : 0;
      const ore = Number.isFinite(resources.ore) ? resources.ore : 0;
      const elevation = Number.isFinite(tile.elevation) ? tile.elevation : 0.5;
      const resourceScore =
        fertility * 0.25 +
        freshWater * 0.2 +
        forage * 0.2 +
        wood * 0.2 +
        ore * 0.1 +
        (1 - Math.abs(elevation - 0.55)) * 0.05;
      const score = resourceScore - distance * 0.02;

      if (
        !best ||
        score > best.score ||
        (Math.abs(score - best.score) < 1e-6 && distance < best.distance)
      ) {
        best = { x: worldX, y: worldY, score, distance };
      }
    }
  }

  return best ? { x: best.x, y: best.y } : null;
}

function enrichWorldSettings(settings, seedInfo, startingBiomeId) {
  const base = settings && typeof settings === 'object' ? { ...settings } : {};
  if (seedInfo) {
    if (!base.seed || typeof base.seed !== 'string') {
      base.seed = seedInfo.raw ?? '';
    }
    base.seedHash = seedInfo.hex;
    base.seedLanes = Array.from(seedInfo.lanes);
  }
  if (startingBiomeId && !base.startingBiomeId) {
    base.startingBiomeId = startingBiomeId;
  }
  return base;
}

export function generateWorldMap(options = {}) {
  const width = Math.max(1, Math.trunc(options.width ?? options.height ?? 128));
  const height = Math.max(1, Math.trunc(options.height ?? options.width ?? 128));
  const seedInfo = ensureCanonicalSeed(options.seedInfo ?? options.seed ?? Date.now());
  const seedString =
    typeof options.seed === 'string'
      ? options.seed
      : typeof seedInfo.raw === 'string'
        ? seedInfo.raw
        : String(options.seed ?? '');

  const params = deriveGenerationTuning(options.worldSettings, { width, height });
  const world = generateWorld({ width, height, seed: seedInfo, params });

  const worldSettings = enrichWorldSettings(options.worldSettings, seedInfo, options.startingBiomeId ?? null);

  const defaults = computeCenteredStart(width, height, options.focusX ?? 0, options.focusY ?? 0);
  const xStart = Number.isFinite(options.xStart) ? Math.trunc(options.xStart) : defaults.xStart;
  const yStart = Number.isFinite(options.yStart) ? Math.trunc(options.yStart) : defaults.yStart;

  const map = adaptWorldToMapData(world, {
    seedInfo,
    seedString,
    season: options.season ?? null,
    xStart,
    yStart,
    viewport: options.viewport ?? null,
    worldSettings,
  });

  if (!map.worldSettings) {
    map.worldSettings = worldSettings;
    if (map.buffer) {
      map.buffer.worldSettings = worldSettings;
    }
  }

  map.seedInfo = seedInfo;
  map.seed = seedString;

  return { world, map, seedInfo };
}

export function isWaterTerrainType(type) {
  return WATER_TERRAIN_TYPES.has(type);
}

export default {
  fallbackCanonicalSeed,
  classifyWorldTile,
  adaptWorldToMapData,
  computeDefaultSpawn,
  generateWorldMap,
  isWaterTerrainType,
};
