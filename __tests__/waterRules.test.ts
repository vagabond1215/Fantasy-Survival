import { describe, expect, it } from 'vitest';
import { resolveWaterRules } from '../src/map/generation/waterRules.js';
import { generateHydrology } from '../src/map/generation/hydrology.js';

type WorldConfig = {
  rainfall?: number;
  waterTable?: number;
  mountains?: number;
  rivers100?: number;
  lakes100?: number;
  streams100?: number;
  ponds100?: number;
  marshSwamp?: number;
  bogFen?: number;
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
  streams100: 42,
  ponds100: 30,
  marshSwamp: 28,
  bogFen: 24,
  advanced: { waterFlowMultiplier: 50 }
};

describe('resolveWaterRules mapType tuning', () => {
  it('raises sea level and reduces river thresholds for island maps', () => {
    const continent = resolveWaterRules(baseBiome, { ...baseWorld, mapType: 'continent' }, 64, 64);
    const island = resolveWaterRules(baseBiome, { ...baseWorld, mapType: 'island' }, 64, 64);

    expect(island.seaLevel).toBeGreaterThan(continent.seaLevel);
    expect(island.riverFlowThreshold).toBeLessThanOrEqual(continent.riverFlowThreshold);
    expect(island.lakeMinArea).toBeLessThanOrEqual(continent.lakeMinArea);
    expect(island.estuaryRadius).toBeLessThanOrEqual(continent.estuaryRadius);
  });

  it('produces wetter inland hydrology than archipelagos', () => {
    const inland = resolveWaterRules(baseBiome, { ...baseWorld, mapType: 'inland' }, 64, 64);
    const archipelago = resolveWaterRules(baseBiome, { ...baseWorld, mapType: 'archipelago' }, 64, 64);

    expect(inland.seaLevel).toBeLessThan(archipelago.seaLevel);
    expect(inland.marshiness).toBeGreaterThanOrEqual(archipelago.marshiness);
    expect(inland.mouthExpansionThreshold).toBeGreaterThan(archipelago.mouthExpansionThreshold);
    expect(inland.distributaryMax).toBeGreaterThanOrEqual(inland.distributaryMin);
    expect(archipelago.distributaryMax).toBeGreaterThanOrEqual(archipelago.distributaryMin);
  });

  it('responds to freshwater slider adjustments', () => {
    const aridFresh = resolveWaterRules(
      baseBiome,
      {
        ...baseWorld,
        streams100: 22,
        ponds100: 18,
        marshSwamp: 16,
        bogFen: 14
      },
      64,
      64
    );
    const lushFresh = resolveWaterRules(
      baseBiome,
      {
        ...baseWorld,
        streams100: 72,
        ponds100: 62,
        marshSwamp: 68,
        bogFen: 60
      },
      64,
      64
    );

    expect(lushFresh.streamFlowThreshold).toBeLessThan(aridFresh.streamFlowThreshold);
    expect(lushFresh.maxSingletonFraction).toBeGreaterThan(aridFresh.maxSingletonFraction);
    expect(lushFresh.marshiness).toBeGreaterThan(aridFresh.marshiness);
    expect(lushFresh.peatlandPreference).toBeGreaterThan(aridFresh.peatlandPreference);
    const lushPeat = (lushFresh.wetlandWeights?.bog ?? 0) + (lushFresh.wetlandWeights?.fen ?? 0);
    const aridPeat = (aridFresh.wetlandWeights?.bog ?? 0) + (aridFresh.wetlandWeights?.fen ?? 0);
    expect(lushPeat).toBeGreaterThan(aridPeat);
  });
});

describe('generateHydrology integrates mapType tuned rules', () => {
  const width = 16;
  const height = 16;
  const flatElevations = Array.from({ length: height }, () => Array(width).fill(0.35));
  const gradientElevations = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => (x + y) / (width + height - 2))
  );

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
    expect(archipelagoHydro.rules.seaLevel).not.toBe(continentHydro.rules.seaLevel);
    expect(archipelagoHydro.rules.estuaryRadius).not.toBe(continentHydro.rules.estuaryRadius);
  });

  it('converges toward map-type aware coverage targets', () => {
    const archipelagoHydro = generateHydrology({
      seed: 7,
      width,
      height,
      elevations: gradientElevations,
      biome: baseBiome,
      world: { ...baseWorld, mapType: 'archipelago', minOceanFraction: 0.08 }
    });

    const inlandHydro = generateHydrology({
      seed: 7,
      width,
      height,
      elevations: gradientElevations,
      biome: baseBiome,
      world: { ...baseWorld, mapType: 'inland', minOceanFraction: 0.02 }
    });

    expect(archipelagoHydro.waterCoverageTarget).toBeGreaterThan(inlandHydro.waterCoverageTarget);
    expect(archipelagoHydro.waterCoverage).toBeGreaterThan(inlandHydro.waterCoverage);
    expect(Math.abs(archipelagoHydro.waterCoverage - archipelagoHydro.waterCoverageTarget)).toBeLessThanOrEqual(0.08);
    expect(Math.abs(inlandHydro.waterCoverage - inlandHydro.waterCoverageTarget)).toBeLessThanOrEqual(0.08);
  });
});
