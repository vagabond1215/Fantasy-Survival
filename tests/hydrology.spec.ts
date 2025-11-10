import { describe, expect, it } from 'vitest';

import { isWaterTerrain } from '../src/map.js';
import { generateWorld } from '../src/world/generate';
import {
  adaptWorldToMapData,
  computeDefaultSpawn,
  fallbackCanonicalSeed
} from '../src/world/mapAdapter.js';

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

function buildWorld() {
  const seedInfo = fallbackCanonicalSeed('hydrology-spec');
  const world = generateWorld({ width: 96, height: 96, seed: seedInfo });
  const map = adaptWorldToMapData(world, {
    seedInfo,
    seedString: seedInfo.raw,
    season: 'Sunheight'
  });
  return { world, map };
}

describe('world hydrology signals', () => {
  it('classifies low-lying tiles as water with strong runoff correlation', () => {
    const { world, map } = buildWorld();
    const { elevation, runoff } = world.layers;
    const { width, height } = world.dimensions;

    let waterTiles = 0;
    let highRunoffWater = 0;
    let mismatched = 0;

    for (let row = 0; row < height; row += 1) {
      for (let col = 0; col < width; col += 1) {
        const index = row * width + col;
        const type = map.types[row]?.[col];
        if (!type || !isWaterTerrain(type)) continue;
        waterTiles += 1;
        const elev = elevation[index] ?? 1;
        const run = runoff[index] ?? 0;
        if (run >= 0.55) {
          highRunoffWater += 1;
        }
        if (elev > 0.48 && run < 0.4) {
          mismatched += 1;
        }
      }
    }

    expect(waterTiles).toBeGreaterThan(0);
    expect(highRunoffWater / waterTiles).toBeGreaterThan(0.7);
    expect(mismatched / waterTiles).toBeLessThan(0.12);
  });

  it('limits isolated surface water cells and keeps coastlines connected', () => {
    const { map } = buildWorld();
    const width = map.width;
    const height = map.height;

    let isolated = 0;
    const coastline = new Set<number>();

    for (let row = 0; row < height; row += 1) {
      for (let col = 0; col < width; col += 1) {
        const type = map.types[row]?.[col];
        if (!type) continue;
        if (isWaterTerrain(type)) {
          let neighbors = 0;
          for (const [dx, dy] of EIGHT_NEIGHBORS) {
            const nx = col + dx;
            const ny = row + dy;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
            const neighborType = map.types[ny]?.[nx];
            if (neighborType && isWaterTerrain(neighborType)) {
              neighbors += 1;
              break;
            }
          }
          if (neighbors === 0) {
            isolated += 1;
          }
        } else {
          const touchesWater = EIGHT_NEIGHBORS.some(([dx, dy]) => {
            const nx = col + dx;
            const ny = row + dy;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) return false;
            const neighborType = map.types[ny]?.[nx];
            return neighborType ? isWaterTerrain(neighborType) : false;
          });
          if (touchesWater) {
            coastline.add(row * width + col);
          }
        }
      }
    }

    const isolatedRatio = isolated / (width * height);
    expect(isolatedRatio).toBeLessThan(0.2);
    expect(coastline.size).toBeGreaterThan(0);

    const visited = new Set<number>();
    let largest = 0;
    for (const tile of coastline) {
      if (visited.has(tile)) continue;
      const queue = [tile];
      visited.add(tile);
      let size = 0;
      while (queue.length) {
        const current = queue.shift()!;
        size += 1;
        const row = Math.trunc(current / width);
        const col = current % width;
        for (const [dx, dy] of EIGHT_NEIGHBORS) {
          const nx = col + dx;
          const ny = row + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const key = ny * width + nx;
          if (!coastline.has(key) || visited.has(key)) continue;
          visited.add(key);
          queue.push(key);
        }
      }
      largest = Math.max(largest, size);
    }

    expect(largest / coastline.size).toBeGreaterThan(0.2);
  });

  it('suggests a viable spawn point on solid ground with strong resources', () => {
    const { map } = buildWorld();
    expect(map.spawnSuggestion).toBeTruthy();

    const suggestion = map.spawnSuggestion!;
    expect(Number.isFinite(suggestion.x)).toBe(true);
    expect(Number.isFinite(suggestion.y)).toBe(true);

    const spawnType = (() => {
      const col = suggestion.x - map.xStart;
      const row = suggestion.y - map.yStart;
      return map.types[row]?.[col] ?? null;
    })();
    expect(spawnType && !isWaterTerrain(spawnType)).toBe(true);

    const computed = computeDefaultSpawn(map);
    expect(computed).toEqual(suggestion);
  });
});
