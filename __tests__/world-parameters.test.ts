import { describe, expect, it, vi } from 'vitest';
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

  it('falls back to the default landmass type when an unknown type is provided', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = deriveLandmassModifiers({ mapType: 'unknown-type' });

    expect(result.landmassType).toBe('continent');
    expect(warnSpy).toHaveBeenCalledWith(
      'Unknown map type "unknown-type" supplied to deriveLandmassModifiers. Falling back to continent.'
    );

    warnSpy.mockRestore();
  });

  it('coerces non-string map types before resolving presets', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = deriveLandmassModifiers({ mapType: ['continent'] });

    expect(result.landmassType).toBe('continent');
    expect(warnSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
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
