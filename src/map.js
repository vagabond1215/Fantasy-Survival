// @ts-nocheck
import { getBiome } from './biomes.js';
import store from './state.js';
import { resolveWorldParameters } from './difficulty.js';
import { notifySanityCheck } from './notifications.js';

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

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function createSanityRng(seedKey = 'default') {
  const seeded = xmur3(`${seedKey}:sanity-check`);
  return mulberry32(seeded());
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
      if (type === 'water') {
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
      if (!type || type !== matchType) continue;
      const worldX = startX + col;
      const dx = worldX - centerX;
      if (dx * dx + dy * dy > radiusSq) continue;
      tiles.push({ row, col, worldX, worldY, distance: Math.hypot(dx, dy) });
    }
  }

  return tiles;
}

function shuffleDeterministic(items, rng) {
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function formatDistance(dx, dy) {
  const dist = Math.round(Math.hypot(dx, dy));
  return dist;
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
      if (!type || type === 'water') continue;
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

function convertWaterToLand(context, radius, thresholds, validation, rng) {
  const { terrainTypes, tiles, effectiveXStart, effectiveYStart } = context;
  const stats = validation?.stats;
  if (!stats || !stats.total) return 0;
  const targetLand = Math.ceil(clamp(thresholds.minLand ?? 0.5, 0, 1) * stats.total);
  const deficit = targetLand - stats.land;
  if (deficit <= 0) return 0;
  const candidates = collectTilesWithinRadius(
    terrainTypes,
    effectiveXStart,
    effectiveYStart,
    radius,
    0,
    0,
    'water'
  );
  if (!candidates.length) return 0;
  const toConvert = Math.min(deficit, candidates.length);
  const selection = shuffleDeterministic(candidates, rng).slice(0, toConvert);
  selection.forEach(tile => {
    terrainTypes[tile.row][tile.col] = 'open';
    if (tiles?.[tile.row]) {
      tiles[tile.row][tile.col] = TERRAIN_SYMBOLS.open;
    }
  });
  return selection.length;
}

function softenOreDeposits(context, radius, thresholds, validation, rng) {
  const { terrainTypes, tiles, effectiveXStart, effectiveYStart } = context;
  const stats = validation?.stats;
  if (!stats) return 0;
  const usable = Math.max(1, stats.usable);
  const maxOre = Math.floor(clamp(thresholds.maxOre ?? 0.4, 0, 1) * usable);
  const excess = stats.ore - maxOre;
  if (excess <= 0) return 0;
  const candidates = collectTilesWithinRadius(
    terrainTypes,
    effectiveXStart,
    effectiveYStart,
    radius,
    0,
    0,
    'ore'
  );
  if (!candidates.length) return 0;
  const toConvert = Math.min(Math.max(1, excess), candidates.length);
  const selection = shuffleDeterministic(candidates, rng).slice(0, toConvert);
  selection.forEach(tile => {
    terrainTypes[tile.row][tile.col] = 'open';
    if (tiles?.[tile.row]) {
      tiles[tile.row][tile.col] = TERRAIN_SYMBOLS.open;
    }
  });
  return selection.length;
}

export function applySanityChecks(context, options = {}) {
  if (!context || typeof context !== 'object') {
    return { adjustments: [], validation: null };
  }

  const thresholds = {
    minLand: 0.5,
    maxOre: 0.4,
    ...(options?.thresholds || {})
  };
  const radius = Number.isFinite(options?.radius) ? Math.max(1, Math.trunc(options.radius)) : 100;
  const maxAttempts = clamp(Number.isFinite(options?.maxAttempts) ? Math.trunc(options.maxAttempts) : 5, 0, 10);
  const seedKey = options?.seed ?? options?.fallbackSeed ?? 'default';
  const rng = createSanityRng(seedKey);
  const adjustments = [];

  const validate = () =>
    validateStartingArea(
      context.terrainTypes,
      context.effectiveXStart,
      context.effectiveYStart,
      0,
      0,
      radius,
      thresholds
    );

  let validation = validate();
  let attempts = 0;

  while (
    attempts < maxAttempts &&
    validation &&
    (!validation.meetsLand || !validation.meetsOre)
  ) {
    attempts++;
    let changed = false;

    if (!validation.meetsLand) {
      const converted = convertWaterToLand(context, radius, thresholds, validation, rng);
      if (converted > 0) {
        adjustments.push(
          converted === 1
            ? 'Drained a nearby water tile to create stable footing.'
            : `Drained ${converted} nearby water tiles to create stable footing.`
        );
        changed = true;
      }
    }

    if (!changed && !validation.meetsOre) {
      const softened = softenOreDeposits(context, radius, thresholds, validation, rng);
      if (softened > 0) {
        adjustments.push(
          softened === 1
            ? 'Reduced a rich ore pocket to keep the landing viable.'
            : `Reduced ${softened} ore pockets to keep the landing viable.`
        );
        changed = true;
      }
    }

    if (!changed) {
      const fallback = findValidSpawn(
        context.terrainTypes,
        context.effectiveXStart,
        context.effectiveYStart,
        radius,
        thresholds,
        { limit: 400 }
      );
      if (fallback && (fallback.worldX !== 0 || fallback.worldY !== 0)) {
        context.effectiveXStart -= fallback.worldX;
        context.effectiveYStart -= fallback.worldY;
        context.originShiftX = (context.originShiftX || 0) + fallback.worldX;
        context.originShiftY = (context.originShiftY || 0) + fallback.worldY;
        const distance = formatDistance(fallback.worldX, fallback.worldY);
        adjustments.push(
          distance > 0
            ? `Relocated the spawn ${distance} tiles toward balanced terrain.`
            : 'Relocated the spawn toward balanced terrain.'
        );
        changed = true;
      }
    }

    if (!changed) {
      break;
    }

    validation = validate();
  }

  return { adjustments, validation };
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
  viewport = null,
  worldSettings = null
) {
  const mapWidth = Math.max(1, Math.trunc(width));
  const mapHeight = Math.max(1, Math.trunc(height ?? width ?? DEFAULT_MAP_WIDTH));
  const { xStart: defaultX, yStart: defaultY } = computeCenteredStart(mapWidth, mapHeight);
  let effectiveXStart = Number.isFinite(xStart) ? Math.trunc(xStart) : defaultX;
  let effectiveYStart = Number.isFinite(yStart) ? Math.trunc(yStart) : defaultY;
  const biome = getBiome(biomeId);
  const world = resolveWorldParameters(worldSettings || {});
  const adv = world.advanced || {};
  const waterFeature = biome && hasWaterFeature(biome.features);

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

  const baseWaterLevel = waterLevelOverride ?? biome?.elevation?.waterLevel ?? 0.3;
  const waterLevel = clamp(
    baseWaterLevel +
      waterBias * 0.18 +
      rainfallBias * 0.12 +
      Math.max(riversBias, 0) * 0.12 +
      Math.max(lakesBias, 0) * 0.16 -
      Math.max(mountainsBias, 0) * 0.06,
    0.05,
    0.85
  );

  const oreThresholdBase = clamp(0.95 - (world.oreDensity / 100) * 0.35, 0.55, 0.98);
  const oreThreshold = clamp(
    oreThresholdBase - (((adv.oreThresholdOffset ?? 50) - 50) / 100) * 0.2,
    0.5,
    0.98
  );
  const oreScale = clamp(10 + ((adv.oreNoiseScale ?? 50) / 100) * 24, 6, 40);

  const hydroBaseChance =
    Math.max(0, world.rivers100 - 40) * 0.0016 + Math.max(0, world.lakes100 - 30) * 0.0014;
  const hydroModifier = 1 - Math.max(0, mountainsBias) * 0.35;
  const extraHydrologyChance = Math.max(0, hydroBaseChance * hydroModifier);

  const guaranteedWaterRadius = clamp(
    Math.round(
      14 +
        (world.rivers100 + world.lakes100) / 12 +
        (((adv.waterGuaranteeRadius ?? 50) - 50) / 100) * 20
    ),
    6,
    54
  );

  const tiles = [];
  const terrainTypes = [];
  const elevations = [];

  for (let y = 0; y < mapHeight; y++) {
    const row = [];
    const typeRow = [];
    const eRow = [];
    for (let x = 0; x < mapWidth; x++) {
      const gx = effectiveXStart + x;
      const gy = effectiveYStart + y;
      const elevation = getElevation(seed, gx, gy, elevationOptions);
      eRow.push(elevation);
      let type;
      if (waterFeature && elevation < waterLevel) {
        type = 'water';
      } else {
        const vegNoise = vegetationNoise(seed, gx, gy, vegScale);
        type = vegNoise < openLand ? 'open' : 'forest';
        if (type !== 'water' && elevation >= waterLevel && extraHydrologyChance > 0) {
          const hydroRoll = coordRand(seed, gx, gy, 'hydro');
          if (hydroRoll < extraHydrologyChance) {
            type = 'water';
          }
        }
        if (type !== 'water') {
          const oreVal = oreNoise(seed, gx, gy, oreScale);
          if (oreVal > oreThreshold && elevation >= waterLevel) type = 'ore';
        }
      }

      const symbol = TERRAIN_SYMBOLS[type] || '?';
      row.push(symbol);
      typeRow.push(type);
    }
    tiles.push(row);
    terrainTypes.push(typeRow);
    elevations.push(eRow);
  }

  const originColIndex = -effectiveXStart;
  const originRowIndex = -effectiveYStart;
  const originInBounds =
    originColIndex >= 0 &&
    originColIndex < mapWidth &&
    originRowIndex >= 0 &&
    originRowIndex < mapHeight;

  let originShiftX = 0;
  let originShiftY = 0;

  if (originInBounds) {
    const originType = terrainTypes[originRowIndex]?.[originColIndex];
    if (originType === 'water') {
      let closestLand = null;
      for (let row = 0; row < mapHeight; row++) {
        const rowData = terrainTypes[row];
        if (!rowData) continue;
        for (let col = 0; col < mapWidth; col++) {
          const type = rowData[col];
          if (type === 'water') continue;
          const worldX = effectiveXStart + col;
          const worldY = effectiveYStart + row;
          const distance = Math.hypot(worldX, worldY);
          if (
            !closestLand ||
            distance < closestLand.distance ||
            (distance === closestLand.distance &&
              (Math.abs(worldY) < Math.abs(closestLand.worldY) ||
                (Math.abs(worldY) === Math.abs(closestLand.worldY) && Math.abs(worldX) < Math.abs(closestLand.worldX))))
          ) {
            closestLand = { localX: col, localY: row, worldX, worldY, distance };
          }
        }
      }
      if (closestLand) {
        originShiftX = closestLand.worldX;
        originShiftY = closestLand.worldY;
        effectiveXStart -= originShiftX;
        effectiveYStart -= originShiftY;
      }
    }
  }

  let nearestWaterDistance = Infinity;
  let bestWaterCandidate = null;

  for (let row = 0; row < mapHeight; row++) {
    for (let col = 0; col < mapWidth; col++) {
      const type = terrainTypes[row]?.[col];
      if (!type) continue;
      const worldX = effectiveXStart + col;
      const worldY = effectiveYStart + row;
      const distance = Math.hypot(worldX, worldY);
      if (type === 'water') {
        if (distance < nearestWaterDistance) {
          nearestWaterDistance = distance;
        }
        continue;
      }
      if (distance > 0 && distance <= guaranteedWaterRadius) {
        const elevation = elevations[row]?.[col] ?? 0;
        if (
          !bestWaterCandidate ||
          elevation < bestWaterCandidate.elevation ||
          (elevation === bestWaterCandidate.elevation && distance < bestWaterCandidate.distance)
        ) {
          bestWaterCandidate = { localX: col, localY: row, elevation, distance };
        }
      }
    }
  }

  if (nearestWaterDistance > guaranteedWaterRadius && bestWaterCandidate) {
    const { localX, localY } = bestWaterCandidate;
    terrainTypes[localY][localX] = 'water';
    tiles[localY][localX] = TERRAIN_SYMBOLS.water;
  }

  const sanityContext = {
    terrainTypes,
    tiles,
    effectiveXStart,
    effectiveYStart,
    originShiftX,
    originShiftY
  };
  const sanitySeed = worldSettings?.seed ?? seed;
  const { adjustments: sanityAdjustments, validation: sanityValidation } = applySanityChecks(
    sanityContext,
    {
      radius: 100,
      maxAttempts: 5,
      seed: sanitySeed,
      fallbackSeed: seed
    }
  );

  effectiveXStart = sanityContext.effectiveXStart;
  effectiveYStart = sanityContext.effectiveYStart;
  originShiftX = sanityContext.originShiftX;
  originShiftY = sanityContext.originShiftY;

  if (sanityAdjustments.length) {
    const ratioSummary = sanityValidation
      ? ` (land ${Math.round(sanityValidation.landRatio * 100)}% • ore ${Math.round(
          sanityValidation.oreRatio * 100
        )}% of usable land)`
      : '';
    const detail = sanityAdjustments.join(' ');
    notifySanityCheck(`Adjusted landing zone for fairness: ${detail}${ratioSummary}`, {
      adjustments: sanityAdjustments,
      validation: sanityValidation
    });
  }

  const flagColIndex = -effectiveXStart;
  const flagRowIndex = -effectiveYStart;
  if (
    flagColIndex >= 0 &&
    flagColIndex < mapWidth &&
    flagRowIndex >= 0 &&
    flagRowIndex < mapHeight &&
    tiles[flagRowIndex]?.[flagColIndex]
  ) {
    tiles[flagRowIndex][flagColIndex] = '🚩';
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
    elevations,
    season,
    waterLevel,
    worldSettings: world,
    viewport: viewportDetails
  };
}
