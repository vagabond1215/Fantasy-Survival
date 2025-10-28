import { describe, expect, it } from 'vitest';
import { generateColorMap } from '../src/map.js';
import { getBiome } from '../src/biomes.js';
import { isOpenTerrain, resolveBiomeOpenTerrain } from '../src/terrainTypes.js';

const TEST_CASES = [
  'alpine',
  'coastal-tropical',
  'savanna',
  'temperate-deciduous'
];

describe('generateColorMap open terrain assignment', () => {
  TEST_CASES.forEach(biomeId => {
    it(`uses biome-specific open terrain for ${biomeId}`, () => {
      const biome = getBiome(biomeId);
      const expectedOpen = resolveBiomeOpenTerrain(biome);
      const map = generateColorMap(
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
