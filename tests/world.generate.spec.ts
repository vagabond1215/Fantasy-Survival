import { describe, expect, it } from 'vitest';

import { generateWorld } from '../src/world/generate';
import type { CanonicalSeed } from '../src/world/seed.js';

describe('world.generate', () => {
  const seed: CanonicalSeed = {
    raw: 'deterministic-seed',
    normalized: 'deterministic-seed',
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

  const width = 24;
  const height = 16;
  const size = width * height;

  it('produces deterministic layers, tiles, and spawn suggestions', async () => {
    const [first, second] = await Promise.all([
      generateWorld({ width, height, seed }),
      generateWorld({ width, height, seed }),
    ]);

    expect(first.dimensions).toEqual({ width, height, size });
    expect(second.dimensions).toEqual(first.dimensions);
    expect(first.tiles).toHaveLength(size);
    expect(second.tiles).toEqual(first.tiles);

    const { layers: firstLayers } = first;
    const { layers: secondLayers } = second;

    expect(firstLayers.elevation).toBeInstanceOf(Float32Array);
    expect(firstLayers.temperature).toBeInstanceOf(Float32Array);
    expect(firstLayers.moisture).toBeInstanceOf(Float32Array);
    expect(firstLayers.runoff).toBeInstanceOf(Float32Array);
    expect(firstLayers.biome).toBeInstanceOf(Uint8Array);
    expect(firstLayers.ore).toBeInstanceOf(Float32Array);
    expect(firstLayers.stone).toBeInstanceOf(Float32Array);
    expect(firstLayers.water).toBeInstanceOf(Float32Array);
    expect(firstLayers.fertility).toBeInstanceOf(Float32Array);

    expect(firstLayers.elevation).toHaveLength(size);
    expect(firstLayers.temperature).toHaveLength(size);
    expect(firstLayers.moisture).toHaveLength(size);
    expect(firstLayers.runoff).toHaveLength(size);
    expect(firstLayers.biome).toHaveLength(size);
    expect(firstLayers.ore).toHaveLength(size);
    expect(firstLayers.stone).toHaveLength(size);
    expect(firstLayers.water).toHaveLength(size);
    expect(firstLayers.fertility).toHaveLength(size);

    expect(Array.from(firstLayers.elevation)).toEqual(Array.from(secondLayers.elevation));
    expect(Array.from(firstLayers.temperature)).toEqual(Array.from(secondLayers.temperature));
    expect(Array.from(firstLayers.moisture)).toEqual(Array.from(secondLayers.moisture));
    expect(Array.from(firstLayers.runoff)).toEqual(Array.from(secondLayers.runoff));
    expect(Array.from(firstLayers.biome)).toEqual(Array.from(secondLayers.biome));
    expect(Array.from(firstLayers.ore)).toEqual(Array.from(secondLayers.ore));
    expect(Array.from(firstLayers.stone)).toEqual(Array.from(secondLayers.stone));
    expect(Array.from(firstLayers.water)).toEqual(Array.from(secondLayers.water));
    expect(Array.from(firstLayers.fertility)).toEqual(Array.from(secondLayers.fertility));

    for (let i = 0; i < size; i += 1) {
      const elev = firstLayers.elevation[i];
      const temp = firstLayers.temperature[i];
      const moist = firstLayers.moisture[i];
      const run = firstLayers.runoff[i];
      const biome = firstLayers.biome[i];
      const ore = firstLayers.ore[i];
      const stone = firstLayers.stone[i];
      const water = firstLayers.water[i];
      const fertility = firstLayers.fertility[i];

      expect(elev).toBeGreaterThanOrEqual(0);
      expect(elev).toBeLessThanOrEqual(1);
      expect(temp).toBeGreaterThanOrEqual(0);
      expect(temp).toBeLessThanOrEqual(1);
      expect(moist).toBeGreaterThanOrEqual(0);
      expect(moist).toBeLessThanOrEqual(1);
      expect(run).toBeGreaterThanOrEqual(0);
      expect(run).toBeLessThanOrEqual(1);
      expect(biome).toBeGreaterThanOrEqual(0);
      expect(biome).toBeLessThanOrEqual(11);
      expect(ore).toBeGreaterThanOrEqual(0);
      expect(ore).toBeLessThanOrEqual(1);
      expect(stone).toBeGreaterThanOrEqual(0);
      expect(stone).toBeLessThanOrEqual(1);
      expect(water).toBeGreaterThanOrEqual(0);
      expect(water).toBeLessThanOrEqual(1);
      expect(fertility).toBeGreaterThanOrEqual(0);
      expect(fertility).toBeLessThanOrEqual(1);
    }

    const spawnSuggestions = first.spawnSuggestions;
    expect(spawnSuggestions).toBeInstanceOf(Uint32Array);
    expect(spawnSuggestions).toHaveLength(first.params.spawnSuggestionCount);
    expect(spawnSuggestions).toEqual(second.spawnSuggestions);
    expect(first.params.spawnSuggestionCount).toBeGreaterThanOrEqual(8);
    expect(first.params.spawnSuggestionCount).toBeLessThanOrEqual(size);

    const uniqueSuggestions = new Set(spawnSuggestions);
    expect(uniqueSuggestions.size).toBe(spawnSuggestions.length);
    for (const suggestion of spawnSuggestions) {
      expect(suggestion).toBeGreaterThanOrEqual(0);
      expect(suggestion).toBeLessThan(size);
    }

    for (let i = 0; i < first.tiles.length; i += 1) {
      const tile = first.tiles[i];
      expect(tile.index).toBe(i);
      expect(tile.x).toBe(i % width);
      expect(tile.y).toBe(Math.trunc(i / width));
      expect(tile.elevation).toBeCloseTo(firstLayers.elevation[i], 5);
      expect(tile.temperature).toBeCloseTo(firstLayers.temperature[i], 5);
      expect(tile.moisture).toBeCloseTo(firstLayers.moisture[i], 5);
      expect(tile.runoff).toBeCloseTo(firstLayers.runoff[i], 5);
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
      expect(typeof tile.biome.id).toBe('string');
      expect(tile.biome.score).toBeGreaterThanOrEqual(0);
      expect(tile.biome.score).toBeLessThanOrEqual(1);
      expect(typeof tile.biome.reason).toBe('string');
      expect(tile.climate.temperature).toMatch(/frigid|cold|cool|mild|warm|hot/);
      expect(tile.climate.moisture).toMatch(/arid|semi-arid|moderate|humid|wet/);
      expect(tile.climate.runoff).toMatch(/minimal|seasonal|perennial/);
    }
  });
});
