import { describe, expect, it } from 'vitest';
import { generateWorld } from '../src/world/generate';
import { adaptWorldToMapData, fallbackCanonicalSeed } from '../src/world/mapAdapter.js';

const STONE_NEIGHBORS = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1]
];

describe('ore embedding', () => {
  function generateOreRichMap() {
    const seedInfo = fallbackCanonicalSeed('ore-embedded-test');
    const world = generateWorld({ width: 80, height: 80, seed: seedInfo });
    return adaptWorldToMapData(world, {
      seedInfo,
      seedString: seedInfo.raw,
      season: 'Sunheight'
    });
  }

  function getOreRichTiles(map: ReturnType<typeof generateOreRichMap>, count = 24) {
    const tiles: Array<{ x: number; y: number; ore: number }> = [];
    for (let y = 0; y < map.types.length; y += 1) {
      for (let x = 0; x < map.types[y].length; x += 1) {
        const tile = map.tileMatrix?.[y]?.[x];
        if (!tile) continue;
        tiles.push({ x, y, ore: tile.resources?.ore ?? 0 });
      }
    }
    tiles.sort((a, b) => b.ore - a.ore);
    return tiles.slice(0, Math.max(1, Math.min(count, tiles.length)));
  }

  it('classifies ore-rich tiles as ore or stone', () => {
    const map = generateOreRichMap();
    const candidates = getOreRichTiles(map);
    expect(candidates.length).toBeGreaterThan(0);

    for (const { x, y, ore } of candidates) {
      expect(ore).toBeGreaterThan(0.55);
      const type = map.types[y]?.[x];
      expect(['ore', 'stone']).toContain(type);
    }
  });

  it('surrounds ore-rich hotspots with adjacent stone', () => {
    const map = generateOreRichMap();
    const candidates = getOreRichTiles(map);
    expect(candidates.length).toBeGreaterThan(0);

    for (const { x, y } of candidates) {
      const hasStoneNeighbor = STONE_NEIGHBORS.some(([dx, dy]) => {
        const nx = x + dx;
        const ny = y + dy;
        if (ny < 0 || ny >= map.types.length) return false;
        if (nx < 0 || nx >= map.types[ny].length) return false;
        const type = map.types[ny]?.[nx];
        return type === 'stone' || type === 'ore';
      });
      expect(hasStoneNeighbor).toBe(true);
    }
  });
});
