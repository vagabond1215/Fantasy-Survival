import { pathToFileURL } from 'node:url';
import { readFile } from 'node:fs/promises';

import { biomes, getBiome } from '../src/biomes.js';
import {
  DEFAULT_MAP_HEIGHT,
  DEFAULT_MAP_WIDTH,
  computeCenteredStart
} from '../src/map.js';
import { deriveElevationOptions, deriveLandmassModifiers } from '../src/world/parameters.js';
import { createElevationSampler } from '../src/map/generation/elevation.js';
import { generateHydrology } from '../src/map/generation/hydrology.js';
import {
  DEFAULT_LANDMASS_TYPE,
  LANDMASS_PRESETS
} from '../src/map/landmassPresets/index.js';
import {
  difficultySettings,
  resolveWorldParameters
} from '../src/difficulty.js';

const WATER_TYPES = new Set(['water', 'ocean', 'lake', 'river', 'marsh', 'mangrove']);
const DEFAULT_SEED = 'hydrology-tune';
const DEFAULT_BIOME = 'temperate-deciduous';

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function clone(value) {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  if (value === undefined) {
    return undefined;
  }
  return JSON.parse(JSON.stringify(value));
}

function coerceValue(raw) {
  if (raw === undefined) return raw;
  const trimmed = typeof raw === 'string' ? raw.trim() : raw;
  if (trimmed === '') return '';
  if (typeof trimmed !== 'string') return trimmed;
  const lower = trimmed.toLowerCase();
  if (lower === 'true') return true;
  if (lower === 'false') return false;
  if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) {
    const num = Number(trimmed);
    if (!Number.isNaN(num)) return num;
  }
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      return JSON.parse(trimmed);
    } catch (error) {
      // fall through to returning raw string
    }
  }
  return trimmed;
}

function applyOverride(target, path, value) {
  const keys = path.split('.').map(part => part.trim()).filter(Boolean);
  if (!keys.length) return;
  let cursor = target;
  for (let i = 0; i < keys.length - 1; i += 1) {
    const key = keys[i];
    const next = cursor[key];
    if (typeof next !== 'object' || next === null) {
      cursor[key] = {};
    }
    cursor = cursor[key];
  }
  cursor[keys[keys.length - 1]] = value;
}

function mergeOverrides(base, overrides = {}) {
  const merged = clone(base);
  Object.entries(overrides).forEach(([key, value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      merged[key] = mergeOverrides(merged[key] ?? {}, value);
    } else {
      merged[key] = value;
    }
  });
  return merged;
}

function collectMapTypes(requested) {
  if (!requested || requested.length === 0) {
    return Object.keys(LANDMASS_PRESETS).sort();
  }
  if (requested.length === 1 && requested[0] === 'all') {
    return Object.keys(LANDMASS_PRESETS).sort();
  }
  return requested.map(type => type.trim()).filter(Boolean);
}

function collectWorldIds(requested) {
  if (!requested || requested.length === 0) {
    return ['normal'];
  }
  if (requested.length === 1 && requested[0] === 'all') {
    return Object.keys(difficultySettings);
  }
  return requested.map(id => id.trim()).filter(Boolean);
}

function lakeCountFromTypes(types) {
  const height = types.length;
  const width = height ? types[0].length : 0;
  const visited = Array.from({ length: height }, () => new Uint8Array(width));
  let lakes = 0;
  const queue = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (types[y]?.[x] !== 'lake') continue;
      if (visited[y][x]) continue;
      lakes += 1;
      queue.length = 0;
      queue.push([x, y]);
      visited[y][x] = 1;
      while (queue.length) {
        const [cx, cy] = queue.pop();
        const neighbors = [
          [cx - 1, cy],
          [cx + 1, cy],
          [cx, cy - 1],
          [cx, cy + 1]
        ];
        for (const [nx, ny] of neighbors) {
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          if (visited[ny][nx]) continue;
          if (types[ny]?.[nx] !== 'lake') continue;
          visited[ny][nx] = 1;
          queue.push([nx, ny]);
        }
      }
    }
  }
  return lakes;
}

function summarizeTypes(types) {
  const summary = new Map();
  for (let y = 0; y < types.length; y += 1) {
    const row = types[y] || [];
    for (let x = 0; x < row.length; x += 1) {
      const type = row[x] ?? 'land';
      summary.set(type, (summary.get(type) ?? 0) + 1);
    }
  }
  return summary;
}

