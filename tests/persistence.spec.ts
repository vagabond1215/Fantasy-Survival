import { beforeEach, describe, expect, it, vi } from 'vitest';
import store from '../src/state.js';
import { loadGame } from '../src/persistence.js';
import { canonicalizeSeed } from '../src/world/seed.js';

vi.mock('../src/people.js', () => ({
  refreshStats: vi.fn()
}));

vi.mock('../src/buildings.js', () => ({
  refreshBuildingUnlocks: vi.fn()
}));

vi.mock('../src/technology.js', () => ({
  initializeTechnologyRegistry: vi.fn()
}));

const { mapMock, generateColorMapMock } = vi.hoisted(() => {
  const baseMap = {
    tiles: Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => 'open')),
    types: Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => 'open')),
    xStart: 0,
    yStart: 0,
    seed: 'legacy-seed',
    worldSettings: { oreDensity: 50 }
  };
  return {
    mapMock: baseMap,
    generateColorMapMock: vi.fn(() => ({ ...baseMap }))
  };
});

vi.mock('../src/map.js', () => ({
  computeCenteredStart: () => ({ xStart: 0, yStart: 0 }),
  DEFAULT_MAP_WIDTH: 4,
  DEFAULT_MAP_HEIGHT: 4,
  generateColorMap: generateColorMapMock
}));

const STORAGE_KEY = 'fantasy-survival-save';

const storageData = new Map<string, string>();

const localStorageMock = {
  getItem: (key: string) => (storageData.has(key) ? storageData.get(key)! : null),
  setItem: (key: string, value: string) => {
    storageData.set(key, value);
  },
  removeItem: (key: string) => {
    storageData.delete(key);
  },
  clear: () => storageData.clear(),
  key: (index: number) => Array.from(storageData.keys())[index] ?? null,
  get length() {
    return storageData.size;
  }
};

vi.stubGlobal('localStorage', localStorageMock);

beforeEach(() => {
  storageData.clear();
  store.deserialize({});
  generateColorMapMock.mockClear();
});

describe('loadGame', () => {
  it('accepts legacy saves stored with plain objects', async () => {
    const legacySave = {
      locations: {
        loc1: {
          id: 'loc1',
          biome: 'temperate-broadleaf',
          map: { ...mapMock },
          siteCapacities: { forest: 10, cleared: 5 }
        }
      },
      inventory: {
        wood: { id: 'wood', quantity: 12 }
      },
      people: {
        alice: { id: 'alice', name: 'Alice' }
      },
      craftTargets: {
        rope: 3
      },
      buildings: {
        hut: { id: 'hut', progress: 0 }
      },
      proficiencies: {
        hunting: { id: 'hunting', level: 12 }
      },
      gatherNodes: {
        grove: { id: 'grove', resourceId: 'wood' }
      },
      time: { season: 'Thawbound' }
    };

    storageData.set(STORAGE_KEY, JSON.stringify(legacySave));

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await loadGame();

    expect(result).toBe(true);
    expect(errorSpy).not.toHaveBeenCalled();
    expect(store.locations.size).toBe(1);
    const location = store.locations.get('loc1');
    expect(location?.map?.tiles?.length).toBeGreaterThan(0);
    expect(location?.siteCapacities?.forest).toBe(10);
    expect(store.worldSettings?.oreDensity).toBe(50);

    errorSpy.mockRestore();
  });

  it('migrates legacy saves missing seed metadata and persists canonical fields', async () => {
    const legacySeed = '  Café  ';
    const legacySave = {
      locations: [
        [
          'loc1',
          {
            id: 'loc1',
            biome: 'temperate-broadleaf',
            map: {
              tiles: null,
              types: null,
              seed: legacySeed,
              worldSettings: { oreDensity: 42 }
            },
            worldSettings: { oreDensity: 42 }
          }
        ]
      ],
      worldSettings: { oreDensity: 42 },
      time: { season: 'Thawbound' }
    };

    storageData.set(STORAGE_KEY, JSON.stringify(legacySave));

    const result = await loadGame();
    expect(result).toBe(true);

    const saved = JSON.parse(storageData.get(STORAGE_KEY) ?? '{}');
    const locationEntry = Array.isArray(saved.locations) ? saved.locations[0] : null;
    expect(Array.isArray(locationEntry)).toBe(true);
    const location = locationEntry?.[1];
    expect(location?.startingBiomeId).toBe('temperate-broadleaf');
    expect(location?.worldSettings?.startingBiomeId).toBe('temperate-broadleaf');
    expect(Array.isArray(location?.map?.seedLanes)).toBe(true);
    expect(location?.map?.seedLanes?.length).toBe(8);
    expect(typeof location?.map?.seedHash).toBe('string');

    const canonical = await canonicalizeSeed(legacySeed);
    expect(location?.map?.seedHash).toBe(canonical.hex);
    expect(location?.worldSettings?.seedHash).toBe(canonical.hex);
    expect(location?.worldSettings?.seedLanes).toEqual(Array.from(canonical.lanes));
    expect(saved.worldSettings?.seedHash).toBe(canonical.hex);
    expect(saved.worldSettings?.startingBiomeId).toBe('temperate-broadleaf');

    const generatedWorld = generateColorMapMock.mock.calls[0]?.[9];
    expect(generatedWorld?.seedHash).toBe(canonical.hex);
    expect(Array.isArray(generatedWorld?.seedLanes)).toBe(true);
  });
});
