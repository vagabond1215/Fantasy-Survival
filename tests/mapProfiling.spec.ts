import { afterEach, describe, expect, it, vi } from 'vitest';

import { generateColorMap } from '../src/map.js';

const ORIGINAL_DEBUG_ENV = process.env.FS_DEBUG_MAP_PROFILING;

afterEach(() => {
  vi.restoreAllMocks();
  if (ORIGINAL_DEBUG_ENV === undefined) {
    delete process.env.FS_DEBUG_MAP_PROFILING;
  } else {
    process.env.FS_DEBUG_MAP_PROFILING = ORIGINAL_DEBUG_ENV;
  }
  delete globalThis.__FS_DEBUG_MAP_PROFILING__;
  delete globalThis.__FS_MAP_PROFILING__;
  if (globalThis.__FS_DEBUG && typeof globalThis.__FS_DEBUG === 'object') {
    delete globalThis.__FS_DEBUG.mapProfiling;
  }
});

describe('map generation profiling instrumentation', () => {
  it('is disabled by default', () => {
    delete process.env.FS_DEBUG_MAP_PROFILING;
    const result = generateColorMap('temperate-broadleaf', 42, null, null, 4, 4);
    expect(result.profiling).toBeUndefined();
  });

  it('records timing information when the debug flag is enabled', () => {
    process.env.FS_DEBUG_MAP_PROFILING = '1';
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    const result = generateColorMap('temperate-broadleaf', 101, null, null, 4, 4);
    expect(result.profiling).toBeDefined();
    const { profiling } = result;
    expect(profiling?.steps?.createElevationSampler).toBeGreaterThanOrEqual(0);
    expect(profiling?.steps?.generateHydrology).toBeGreaterThanOrEqual(0);
    expect(profiling?.steps?.applyMangroveZones).toBeGreaterThanOrEqual(0);

    const totalSteps =
      (profiling?.steps?.createElevationSampler ?? 0) +
      (profiling?.steps?.generateHydrology ?? 0) +
      (profiling?.steps?.applyMangroveZones ?? 0);
    expect(profiling?.total ?? 0).toBeGreaterThanOrEqual(totalSteps - 1);

    expect(infoSpy).toHaveBeenCalledWith(
      'generateColorMap profiling',
      expect.objectContaining({
        total: expect.any(Number),
        steps: expect.objectContaining({
          createElevationSampler: expect.any(Number),
          generateHydrology: expect.any(Number),
          applyMangroveZones: expect.any(Number)
        })
      })
    );
  });
});