function extractMetrics({
  hydrology,
  width,
  height,
  waterCoverageTarget
}) {
  const totalCells = width * height;
  const typeSummary = summarizeTypes(hydrology.types ?? []);
  const waterCells = Array.from(typeSummary.entries())
    .filter(([type]) => WATER_TYPES.has(type))
    .reduce((sum, [, count]) => sum + count, 0);
  const lakeCells = typeSummary.get('lake') ?? 0;
  const riverCells = typeSummary.get('river') ?? 0;
  const oceanCells = typeSummary.get('ocean') ?? 0;
  const marshCells = typeSummary.get('marsh') ?? 0;
  const mangroveCells = typeSummary.get('mangrove') ?? 0;
  const lakeCount = lakeCountFromTypes(hydrology.types ?? []);
  const iterations = hydrology.waterAdjustmentHistory?.length ?? 0;
  return {
    totalCells,
    waterCoverage: hydrology.waterCoverage ?? 0,
    surfaceWaterCoverage: hydrology.surfaceWaterCoverage ?? 0,
    waterCoverageTarget,
    seaLevel: hydrology.seaLevel ?? 0,
    waterCells,
    waterCellFraction: totalCells ? waterCells / totalCells : 0,
    lakeCells,
    lakeFraction: totalCells ? lakeCells / totalCells : 0,
    lakeCount,
    riverCells,
    riverCellFraction: totalCells ? riverCells / totalCells : 0,
    oceanCells,
    oceanFraction: totalCells ? oceanCells / totalCells : 0,
    marshCells,
    mangroveCells,
    iterations,
    riverStats: hydrology.riverStats ?? { mainChannels: 0, tributaries: 0, distributaries: 0 },
    adjustmentHistory: hydrology.waterAdjustmentHistory ?? []
  };
}

function buildWorldEntry(id, baseWorld, overrides, { mapType, overrideMapType }) {
  const worldWithOverrides = mergeOverrides(baseWorld, overrides ?? {});
  if (!overrideMapType) {
    worldWithOverrides.mapType = mapType;
  }
  const resolved = resolveWorldParameters(worldWithOverrides);
  return { id, world: resolved };
}

async function loadCustomWorld(path) {
  const contents = await readFile(path, 'utf8');
  const parsed = JSON.parse(contents);
  if (!parsed || typeof parsed !== 'object') {
    throw new TypeError('Custom world file must contain an object.');
  }
  return parsed;
}

