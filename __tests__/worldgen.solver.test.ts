import { describe, expect, it, vi } from 'vitest';
import { buildWorld, habitatProfilesById } from '../src/worldgen';
import { difficultyToTargets } from '../src/worldgen/habitatProfiles';
import { findValidSpawn, validateStartingArea } from '../src/map.js';
import AdjustmentSolver from '../src/map/generation/adjustmentSolver.js';

type TerrainType = 'lake' | 'water' | 'river' | 'open' | 'ore';

type SpawnFixture = {
  solver: AdjustmentSolver;
  evaluate: ReturnType<typeof vi.fn>;
  regenerate: ReturnType<typeof vi.fn>;
  terrain: TerrainType[][];
  chunkRows: number;
  chunkColumns: number;
};

const WATER_TYPES = new Set(['lake', 'water', 'river']);

function isWaterTile(value: TerrainType | null | undefined): boolean {
  return value != null && WATER_TYPES.has(value);
}

function createSpawnFixture(): SpawnFixture {
  const width = 8;
  const height = 8;
  const chunkSize = 4;
  const chunkRows = Math.ceil(height / chunkSize);
  const chunkColumns = Math.ceil(width / chunkSize);
  const radius = 3;
  const thresholds = { minLand: 0.55, maxOre: 0.35 };
  const startX = -Math.floor(width / 2);
  const startY = -Math.floor(height / 2);

  const terrain: TerrainType[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => 'lake' as TerrainType)
  );

  for (let row = 4; row < height; row++) {
    for (let col = 0; col < 4; col++) {
      terrain[row][col] = 'open';
    }
  }
  terrain[5][1] = 'ore';

  const evaluate = vi.fn(({ parameters }: { parameters: Record<string, number> }) => {
    const xStart = Number.isFinite(parameters.xStart) ? parameters.xStart : startX;
    const yStart = Number.isFinite(parameters.yStart) ? parameters.yStart : startY;
    const validation = validateStartingArea(terrain, xStart, yStart, 0, 0, radius, thresholds);
    const originCol = -xStart;
    const originRow = -yStart;
    const inBounds = originCol >= 0 && originCol < width && originRow >= 0 && originRow < height;
    const cellType = inBounds ? terrain[originRow][originCol] : null;
    const water = isWaterTile(cellType);

    return {
      ...validation,
      satisfied: validation.meetsLand && validation.meetsOre && !water,
      origin: {
        col: originCol,
        row: originRow,
        inBounds,
        isWater: water
      },
      stats: validation.stats
    };
  });

  const regenerate = vi.fn(
    ({ parameters, metrics, context }: { parameters: Record<string, number>; metrics: any; context: any }) => {
      if (!metrics) return null;
      const solverInstance: AdjustmentSolver | undefined = context?.solver;
      const markOrigin = (col: number | undefined, row: number | undefined) => {
        if (!Number.isFinite(col) || !Number.isFinite(row)) return;
        solverInstance?.markTileDirty(col!, row!);
      };

      const xStart = Number.isFinite(parameters.xStart) ? parameters.xStart : startX;
      const yStart = Number.isFinite(parameters.yStart) ? parameters.yStart : startY;

      if (metrics.origin?.isWater) {
        let closest:
          | { worldX: number; worldY: number; distance: number; row: number; col: number }
          | null = null;

        for (let row = 0; row < height; row++) {
          for (let col = 0; col < width; col++) {
            const type = terrain[row][col];
            if (isWaterTile(type)) continue;
            const worldX = xStart + col;
            const worldY = yStart + row;
            const distance = Math.hypot(worldX, worldY);
            if (
              !closest ||
              distance < closest.distance - 1e-6 ||
              (Math.abs(distance - closest.distance) <= 1e-6 && (row < closest.row || (row === closest.row && col < closest.col)))
            ) {
              closest = { worldX, worldY, distance, row, col };
            }
          }
        }

        if (closest) {
          markOrigin(metrics.origin?.col, metrics.origin?.row);
          const next = {
            xStart: xStart - closest.worldX,
            yStart: yStart - closest.worldY,
            originShiftX: (parameters.originShiftX || 0) + closest.worldX,
            originShiftY: (parameters.originShiftY || 0) + closest.worldY
          };
          markOrigin(-next.xStart, -next.yStart);
          return { parameters: next, messages: ['moved to fixture land'] };
        }
      }

      if (!metrics.meetsLand || !metrics.meetsOre) {
        const fallback = findValidSpawn(terrain, xStart, yStart, radius, thresholds, { limit: 64 });
        if (fallback) {
          markOrigin(metrics.origin?.col, metrics.origin?.row);
          const next = {
            xStart: xStart - fallback.worldX,
            yStart: yStart - fallback.worldY,
            originShiftX: (parameters.originShiftX || 0) + fallback.worldX,
            originShiftY: (parameters.originShiftY || 0) + fallback.worldY
          };
          markOrigin(-next.xStart, -next.yStart);
          return { parameters: next, messages: ['balanced landing zone'] };
        }
      }

      return { stop: true };
    }
  );

  const solver = new AdjustmentSolver({
    parameters: {
      xStart: startX,
      yStart: startY,
      originShiftX: 0,
      originShiftY: 0
    },
    evaluate,
    regenerate,
    maxIterations: 6,
    chunkSize,
    chunkRows,
    chunkColumns,
    gridWidth: width,
    gridHeight: height
  });

  return { solver, evaluate, regenerate, terrain, chunkRows, chunkColumns };
}

describe('solver-driven world generation', () => {
  it.each([
    ['easy' as const],
    ['normal' as const],
    ['hard' as const]
  ])('keeps %s difficulty metrics within profile tolerances', difficulty => {
    const seed = `vitest-${difficulty}-seed`;
    const result = buildWorld({ difficulty, seed });
    const profile = difficultyToTargets[difficulty] ?? habitatProfilesById['balanced-frontier'];

    expect(result.difficulty).toBe(difficulty);
    expect(result.profile).toBe(profile);

    for (const objective of profile.objectives) {
      const value = result.metrics[objective.metric];
      expect(value).toBeTypeOf('number');
      const deviation = Math.abs(value - objective.target);
      // Allow a single step of slack to account for integer snapping within the solver.
      expect(deviation).toBeLessThanOrEqual((objective.tolerance ?? 0) + 1);
    }
  });

  it('preserves chunk seam integrity when the landing zone is relocated', () => {
    const { solver, evaluate, regenerate, chunkRows, chunkColumns } = createSpawnFixture();
    const result = solver.solve();

    expect(evaluate).toHaveBeenCalled();
    expect(regenerate).toHaveBeenCalled();

    expect(result.metrics?.meetsLand).toBe(true);
    expect(result.metrics?.meetsOre).toBe(true);
    expect(result.metrics?.origin?.isWater).toBe(false);
    expect(result.messages).toContain('moved to fixture land');
    expect(result.dirty.full).toBe(false);

    const seamChunks = result.dirty.chunks.map(chunk => `${chunk.row}:${chunk.column}`).sort();
    expect(seamChunks).toEqual(['1:0', '1:1']);

    for (const chunk of result.dirty.chunks) {
      expect(chunk.row).toBeGreaterThanOrEqual(0);
      expect(chunk.column).toBeGreaterThanOrEqual(0);
      expect(chunk.row).toBeLessThan(chunkRows);
      expect(chunk.column).toBeLessThan(chunkColumns);
    }
  });
});
