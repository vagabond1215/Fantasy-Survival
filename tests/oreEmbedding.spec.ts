import { describe, expect, it } from 'vitest';
import { generateColorMap } from '../src/map.js';

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
    return generateColorMap(
      'temperate-maritime',
      'ore-embedded-test',
      null,
      null,
      80,
      80,
      'Sunheight',
      undefined,
      null,
      {
        oreDensity: 92,
        mountains: 55,
        advanced: { oreThresholdOffset: 88, oreNoiseScale: 64 }
      },
      true
    );
  }

  it('lays ore only on top of stone substrate', () => {
    const map = generateOreRichMap();
    expect(Array.isArray(map.substrateTypes)).toBe(true);

    let oreCount = 0;
    for (let y = 0; y < map.types.length; y += 1) {
      for (let x = 0; x < map.types[y].length; x += 1) {
        if (map.types[y][x] === 'ore') {
          oreCount += 1;
          expect(map.substrateTypes?.[y]?.[x]).toBe('stone');
        }
      }
    }

    expect(oreCount).toBeGreaterThan(0);
  });

  it('surrounds ore deposits with adjacent stone tiles', () => {
    const map = generateOreRichMap();
    let oreCount = 0;

    for (let y = 0; y < map.types.length; y += 1) {
      for (let x = 0; x < map.types[y].length; x += 1) {
        if (map.types[y][x] !== 'ore') continue;
        oreCount += 1;
        const hasStoneNeighbor = STONE_NEIGHBORS.some(([dx, dy]) => {
          const nx = x + dx;
          const ny = y + dy;
          if (ny < 0 || ny >= map.types.length) return false;
          if (nx < 0 || nx >= map.types[ny].length) return false;
          return map.types[ny][nx] === 'stone';
        });
        expect(hasStoneNeighbor).toBe(true);
      }
    }

    expect(oreCount).toBeGreaterThan(0);
  });
});
