const ORTHOGONAL_DIRECTIONS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1]
];

const WATER_TYPES = new Set(['water', 'ocean', 'lake', 'river', 'marsh', 'mangrove']);

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function createFallbackRandom(seed = 'mangrove') {
  let h = 1779033703 ^ String(seed).length;
  for (let i = 0; i < String(seed).length; i += 1) {
    h = Math.imul(h ^ String(seed).charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return (x, y, salt = '') => {
    let k = h;
    const text = `${seed}:${x}:${y}:${salt}`;
    for (let i = 0; i < text.length; i += 1) {
      k = Math.imul(k ^ text.charCodeAt(i), 3432918353);
      k = (k << 13) | (k >>> 19);
    }
    k = Math.imul(k ^ (k >>> 16), 2246822507);
    k = Math.imul(k ^ (k >>> 13), 3266489909);
    k = (k ^= k >>> 16) >>> 0;
    return (k >>> 0) / 4294967295;
  };
}

function computeShorelineDistance(types) {
  const height = Array.isArray(types) ? types.length : 0;
  const width = height ? types[0]?.length || 0 : 0;
  const distances = Array.from({ length: height }, () => new Array(width).fill(Infinity));
  if (!height || !width) {
    return distances;
  }

  const queue = [];
  let head = 0;
  for (let y = 0; y < height; y += 1) {
    const row = types[y];
    if (!row) continue;
    for (let x = 0; x < width; x += 1) {
      const type = row[x];
      if (!WATER_TYPES.has(type)) {
        distances[y][x] = 0;
        queue.push({ x, y });
      }
    }
  }

  while (head < queue.length) {
    const current = queue[head++];
    const { x, y } = current;
    const base = distances[y][x];
    for (let i = 0; i < ORTHOGONAL_DIRECTIONS.length; i += 1) {
      const dx = ORTHOGONAL_DIRECTIONS[i][0];
      const dy = ORTHOGONAL_DIRECTIONS[i][1];
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      if (distances[ny][nx] <= base + 1) continue;
      distances[ny][nx] = base + 1;
      queue.push({ x: nx, y: ny });
    }
  }

  return distances;
}

function hasQualifyingNeighbors(types, x, y) {
  const height = types.length;
  const width = types[0]?.length || 0;
  let touchesLand = false;
  let touchesRiver = false;
  for (let i = 0; i < ORTHOGONAL_DIRECTIONS.length; i += 1) {
    const dx = ORTHOGONAL_DIRECTIONS[i][0];
    const dy = ORTHOGONAL_DIRECTIONS[i][1];
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
    const neighbor = types[ny]?.[nx];
    if (!WATER_TYPES.has(neighbor)) {
      touchesLand = true;
    } else if (neighbor === 'river') {
      touchesRiver = true;
    }
  }
  return { touchesLand, touchesRiver };
}

/**
 * @typedef {Object} HydrologySnapshot
 * @property {string[][]} types
 * @property {number} [seaLevel]
 * @property {number[][]} [waterTable]
 * @property {number[][]} [filledElevation]
 * @property {string} [seed]
 */

/**
 * @typedef {Object} ApplyMangroveZonesOptions
 * @property {HydrologySnapshot} [hydrology]
 * @property {number[][]} [elevations]
 * @property {(x: number, y: number, salt?: string) => number} [random]
 * @property {string} [seed]
 * @property {number} [maxDistance]
 * @property {number} [maxDepth]
 * @property {number} [surfaceAllowance]
 */

/**
 * @param {ApplyMangroveZonesOptions} [options]
 */
export function applyMangroveZones({
  hydrology,
  elevations,
  random,
  seed,
  maxDistance = 3,
  maxDepth = 0.12,
  surfaceAllowance = 0.05
} = {}) {
  if (!hydrology?.types?.length) {
    return { placed: 0, expanded: 0, invalidNeighbors: 0 };
  }

  const types = hydrology.types;
  const height = types.length;
  const width = types[0]?.length || 0;
  if (!width) {
    return { placed: 0, expanded: 0, invalidNeighbors: 0 };
  }

  const randomFn =
    typeof random === 'function' ? random : createFallbackRandom(seed ?? hydrology.seed ?? 'mangrove');
  const shorelineDistance = computeShorelineDistance(types);
  const seaLevel = Number.isFinite(hydrology?.seaLevel) ? hydrology.seaLevel : 0;
  const waterTable = hydrology?.waterTable || hydrology?.filledElevation || null;

  const basePlacements = [];
  const marked = Array.from({ length: height }, () => new Array(width).fill(0));

  for (let y = 0; y < height; y += 1) {
    const row = types[y];
    if (!row) continue;
    for (let x = 0; x < width; x += 1) {
      const type = row[x];
      if (!type || type === 'river' || !WATER_TYPES.has(type)) continue;
      if (type === 'mangrove') continue;

      const distance = shorelineDistance[y]?.[x];
      if (!Number.isFinite(distance) || distance > maxDistance) continue;

      const { touchesLand, touchesRiver } = hasQualifyingNeighbors(types, x, y);
      if (!touchesLand && !touchesRiver) continue;

      const elevation = elevations?.[y]?.[x];
      const surfaceLevel = waterTable?.[y]?.[x];
      const waterSurface = Number.isFinite(surfaceLevel) ? surfaceLevel : seaLevel;
      if (!Number.isFinite(waterSurface)) continue;

      const depth = Math.max(0, waterSurface - (Number.isFinite(elevation) ? elevation : waterSurface));
      if (depth > maxDepth) continue;
      if (waterSurface > seaLevel + surfaceAllowance) continue;

      const depthFactor = clamp(1 - depth / Math.max(maxDepth, 1e-6), 0, 1);
      const distanceFactor = clamp(1 - distance / (maxDistance + 0.5), 0, 1);
      const neighborBoost = touchesRiver ? 0.15 : 0;
      const landBoost = touchesLand ? 0.05 : 0;
      const chance = clamp(0.3 + distanceFactor * 0.35 + depthFactor * 0.3 + neighborBoost + landBoost, 0.12, 0.85);
      const noise = randomFn(x, y, 'mangrove-base');
      if (noise <= chance) {
        basePlacements.push({ x, y });
        marked[y][x] = 1;
      }
    }
  }

  let expansionCount = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (marked[y][x]) continue;
      const type = types[y]?.[x];
      if (!type || type === 'river' || !WATER_TYPES.has(type)) continue;
      const distance = shorelineDistance[y]?.[x];
      if (!Number.isFinite(distance) || distance > maxDistance + 1) continue;
      const { touchesLand, touchesRiver } = hasQualifyingNeighbors(types, x, y);
      if (!touchesLand && !touchesRiver) continue;
      let neighborMangroves = 0;
      for (let i = 0; i < ORTHOGONAL_DIRECTIONS.length; i += 1) {
        const dx = ORTHOGONAL_DIRECTIONS[i][0];
        const dy = ORTHOGONAL_DIRECTIONS[i][1];
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        if (marked[ny]?.[nx]) {
          neighborMangroves += 1;
        }
      }
      if (neighborMangroves >= 2) {
        const noise = randomFn(x, y, 'mangrove-growth');
        if (noise < 0.55) {
          marked[y][x] = 1;
          basePlacements.push({ x, y });
          expansionCount += 1;
        }
      }
    }
  }

  let invalidNeighbors = 0;
  let finalCount = 0;
  for (let i = 0; i < basePlacements.length; i += 1) {
    const { x, y } = basePlacements[i];
    const { touchesLand, touchesRiver } = hasQualifyingNeighbors(types, x, y);
    if (!touchesLand && !touchesRiver) {
      invalidNeighbors += 1;
      continue;
    }
    types[y][x] = 'mangrove';
    finalCount += 1;
  }

  if (typeof console !== 'undefined' && typeof console.debug === 'function') {
    console.debug(
      `[mangrove] placed ${finalCount} tile(s) with ${expansionCount} expansion pass placements; invalid neighbors: ${invalidNeighbors}`
    );
  }

  return { placed: finalCount, expanded: expansionCount, invalidNeighbors };
}
