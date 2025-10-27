import { describe, expect, it } from 'vitest';
import { findValidSpawn, validateStartingArea } from '../src/map.js';
import AdjustmentSolver from '../src/map/generation/adjustmentSolver.js';

function createSolverForTerrain(
  terrain: string[][],
  radius = 3,
  thresholds = { minLand: 0.5, maxOre: 0.4 }
) {
  const height = terrain.length;
  const width = terrain[0]?.length ?? 0;
  const chunkSize = 4;
  const chunkRows = Math.max(1, Math.ceil(height / chunkSize));
  const chunkColumns = Math.max(1, Math.ceil(width / chunkSize));
  const startX = -Math.floor(width / 2);
  const startY = -Math.floor(height / 2);

  return new AdjustmentSolver({
    parameters: {
      xStart: startX,
      yStart: startY,
      originShiftX: 0,
      originShiftY: 0
    },
    maxIterations: 5,
    chunkSize,
    chunkRows,
    chunkColumns,
    gridWidth: width,
    gridHeight: height,
    evaluate: ({ parameters }) => {
      const validation = validateStartingArea(
        terrain,
        parameters.xStart,
        parameters.yStart,
        0,
        0,
        radius,
        thresholds
      );
      const originCol = -parameters.xStart;
      const originRow = -parameters.yStart;
      const inBounds =
        originCol >= 0 && originCol < width && originRow >= 0 && originRow < height;
      const cellType = inBounds ? terrain[originRow][originCol] : null;
      const isWater = cellType === 'lake' || cellType === 'river' || cellType === 'water';
      return {
        ...validation,
        satisfied: validation.meetsLand && validation.meetsOre && !isWater,
        origin: {
          col: originCol,
          row: originRow,
          inBounds,
          isWater
        }
      };
    },
    regenerate: ({ parameters, metrics, context }) => {
      if (!metrics) return null;
      const solver = context?.solver as AdjustmentSolver | undefined;
      const markOrigin = (col: number, row: number) => {
        solver?.markTileDirty(col, row);
      };

      if (metrics.origin?.isWater) {
        let closest: { worldX: number; worldY: number; distance: number } | null = null;
        for (let row = 0; row < height; row++) {
          for (let col = 0; col < width; col++) {
            if (terrain[row][col] === 'lake') continue;
            const worldX = parameters.xStart + col;
            const worldY = parameters.yStart + row;
            const distance = Math.hypot(worldX, worldY);
            if (!closest || distance < closest.distance) {
              closest = { worldX, worldY, distance };
            }
          }
        }
        if (closest) {
          markOrigin(metrics.origin.col, metrics.origin.row);
          const next = {
            xStart: parameters.xStart - closest.worldX,
            yStart: parameters.yStart - closest.worldY,
            originShiftX: (parameters.originShiftX || 0) + closest.worldX,
            originShiftY: (parameters.originShiftY || 0) + closest.worldY
          };
          markOrigin(-next.xStart, -next.yStart);
          return { parameters: next, message: 'moved to land' };
        }
      }

      if (!metrics.meetsLand || !metrics.meetsOre) {
        const fallback = findValidSpawn(
          terrain,
          parameters.xStart,
          parameters.yStart,
          radius,
          thresholds,
          { limit: 200 }
        );
        if (fallback) {
          markOrigin(metrics.origin?.col ?? NaN, metrics.origin?.row ?? NaN);
          const next = {
            xStart: parameters.xStart - fallback.worldX,
            yStart: parameters.yStart - fallback.worldY,
            originShiftX: (parameters.originShiftX || 0) + fallback.worldX,
            originShiftY: (parameters.originShiftY || 0) + fallback.worldY
          };
          markOrigin(-next.xStart, -next.yStart);
          return { parameters: next, message: 'rebalanced landing zone' };
        }
      }

      return { stop: true };
    }
  });
}

describe('findValidSpawn', () => {
  it('returns the nearest spawn candidate that meets thresholds', () => {
    const grid = Array.from({ length: 9 }, () => Array(9).fill('lake'));
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

describe('AdjustmentSolver integration', () => {
  it('moves the origin out of water and tracks dirty chunks', () => {
    const terrain = Array.from({ length: 7 }, () => Array(7).fill('lake'));
    terrain[4][4] = 'open';
    terrain[4][5] = 'open';
    terrain[5][4] = 'open';

    const solver = createSolverForTerrain(terrain, 3);
    const result = solver.solve();
    expect(result.parameters.xStart).not.toBe(-3);
    expect(result.parameters.yStart).not.toBe(-3);
    expect(result.metrics?.origin?.isWater).toBe(false);
    expect(result.messages.length).toBeGreaterThan(0);
    expect(result.dirty.full).toBe(false);
    expect(result.dirty.chunks.length).toBeGreaterThan(0);
  });

  it('recenters to improve ore ratio when a better landing exists nearby', () => {
    const terrain = Array.from({ length: 7 }, () => Array(7).fill('ore'));
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
    // Provide a patch of balanced terrain away from the origin.
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        terrain[row][col] = 'open';
      }
    }

    const solver = createSolverForTerrain(terrain, 3);
    const result = solver.solve();
    expect(result.metrics?.meetsOre).toBe(true);
    expect(result.metrics?.meetsLand).toBe(true);
    expect(result.parameters.xStart).not.toBe(-3);
    expect(result.parameters.yStart).not.toBe(-3);
  });
});
