import { describe, expect, it } from 'vitest';

import { getBiome } from '../src/biomes.js';
import { generateHydrology } from '../src/map/generation/hydrology.js';
import { resolveHydrologyPreset } from '../src/map/generation/waterRules.js';

function buildRampElevations(width: number, height: number): number[][] {
  const grid: number[][] = [];
  const max = Math.max(1, width + height - 2);
  for (let y = 0; y < height; y += 1) {
    const row: number[] = [];
    for (let x = 0; x < width; x += 1) {
      row.push((x + y) / max);
    }
    grid.push(row);
  }
  return grid;
}

describe('hydrology mapType presets', () => {
  const width = 48;
  const height = 48;
  const elevations = buildRampElevations(width, height);
  const biome = getBiome('temperate-broadleaf');

  it('applies mapType-specific presets and coverage targets', () => {
    const archipelago = generateHydrology({
      width,
      height,
      elevations,
      biome,
      world: { mapType: 'archipelago' },
      seed: 'archipelago-hydrology',
    });

    const inland = generateHydrology({
      width,
      height,
      elevations,
      biome,
      world: { mapType: 'inland' },
      seed: 'inland-hydrology',
    });

    const archipelagoPreset = resolveHydrologyPreset('archipelago');
    const inlandPreset = resolveHydrologyPreset('inland');

    expect(archipelagoPreset).not.toEqual(inlandPreset);
    expect(archipelago.rules.seaLevel).toBeGreaterThan(inland.rules.seaLevel);
    expect(archipelago.waterCoverageTarget).toBeGreaterThan(inland.waterCoverageTarget);

    expect(archipelago.waterCoverage).toBeGreaterThan(inland.waterCoverage + 0.05);
    expect(archipelago.surfaceWaterCoverage).toBeGreaterThan(inland.surfaceWaterCoverage + 0.03);
  });
});
