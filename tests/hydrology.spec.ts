import { describe, expect, it } from 'vitest';
import { generateColorMap, isWaterTerrain } from '../src/map.js';

const EIGHT_NEIGHBORS: Array<[number, number]> = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1]
];

const STANDING_WATER_TYPES = new Set(['lake', 'pond', 'marsh', 'swamp', 'bog', 'fen']);
const MARINE_WATER_TYPES = new Set([
  'ocean',
  'estuary',
  'delta',
  'mangrove_forest',
  'kelp_forest',
  'coral_reef',
  'polar_sea',
  'open_ocean',
  'abyssal_deep',
  'seamount'
]);
const FLOWING_WATER_TYPES = new Set(['river', 'stream']);
const WATER_TYPES = new Set([
  'water',
  ...STANDING_WATER_TYPES,
  ...MARINE_WATER_TYPES,
  ...FLOWING_WATER_TYPES
]);

function createHydrologyTestMap() {
  return generateColorMap(
    'temperate-maritime',
    'hydrology-spec',
    null,
    null,
    96,
    96,
    'Sunheight',
    undefined,
    null,
    {
      // Use the pangea preset so the coastline spans one large connected landmass.
      mapType: 'pangea',
      waterTable: 64,
      rainfall: 68,
      rivers100: 72,
      lakes100: 66,
      streams100: 68,
      ponds100: 60,
      marshSwamp: 62,
      bogFen: 56,
      mountains: 42,
      advanced: {
        waterGuaranteeRadius: 60,
        waterFlowMultiplier: 55
      }
    }
  );
}

describe('hydrology generation', () => {
  it('connects every river tile to a standing water body', () => {
    const map = createHydrologyTestMap();
    const hydrology = map.hydrology;
    expect(hydrology).toBeTruthy();

    const flow = hydrology.flowDirections;
    const types = hydrology.types;
    const width = map.width;
    const height = map.height;

    const reachesStandingWater = (startX: number, startY: number): boolean => {
      const visited = new Set<number>();
      let x = startX;
      let y = startY;
      for (let steps = 0; steps < width * height; steps += 1) {
        const kind = types[y]?.[x];
        if (STANDING_WATER_TYPES.has(kind) || MARINE_WATER_TYPES.has(kind)) {
          return true;
        }
        const dir = flow[y]?.[x];
        if (!dir) {
          return EIGHT_NEIGHBORS.some(([dx, dy]) => {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) return false;
            const neighborType = types[ny]?.[nx];
            return (
              STANDING_WATER_TYPES.has(neighborType) ||
              MARINE_WATER_TYPES.has(neighborType)
            );
          });
        }
        const nx = x + dir.dx;
        const ny = y + dir.dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
          return false;
        }
        const key = ny * width + nx;
        if (visited.has(key)) {
          return false;
        }
        visited.add(key);
        x = nx;
        y = ny;
      }
      return false;
    };

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (types[y]?.[x] !== 'river') continue;
        expect(reachesStandingWater(x, y)).toBe(true);
      }
    }
  });

  it('caps singleton water features below the configured threshold', () => {
    const map = createHydrologyTestMap();
    const { hydrology } = map;
    const types = hydrology.types;
    const width = map.width;
    const height = map.height;
    let singletons = 0;

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const type = types[y]?.[x];
        if (!type || !WATER_TYPES.has(type)) continue;
        let neighbors = 0;
        for (const [dx, dy] of EIGHT_NEIGHBORS) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          if (WATER_TYPES.has(types[ny]?.[nx] ?? '')) {
            neighbors += 1;
            if (neighbors) break;
          }
        }
        if (neighbors === 0) singletons += 1;
      }
    }

    const allowance = Math.ceil(width * height * 0.0005);
    expect(singletons).toBeLessThanOrEqual(allowance);
  });

  it('maintains a mostly 8-connected coastline', () => {
    const map = createHydrologyTestMap();
    const { hydrology } = map;
    const width = map.width;
    const height = map.height;
    const coastline: Array<[number, number]> = [];

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const terrain = map.types[y]?.[x];
        if (!terrain || isWaterTerrain(terrain)) continue;
        const touchesOcean = EIGHT_NEIGHBORS.some(([dx, dy]) => {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) return false;
          const hydroType = hydrology.types[ny]?.[nx];
          return hydroType ? MARINE_WATER_TYPES.has(hydroType) : false;
        });
        if (touchesOcean) {
          coastline.push([x, y]);
        }
      }
    }

    expect(coastline.length).toBeGreaterThan(0);
    const visited = new Set<number>();
    let largest = 0;
    const coastlineSet = new Set(coastline.map(([x, y]) => y * width + x));

    for (const [sx, sy] of coastline) {
      const startKey = sy * width + sx;
      if (visited.has(startKey)) continue;
      const queue: Array<[number, number]> = [[sx, sy]];
      visited.add(startKey);
      let size = 0;
      while (queue.length) {
        const [cx, cy] = queue.shift()!;
        size += 1;
        for (const [dx, dy] of EIGHT_NEIGHBORS) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const key = ny * width + nx;
          if (!coastlineSet.has(key) || visited.has(key)) continue;
          visited.add(key);
          queue.push([nx, ny]);
        }
      }
      if (size > largest) largest = size;
    }

    const ratio = largest / coastline.length;
    expect(ratio).toBeGreaterThanOrEqual(0.95);
  });
});
