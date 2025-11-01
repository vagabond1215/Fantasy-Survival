import { describe, expect, it } from 'vitest';
import { resolveWaterRules } from '../src/map/generation/waterRules.js';
import { generateHydrology } from '../src/map/generation/hydrology.js';

type WorldConfig = {
  rainfall?: number;
  waterTable?: number;
  mountains?: number;
  rivers100?: number;
  lakes100?: number;
  mapType?: string;
  advanced?: { waterFlowMultiplier?: number };
  waterCoverageTarget?: number;
  minOceanFraction?: number;
};

const baseBiome = {
  id: 'temperate-forest',
  features: ['forest'],
  elevation: { waterLevel: 0.3 }
};

const baseWorld: WorldConfig = {
  rainfall: 55,
  waterTable: 52,
  mountains: 48,
  rivers100: 45,
  lakes100: 37,
  advanced: { waterFlowMultiplier: 50 }
};

describe('resolveWaterRules mapType tuning', () => {
  it('raises sea level and reduces river thresholds for island maps', () => {
    const continent = resolveWaterRules(baseBiome, { ...baseWorld, mapType: 'continent' }, 64, 64);
    const island = resolveWaterRules(baseBiome, { ...baseWorld, mapType: 'island' }, 64, 64);

    expect(island.seaLevel).toBeGreaterThan(continent.seaLevel);
    expect(island.riverFlowThreshold).toBeLessThanOrEqual(continent.riverFlowThreshold);
    expect(island.lakeMinArea).toBeLessThan(continent.lakeMinArea);
    expect(island.estuaryRadius).toBeLessThanOrEqual(continent.estuaryRadius);
  });

  it('produces wetter inland hydrology than archipelagos', () => {
    const inland = resolveWaterRules(baseBiome, { ...baseWorld, mapType: 'inland' }, 64, 64);
    const archipelago = resolveWaterRules(baseBiome, { ...baseWorld, mapType: 'archipelago' }, 64, 64);

    expect(inland.seaLevel).toBeLessThan(archipelago.seaLevel);
    expect(inland.marshiness).toBeGreaterThan(archipelago.marshiness);
    expect(inland.mouthExpansionThreshold).toBeGreaterThan(archipelago.mouthExpansionThreshold);
    expect(inland.distributaryMax).toBeGreaterThanOrEqual(inland.distributaryMin);
    expect(archipelago.distributaryMax).toBeGreaterThanOrEqual(archipelago.distributaryMin);
  });
});

describe('generateHydrology integrates mapType tuned rules', () => {
  const width = 16;
  const height = 16;
  const flatElevations = Array.from({ length: height }, () => Array(width).fill(0.35));

  function buildWorld(mapType: string): WorldConfig {
    return {
      ...baseWorld,
      mapType,
      waterCoverageTarget: 0.35,
      minOceanFraction: 0.05
    };
  }

  it('passes map type through to the resolved rules', () => {
    const archipelagoRules = resolveWaterRules(baseBiome, buildWorld('archipelago'), width, height);
    const continentRules = resolveWaterRules(baseBiome, buildWorld('continent'), width, height);

    const archipelagoHydro = generateHydrology({
      seed: 42,
      width,
      height,
      elevations: flatElevations,
      biome: baseBiome,
      world: buildWorld('archipelago')
    });

    const continentHydro = generateHydrology({
      seed: 42,
      width,
      height,
      elevations: flatElevations,
      biome: baseBiome,
      world: buildWorld('continent')
    });

    expect(archipelagoHydro.rules.lakeMinArea).toBe(archipelagoRules.lakeMinArea);
    expect(continentHydro.rules.lakeMinArea).toBe(continentRules.lakeMinArea);
    expect(archipelagoHydro.rules.lakeMinArea).not.toBe(continentHydro.rules.lakeMinArea);
    expect(archipelagoHydro.rules.estuaryRadius).not.toBe(continentHydro.rules.estuaryRadius);
  });
});
