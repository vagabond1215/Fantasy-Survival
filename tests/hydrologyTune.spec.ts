import { describe, expect, it } from 'vitest';

describe('hydrology tuning tool', () => {
  it('produces hydrology metrics for requested scenarios', async () => {
    const { analyzeHydrology } = await import('../scripts/hydrology-tune.mjs');
    const result = await analyzeHydrology({
      mapTypes: ['continent'],
      worldIds: ['normal'],
      width: 24,
      height: 24,
      seed: 'spec-hydrology',
      biomeId: 'temperate-deciduous'
    });

    expect(result).toBeTruthy();
    expect(result.scenarios.length).toBeGreaterThan(0);

    for (const scenario of result.scenarios) {
      expect(typeof scenario.mapType).toBe('string');
      expect(typeof scenario.worldId).toBe('string');
      expect(scenario.metrics).toMatchObject({
        waterCoverage: expect.any(Number),
        surfaceWaterCoverage: expect.any(Number),
        waterCellFraction: expect.any(Number),
        lakeCount: expect.any(Number),
        riverCellFraction: expect.any(Number)
      });
      expect(scenario.metrics.waterCellFraction).toBeGreaterThanOrEqual(0);
      expect(scenario.metrics.waterCellFraction).toBeLessThanOrEqual(1);
      expect(Array.isArray(scenario.metrics.adjustmentHistory)).toBe(true);
    }
  });
});
