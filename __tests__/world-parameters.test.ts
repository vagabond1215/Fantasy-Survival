import { describe, expect, it } from 'vitest';
import { deriveElevationOptions, deriveLandmassModifiers } from '../src/map.js';

const mockBiome = {
  id: 'test-biome',
  elevation: {
    base: 0.5,
    variance: 0.5,
    scale: 50
  }
};

describe('world parameter transforms', () => {
  it('adjusts landmass mask and water targets based on island slider', () => {
    const minimalIslands = deriveLandmassModifiers({ mapIslands: 0, mapType: 'continent' });
    const abundantIslands = deriveLandmassModifiers({ mapIslands: 100, mapType: 'continent' });

    expect(abundantIslands.maskStrength).toBeGreaterThan(minimalIslands.maskStrength);
    expect(abundantIslands.waterCoverageTarget).toBeGreaterThan(minimalIslands.waterCoverageTarget);
    expect(abundantIslands.openLandBias).toBeLessThan(minimalIslands.openLandBias);
  });

  it('raises or lowers elevation profile when sliders change', () => {
    const lowProfile = deriveElevationOptions(mockBiome, {
      mapElevationMax: 0,
      mapElevationVariance: 0
    });
    const highProfile = deriveElevationOptions(mockBiome, {
      mapElevationMax: 100,
      mapElevationVariance: 100
    });

    expect(highProfile.base).toBeGreaterThan(lowProfile.base);
    expect(highProfile.variance).toBeGreaterThan(lowProfile.variance);
    expect(highProfile.scale).toBeLessThan(lowProfile.scale);
  });
});
