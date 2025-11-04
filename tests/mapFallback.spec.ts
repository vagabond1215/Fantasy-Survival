import { describe, it, expect, vi, beforeEach } from 'vitest';

const notifySanityCheck = vi.fn();
const createElevationSamplerMock = vi.fn();
const generateHydrologyMock = vi.fn();
const applyMangroveZonesMock = vi.fn();

type MockHydrology = {
  seaLevel: number;
  types: string[][];
  waterTable: number[][];
  filledElevation: number[][];
  rules: { seaLevel: number };
};

vi.mock('../src/notifications.js', () => ({
  notifySanityCheck
}));

vi.mock('../src/map/generation/elevation.js', () => ({
  createElevationSampler: createElevationSamplerMock
}));

vi.mock('../src/map/generation/hydrology.js', () => ({
  generateHydrology: generateHydrologyMock
}));

vi.mock('../src/map/generation/vegetation.js', () => ({
  applyMangroveZones: applyMangroveZonesMock
}));

function createMockHydrology(width: number, height: number, seaLevel = 0.3): MockHydrology {
  const types = Array.from({ length: height }, () => Array(width).fill('land'));
  const water = Array.from({ length: height }, () => Array(width).fill(seaLevel + 0.1));
  return {
    seaLevel,
    types,
    waterTable: water.map(row => row.slice()),
    filledElevation: water.map(row => row.slice()),
    rules: { seaLevel }
  };
}

describe('generateColorMap fallback handling', () => {
  beforeEach(() => {
    vi.resetModules();
    notifySanityCheck.mockReset();
    createElevationSamplerMock.mockReset();
    generateHydrologyMock.mockReset();
    applyMangroveZonesMock.mockReset();

    createElevationSamplerMock.mockImplementation(() => ({
      sample: () => 0.42
    }));

    generateHydrologyMock.mockImplementation(({ width, height }: { width: number; height: number }) =>
      createMockHydrology(width, height)
    );

    applyMangroveZonesMock.mockReturnValue(null);
  });

  it('returns a simplified map and notifies when elevation sampling fails', async () => {
    createElevationSamplerMock.mockImplementation(() => ({
      sample: () => {
        throw new Error('elevation sample failure');
      }
    }));

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { generateColorMap } = await import('../src/map.js');

    try {
      const result = generateColorMap('temperate-deciduous', 123, null, null, 8, 8);
      expect(result.diagnostics?.fallback).toBe(true);
      expect(result.diagnostics?.error?.message).toBe('elevation sample failure');
      expect(result.solver.messages[0]).toMatch(/fallback/i);
      expect(notifySanityCheck).toHaveBeenCalledTimes(1);
      const [message, detail] = notifySanityCheck.mock.calls[0];
      expect(message).toMatch(/fallback terrain/i);
      expect(detail).toMatchObject({
        type: 'warning',
        error: 'elevation sample failure',
        inputs: expect.objectContaining({ width: 8, height: 8 })
      });
      expect(errorSpy).toHaveBeenCalled();
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('falls back when hydrology generation throws', async () => {
    generateHydrologyMock.mockImplementation(() => {
      throw new Error('hydrology breakdown');
    });

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { generateColorMap } = await import('../src/map.js');

    try {
      const result = generateColorMap('temperate-deciduous', 456, 0, 0, 6, 6);
      expect(result.diagnostics?.error?.message).toBe('hydrology breakdown');
      expect(result.diagnostics?.fallback).toBe(true);
      expect(notifySanityCheck).toHaveBeenCalledTimes(1);
      const [, detail] = notifySanityCheck.mock.calls[0];
      expect(detail).toMatchObject({ error: 'hydrology breakdown' });
      expect(errorSpy).toHaveBeenCalled();
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('falls back when vegetation adjustments fail', async () => {
    applyMangroveZonesMock.mockImplementation(() => {
      throw new Error('vegetation failure');
    });

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { generateColorMap } = await import('../src/map.js');

    try {
      const result = generateColorMap('temperate-deciduous', 789, 0, 0, 6, 6);
      expect(result.diagnostics?.error?.message).toBe('vegetation failure');
      expect(result.diagnostics?.fallback).toBe(true);
      expect(notifySanityCheck).toHaveBeenCalledTimes(1);
      const [, detail] = notifySanityCheck.mock.calls[0];
      expect(detail).toMatchObject({ error: 'vegetation failure' });
      expect(errorSpy).toHaveBeenCalled();
    } finally {
      errorSpy.mockRestore();
    }
  });
});