export async function analyzeHydrology({
  mapTypes = [],
  worldIds = [],
  width = DEFAULT_MAP_WIDTH,
  height = DEFAULT_MAP_HEIGHT,
  seed = DEFAULT_SEED,
  biomeId = DEFAULT_BIOME,
  worldOverrides = {},
  customWorlds = []
} = {}) {
  const normalizedWidth = Math.max(4, Math.trunc(width));
  const normalizedHeight = Math.max(4, Math.trunc(height));
  const selectedMapTypes = collectMapTypes(mapTypes);
  if (!selectedMapTypes.length) {
    throw new Error('At least one map type must be supplied.');
  }
  const unknownMapType = selectedMapTypes.find(type => !LANDMASS_PRESETS[type]);
  if (unknownMapType) {
    throw new Error(`Unknown landmass preset "${unknownMapType}".`);
  }
  const selectedWorldIds = collectWorldIds(worldIds);
  if (!selectedWorldIds.length && customWorlds.length === 0) {
    throw new Error('At least one world preset or custom world is required.');
  }
  const biome = getBiome(biomeId) ?? null;
  const overrideKeys = new Set(Object.keys(worldOverrides ?? {}));
  const overrideMapType = overrideKeys.has('mapType');
  const worldEntries = [];
  for (const id of selectedWorldIds) {
    const preset = difficultySettings[id];
    if (!preset) {
      throw new Error(`Unknown difficulty/world id "${id}".`);
    }
    worldEntries.push({ id, base: clone(preset.world) });
  }
  for (const custom of customWorlds) {
    if (!custom || typeof custom !== 'object') continue;
    const id = custom.id ?? 'custom';
    const world = custom.world ?? custom;
    if (!world || typeof world !== 'object') {
      throw new Error(`Custom world entry "${id}" must provide a world object.`);
    }
    worldEntries.push({ id, base: clone(world) });
  }
  const scenarios = [];
  const { xStart, yStart } = computeCenteredStart(normalizedWidth, normalizedHeight);
  for (const mapType of selectedMapTypes) {
    const resolvedMapType = mapType || DEFAULT_LANDMASS_TYPE;
    for (const entry of worldEntries) {
      const { id, base } = entry;
      const { id: worldId, world } = buildWorldEntry(
        id,
        base,
        worldOverrides,
        { mapType: resolvedMapType, overrideMapType }
      );
      const landmassConfig = deriveLandmassModifiers(world, { skipResolve: true });
      const landmassType = landmassConfig?.landmassType ?? resolvedMapType ?? DEFAULT_LANDMASS_TYPE;
      const worldScale = Math.max(normalizedWidth, normalizedHeight) * (landmassConfig.worldScaleFactor ?? 1.2);
      const elevationOptions = deriveElevationOptions(biome, world, { skipResolve: true });
      const sampler = createElevationSampler(seed, {
        base: elevationOptions.base,
        variance: elevationOptions.variance,
        scale: elevationOptions.scale,
        worldScale,
        maskStrength: landmassConfig.maskStrength,
        maskBias: landmassConfig.maskBias,
        mapType: landmassType
      });
      const elevations = [];
      for (let y = 0; y < normalizedHeight; y += 1) {
        const row = [];
        for (let x = 0; x < normalizedWidth; x += 1) {
          const gx = xStart + x;
          const gy = yStart + y;
          row.push(clamp(sampler.sample(gx, gy), 0, 1));
        }
        elevations.push(row);
      }
      const waterCoverageTarget = clamp(landmassConfig.waterCoverageTarget ?? 0.32, 0.08, 0.85);
      const minOceanFraction = clamp(landmassConfig.minOceanFraction ?? 0.02, 0, 0.6);
      const hydrology = generateHydrology({
        seed,
        width: normalizedWidth,
        height: normalizedHeight,
        elevations,
        biome: biome
          ? { id: biome.id, features: biome.features, elevation: biome.elevation }
          : null,
        world: {
          ...world,
          mapType: landmassType,
          waterCoverageTarget,
          minOceanFraction
        }
      });
      const metrics = extractMetrics({
        hydrology,
        width: normalizedWidth,
        height: normalizedHeight,
        waterCoverageTarget
      });
      scenarios.push({
        mapType: landmassType,
        worldId,
        biomeId: biome?.id ?? null,
        seed,
        width: normalizedWidth,
        height: normalizedHeight,
        metrics,
        world,
        landmass: {
          ...landmassConfig,
          waterCoverageTarget,
          minOceanFraction
        }
      });
    }
  }
  return {
    seed,
    biomeId: biome?.id ?? null,
    width: normalizedWidth,
    height: normalizedHeight,
    scenarios
  };
}

function formatTableRows(scenarios) {
  return scenarios.map(scenario => {
    const { metrics } = scenario;
    return {
      mapType: scenario.mapType,
      world: scenario.worldId,
      biome: scenario.biomeId,
      coverage: `${(metrics.waterCoverage * 100).toFixed(2)}%`,
      surface: `${(metrics.surfaceWaterCoverage * 100).toFixed(2)}%`,
      rivers: `${(metrics.riverCellFraction * 100).toFixed(2)}%`,
      lakes: `${metrics.lakeCount} (${(metrics.lakeFraction * 100).toFixed(2)}%)`,
      ocean: `${(metrics.oceanFraction * 100).toFixed(2)}%`,
      seaLevel: metrics.seaLevel.toFixed(3),
      iterations: metrics.iterations
    };
  });
}

function showHelp() {
  console.log(`Hydrology tuning helper\n\n` +
    `Usage: node ./scripts/hydrology-tune.mjs [options]\n\n` +
    `Options:\n` +
    `  --map-type <type|all>      Landmass preset (default: all presets)\n` +
    `  --difficulty <id|all>      Difficulty world settings (default: normal)\n` +
    `  --biome <biomeId>          Biome id for elevation context (default: ${DEFAULT_BIOME})\n` +
    `  --width <tiles>            Map width (default: ${DEFAULT_MAP_WIDTH})\n` +
    `  --height <tiles>           Map height (default: ${DEFAULT_MAP_HEIGHT})\n` +
    `  --seed <text>              Seed for deterministic sampling (default: ${DEFAULT_SEED})\n` +
    `  --set key=value            Override world parameter (repeatable, dot notation supported)\n` +
    `  --format <json|table>      Output format (default: table)\n` +
    `  --world-file <path>        Load additional world parameters from JSON file\n` +
    `  --list                     Show available map types, biomes, and difficulties\n` +
    `  -h, --help                 Show this help message\n`);
}

