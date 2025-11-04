import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { LANDMASS_PRESETS } from '../src/map/landmassPresets/index.js';
import { TERRAIN_SYMBOLS } from '../src/map.js';

const BIOME_ID = 'temperate-deciduous';
const MAP_WIDTH = 16;
const MAP_HEIGHT = 16;
const SEASON = 'Sunheight';
const KNOWN_TERRAINS = new Set(Object.keys(TERRAIN_SYMBOLS));
const KNOWN_SYMBOLS = new Set(Object.values(TERRAIN_SYMBOLS));

let generateColorMap;
let consoleInfoSpy;
let consoleDebugSpy;

beforeAll(async () => {
  ({ generateColorMap } = await import('../src/map.js'));
  consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
  consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
});

afterAll(() => {
  consoleInfoSpy?.mockRestore();
  consoleDebugSpy?.mockRestore();
});

describe('generateColorMap landmass presets', () => {
  Object.keys(LANDMASS_PRESETS).forEach((presetKey, index) => {
    it(`creates a valid map for ${presetKey}`, () => {
      const seed = 12345 + index;
      const result = generateColorMap(
        BIOME_ID,
        seed,
        0,
        0,
        MAP_WIDTH,
        MAP_HEIGHT,
        SEASON,
        undefined,
        null,
        { mapType: presetKey },
        true
      );

      expect(result.width).toBe(MAP_WIDTH);
      expect(result.height).toBe(MAP_HEIGHT);
      expect(result.tiles).toHaveLength(MAP_HEIGHT);
      result.tiles.forEach(row => {
        expect(row).toHaveLength(MAP_WIDTH);
        row.forEach(symbol => {
          expect(symbol).toBeTruthy();
          expect(KNOWN_SYMBOLS.has(symbol)).toBe(true);
        });
      });

      const terrainTypes = result.types.flat().filter(Boolean);
      expect(terrainTypes.length).toBeGreaterThan(0);
      terrainTypes.forEach(type => {
        expect(KNOWN_TERRAINS.has(type)).toBe(true);
      });
    });
  });
});
