import { describe, expect, it } from 'vitest';
import { generateColorMap } from '../src/map.js';
import { getBiome } from '../src/biomes.js';

describe('terrain classification', () => {
  const CASES = [
    { biomeId: 'alpine', seed: 'terrain-alpine' },
    { biomeId: 'savanna', seed: 'terrain-savanna' },
    { biomeId: 'coastal-tropical', seed: 'terrain-coastal-tropical' },
    {
      biomeId: 'flooded-grasslands',
      seed: 'terrain-flooded',
      world: { waterTable: 20, rainfall: 55, rivers100: 35, lakes100: 30 },
      seaLevel: 0.1
    },
    { biomeId: 'tropical-monsoon', seed: 'terrain-monsoon' }
  ];

  CASES.forEach(({ biomeId, seed, world, seaLevel }) => {
    it(`assigns biome-specific open terrain for ${biomeId}`, () => {
      const map = generateColorMap(
        biomeId,
        seed,
        null,
        null,
        48,
        48,
        'Sunheight',
        seaLevel,
        null,
        world,
        true
      );
      const expected = getBiome(biomeId)?.openTerrainId ?? 'open';
      const tiles = map.types.flat();
      expect(tiles).toContain(expected);
      if (expected !== 'open') {
        expect(tiles).not.toContain('open');
      }
    });
  });
});