function showList() {
  console.log('Available landmass presets:');
  Object.keys(LANDMASS_PRESETS)
    .sort()
    .forEach(name => console.log(`  - ${name}`));
  console.log('\nAvailable difficulty/world ids:');
  Object.keys(difficultySettings)
    .sort()
    .forEach(name => console.log(`  - ${name}`));
  console.log('\nAvailable biomes:');
  biomes.forEach(biome => {
    console.log(`  - ${biome.id} (${biome.name})`);
  });
}

async function parseCliArgs(argv) {
  const options = {
    help: false,
    list: false,
    mapTypes: [],
    worldIds: [],
    biomeId: DEFAULT_BIOME,
    width: DEFAULT_MAP_WIDTH,
    height: DEFAULT_MAP_HEIGHT,
    seed: DEFAULT_SEED,
    format: 'table',
    overrides: {},
    customWorlds: []
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('-')) continue;
    const normalized = arg.replace(/^--?/, '');
    if (normalized === 'help' || normalized === 'h') {
      options.help = true;
      continue;
    }
    if (normalized === 'list') {
      options.list = true;
      continue;
    }
    const [key, attached] = normalized.split('=', 2);
    const nextValue = attached ?? argv[i + 1];
    const consumeNext = attached === undefined;
    const consume = () => {
      if (consumeNext) i += 1;
      return nextValue;
    };
    switch (key) {
      case 'map-type':
      case 'mapType': {
        const value = consume();
        if (typeof value === 'string') {
          options.mapTypes = value.split(',').map(s => s.trim()).filter(Boolean);
        }
        break;
      }
      case 'difficulty':
      case 'world': {
        const value = consume();
        if (typeof value === 'string') {
          options.worldIds = value.split(',').map(s => s.trim()).filter(Boolean);
        }
        break;
      }
      case 'biome': {
        const value = consume();
        if (typeof value === 'string' && value.trim()) {
          options.biomeId = value.trim();
        }
        break;
      }
      case 'width': {
        const value = Number(consume());
        if (Number.isFinite(value)) {
          options.width = Math.max(4, Math.trunc(value));
        }
        break;
      }
      case 'height': {
        const value = Number(consume());
        if (Number.isFinite(value)) {
          options.height = Math.max(4, Math.trunc(value));
        }
        break;
      }
      case 'seed': {
        const value = consume();
        if (typeof value === 'string') {
          options.seed = value;
        }
        break;
      }
      case 'format': {
        const value = consume();
        if (typeof value === 'string') {
          options.format = value.toLowerCase();
        }
        break;
      }
      case 'set': {
        const value = consume();
        if (typeof value === 'string') {
          const eq = value.indexOf('=');
          if (eq === -1) {
            throw new Error('Overrides must use key=value syntax.');
          }
          const path = value.slice(0, eq).trim();
          const raw = value.slice(eq + 1);
          applyOverride(options.overrides, path, coerceValue(raw));
        }
        break;
      }
      case 'world-file':
      case 'worldFile': {
        const value = consume();
        if (typeof value === 'string') {
          const world = await loadCustomWorld(value);
          options.customWorlds.push({ id: value, world });
        }
        break;
      }
      default: {
        throw new Error(`Unknown option --${key}`);
      }
    }
  }
  return options;
}

async function main() {
  try {
    const cli = await parseCliArgs(process.argv.slice(2));
    if (cli.help) {
      showHelp();
      return;
    }
    if (cli.list) {
      showList();
      return;
    }
    const analysis = await analyzeHydrology({
      mapTypes: cli.mapTypes,
      worldIds: cli.worldIds,
      width: cli.width,
      height: cli.height,
      seed: cli.seed,
      biomeId: cli.biomeId,
      worldOverrides: cli.overrides,
      customWorlds: cli.customWorlds
    });
    if (cli.format === 'json') {
      console.log(JSON.stringify(analysis, null, 2));
    } else {
      console.table(formatTableRows(analysis.scenarios));
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  await main();
}
