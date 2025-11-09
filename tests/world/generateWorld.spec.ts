import { describe, expect, it } from 'vitest';

import { generateWorld } from '../../src/world/generate';
import type { CanonicalSeed } from '../../src/world/seed.js';

describe('generateWorld', () => {
  const seed: CanonicalSeed = {
    raw: 'test-seed',
    normalized: 'test-seed',
    hex: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    lanes: [
      0x12345678,
      0x9abcdef0,
      0x0fedcba9,
      0x87654321,
      0x13579bdf,
      0xfdb97531,
      0x2468ace0,
      0x0ace2468,
    ],
  };

  it('produces typed layers and frozen tile objects with biome and resource data', () => {
    const result = generateWorld({ width: 12, height: 8, seed });

    expect(result.dimensions).toEqual({ width: 12, height: 8, size: 96 });
    expect(Object.isFrozen(result.dimensions)).toBe(true);

    expect(result.layers.elevation).toBeInstanceOf(Float32Array);
    expect(result.layers.temperature).toBeInstanceOf(Float32Array);
    expect(result.layers.moisture).toBeInstanceOf(Float32Array);
    expect(result.layers.runoff).toBeInstanceOf(Float32Array);
    expect(result.layers.elevation).toHaveLength(96);
    expect(result.layers.temperature).toHaveLength(96);
    expect(result.layers.moisture).toHaveLength(96);
    expect(result.layers.runoff).toHaveLength(96);
    expect(Object.isFrozen(result.layers)).toBe(true);

    expect(result.tiles).toHaveLength(96);
    expect(Object.isFrozen(result.tiles)).toBe(true);

    for (const tile of result.tiles) {
      expect(tile.elevation).toBeCloseTo(result.layers.elevation[tile.index], 5);
      expect(tile.temperature).toBeCloseTo(result.layers.temperature[tile.index], 5);
      expect(tile.moisture).toBeCloseTo(result.layers.moisture[tile.index], 5);
      expect(tile.runoff).toBeCloseTo(result.layers.runoff[tile.index], 5);

      expect(tile.climate.temperature).toMatch(/frigid|cold|cool|mild|warm|hot/);
      expect(tile.climate.moisture).toMatch(/arid|semi-arid|moderate|humid|wet/);
      expect(tile.climate.runoff).toMatch(/minimal|seasonal|perennial/);

      expect(tile.biome.id).toBeTypeOf('string');
      expect(tile.biome.score).toBeGreaterThanOrEqual(0);
      expect(tile.biome.score).toBeLessThanOrEqual(1);
      expect(tile.resources.vegetation).toBeGreaterThanOrEqual(0);
      expect(tile.resources.vegetation).toBeLessThanOrEqual(1);
      expect(tile.resources.wood).toBeGreaterThanOrEqual(0);
      expect(tile.resources.wood).toBeLessThanOrEqual(1);
      expect(tile.resources.forage).toBeGreaterThanOrEqual(0);
      expect(tile.resources.forage).toBeLessThanOrEqual(1);
      expect(tile.resources.ore).toBeGreaterThanOrEqual(0);
      expect(tile.resources.ore).toBeLessThanOrEqual(1);
      expect(tile.resources.freshWater).toBeGreaterThanOrEqual(0);
      expect(tile.resources.freshWater).toBeLessThanOrEqual(1);
      expect(tile.resources.fertility).toBeGreaterThanOrEqual(0);
      expect(tile.resources.fertility).toBeLessThanOrEqual(1);

      expect(Object.isFrozen(tile)).toBe(true);
      expect(Object.isFrozen(tile.resources)).toBe(true);
      expect(Object.isFrozen(tile.climate)).toBe(true);
    }
  });
});
