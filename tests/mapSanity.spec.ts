import { describe, expect, it } from 'vitest';
import {
  applySanityChecks,
  findValidSpawn,
  validateStartingArea,
  TERRAIN_SYMBOLS
} from '../src/map.js';

function buildContext(
  terrain,
  startX = -Math.floor(terrain[0].length / 2),
  startY = -Math.floor(terrain.length / 2)
) {
  const terrainCopy = terrain.map(row => row.slice());
  const tiles = terrainCopy.map(row => row.map(cell => TERRAIN_SYMBOLS[cell] || '?'));
  return {
    terrainTypes: terrainCopy,
    tiles,
    effectiveXStart: startX,
    effectiveYStart: startY,
    originShiftX: 0,
    originShiftY: 0
  };
}

describe('findValidSpawn', () => {
  it('returns the nearest spawn candidate that meets thresholds', () => {
    const grid = Array.from({ length: 9 }, () => Array(9).fill('water'));
    // Carve a land cluster away from the origin.
    for (let row = 3; row <= 6; row++) {
      for (let col = 4; col <= 7; col++) {
        grid[row][col] = 'open';
      }
    }
    // Add an ore tile to ensure ore ratio is evaluated.
    grid[5][5] = 'ore';

    const startX = -4;
    const startY = -4;
    const result = findValidSpawn(grid, startX, startY, 3, { minLand: 0.5, maxOre: 0.4 });
    expect(result).toBeTruthy();
    expect(result?.worldX ?? 0).toBeGreaterThan(0);
    expect(Math.abs(result?.worldY ?? 0)).toBeLessThanOrEqual(2);
    expect(Math.hypot(result!.worldX, result!.worldY)).toBeGreaterThan(0);
    expect(result?.validation?.meetsLand).toBe(true);
    expect(result?.validation?.meetsOre).toBe(true);
  });
});

describe('applySanityChecks', () => {
  it('raises land ratio to at least 50% within the radius', () => {
    const terrain = Array.from({ length: 7 }, () => Array(7).fill('water'));
    // Sparse land initially keeps land ratio below threshold.
    [[3, 3], [3, 2], [2, 3]].forEach(([col, row]) => {
      terrain[row][col] = 'open';
    });
    const context = buildContext(terrain, -3, -3);

    const result = applySanityChecks(context, { radius: 3, seed: 'land-test' });
    expect(result.adjustments.length).toBeGreaterThan(0);

    const validation = validateStartingArea(
      context.terrainTypes,
      context.effectiveXStart,
      context.effectiveYStart,
      0,
      0,
      3,
      { minLand: 0.5, maxOre: 0.4 }
    );
    expect(validation.landRatio).toBeGreaterThanOrEqual(0.5);
    expect(validation.meetsLand).toBe(true);
  });

  it('reduces ore saturation to 40% or below of usable land', () => {
    const terrain = Array.from({ length: 7 }, () => Array(7).fill('open'));
    // Pack the center with ore to exceed the threshold.
    const oreCells = [
      [3, 3],
      [3, 2],
      [2, 3],
      [4, 3],
      [3, 4],
      [2, 2],
      [4, 2],
      [2, 4],
      [4, 4]
    ];
    oreCells.forEach(([col, row]) => {
      terrain[row][col] = 'ore';
    });

    const context = buildContext(terrain, -3, -3);
    const result = applySanityChecks(context, { radius: 3, seed: 'ore-test' });
    expect(result.adjustments.length).toBeGreaterThan(0);

    const validation = validateStartingArea(
      context.terrainTypes,
      context.effectiveXStart,
      context.effectiveYStart,
      0,
      0,
      3,
      { minLand: 0.5, maxOre: 0.4 }
    );
    expect(validation.oreRatio).toBeLessThanOrEqual(0.4);
    expect(validation.meetsOre).toBe(true);
  });
});
