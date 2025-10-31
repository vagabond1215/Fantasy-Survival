import { beforeAll, describe, expect, it, vi } from 'vitest';
import { getBiome } from '../src/biomes.js';
import { isOpenTerrain, resolveBiomeOpenTerrain } from '../src/terrainTypes.js';

const TEST_CASES = [
  'alpine',
  'coastal-tropical',
  'savanna',
  'temperate-deciduous'
];

let realGenerateColorMap;

beforeAll(async () => {
  ({ generateColorMap: realGenerateColorMap } = await import('../src/map.js'));
});

describe('generateColorMap open terrain assignment', () => {
  TEST_CASES.forEach(biomeId => {
    it(`uses biome-specific open terrain for ${biomeId}`, () => {
      const biome = getBiome(biomeId);
      const expectedOpen = resolveBiomeOpenTerrain(biome);
      const map = realGenerateColorMap(
        biomeId,
        12345,
        0,
        0,
        24,
        24,
        'Sunheight',
        undefined,
        null,
        null,
        true
      );
      const tiles = map.types.flat().filter(Boolean);
      expect(tiles.length).toBeGreaterThan(0);
      const openLikeTypes = new Set(tiles.filter(type => isOpenTerrain(type)));
      if (openLikeTypes.size > 0) {
        expect([...openLikeTypes]).toEqual([expectedOpen]);
      }
      expect(tiles).not.toContain('open');
      expect(map.openTerrainType).toBe(expectedOpen);
    });
  });
});

describe('mangrove reclassification under sea-level changes', () => {
  it('reclassifies isolated mangroves that lose adjacent land', async () => {
    vi.resetModules();

    const baseHydrology = [
      ['land', 'land', 'land'],
      ['land', 'mangrove', 'land'],
      ['land', 'land', 'land']
    ];
    const seaLevel = 0.5;
    const elevationMap = new Map([
      ['0,0', 0.4],
      ['1,0', 0.2],
      ['2,0', 0.4],
      ['0,1', 0.2],
      ['1,1', 0.6],
      ['2,1', 0.2],
      ['0,2', 0.4],
      ['1,2', 0.2],
      ['2,2', 0.4]
    ]);

    vi.doMock('../src/map/generation/elevation.js', () => ({
      createElevationSampler: (_seed, _options = {}) => ({
        sample: (gx, gy) => elevationMap.get(`${gx},${gy}`) ?? 0.6
      })
    }));

    vi.doMock('../src/map/generation/hydrology.js', () => ({
      generateHydrology: () => ({
        types: baseHydrology.map(row => row.slice()),
        seaLevel,
        rules: { seaLevel }
      })
    }));

    vi.doMock('../src/map/generation/vegetation.js', () => ({
      applyMangroveZones: () => null
    }));

    const { generateColorMap } = await import('../src/map.js');

    const map = generateColorMap(
      'coastal-tropical',
      9876,
      0,
      0,
      3,
      3,
      'Summer',
      undefined,
      null,
      null,
      true
    );

    expect(map.hydrology.types[1][0]).toBe('ocean');
    expect(map.hydrology.types[1][2]).toBe('ocean');
    expect(map.hydrology.types[1][1]).toBe('ocean');

    vi.doUnmock('../src/map/generation/elevation.js');
    vi.doUnmock('../src/map/generation/hydrology.js');
    vi.doUnmock('../src/map/generation/vegetation.js');
    vi.resetModules();
  });
});
