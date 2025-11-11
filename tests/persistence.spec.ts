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

const { mapMock, generateWorldMapMock, adaptWorldToMapDataMock } = vi.hoisted(() => {
  const seedInfo = {
    raw: 'legacy-seed',
    normalized: 'legacy-seed',
    hex: 'hex-legacy-seed',
    lanes: Array.from({ length: 8 }, () => 0x1)
  };
  const baseMap = {
    tiles: Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => 'open')),
    types: Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => 'open')),
    xStart: 0,
    yStart: 0,
    seed: 'legacy-seed',
    seedInfo,
    season: 'Thawbound',
    worldSettings: { oreDensity: 50 }
  };
  const worldArtifact = {
    seed: seedInfo,
    dimensions: { width: 4, height: 4, size: 16 },
    params: { width: 4, height: 4, spawnSuggestionCount: 0 },
    layers: {
      elevation: new Float32Array(16),
      temperature: new Float32Array(16),
      moisture: new Float32Array(16),
      runoff: new Float32Array(16),
      biome: new Uint8Array(16),
      ore: new Float32Array(16),
      stone: new Float32Array(16),
      water: new Float32Array(16),
      fertility: new Float32Array(16)
    },
    tiles: Array.from({ length: 16 }, (_, index) =>
      Object.freeze({
        index,
        x: index % 4,
        y: Math.floor(index / 4),
        elevation: 0.5,
        temperature: 0.5,
        moisture: 0.5,
        runoff: 0.2,
        climate: Object.freeze({ temperature: 'mild', moisture: 'balanced', runoff: 'moderate', frostRisk: 0 }),
        biome: Object.freeze({ id: 'temperate-broadleaf', score: 0.5, reason: 'test' }),
        resources: Object.freeze({ vegetation: 0.3, wood: 0.3, forage: 0.2, ore: 0.1, freshWater: 0.2, fertility: 0.4 })
      })
    ),
    spawnSuggestions: new Uint32Array(0)
  };
  const worldClone = () => ({
    ...worldArtifact,
    layers: {
      elevation: new Float32Array(worldArtifact.layers.elevation),
      temperature: new Float32Array(worldArtifact.layers.temperature),
      moisture: new Float32Array(worldArtifact.layers.moisture),
      runoff: new Float32Array(worldArtifact.layers.runoff),
      biome: new Uint8Array(worldArtifact.layers.biome),
      ore: new Float32Array(worldArtifact.layers.ore),
      stone: new Float32Array(worldArtifact.layers.stone),
      water: new Float32Array(worldArtifact.layers.water),
      fertility: new Float32Array(worldArtifact.layers.fertility)
    }
  });
  return {
    mapMock: baseMap,
    generateWorldMapMock: vi.fn(options => {
      const resolvedSeedInfo =
        (options?.seed && typeof options.seed === 'object' ? options.seed : null) ??
        options?.seedInfo ??
        seedInfo;
      const resolvedSeed =
        typeof options?.seed === 'string'
          ? options.seed
          : resolvedSeedInfo?.raw ?? baseMap.seed;
      return {
        map: {
          ...baseMap,
          seed: resolvedSeed,
          seedInfo: resolvedSeedInfo,
          season: options?.season ?? baseMap.season,
          xStart: options?.xStart ?? baseMap.xStart,
          yStart: options?.yStart ?? baseMap.yStart,
          viewport: options?.viewport ?? baseMap.viewport ?? null,
          worldSettings: options?.worldSettings ?? baseMap.worldSettings,
          world: worldClone()
        },
        world: worldClone(),
        seedInfo: resolvedSeedInfo
      };
    }),
    adaptWorldToMapDataMock: vi.fn((_world, options = {}) => ({
      ...baseMap,
      seed: options.seedString ?? baseMap.seed,
      seedInfo: options.seedInfo ?? seedInfo,
      season: options.season ?? baseMap.season,
      xStart: options.xStart ?? baseMap.xStart,
      yStart: options.yStart ?? baseMap.yStart,
      viewport: options.viewport ?? baseMap.viewport ?? null,
      worldSettings: options.worldSettings ?? baseMap.worldSettings,
      world: _world ?? null
    }))
  };
});

vi.mock('../src/map.js', () => ({
  computeCenteredStart: () => ({ xStart: 0, yStart: 0 }),
  DEFAULT_MAP_WIDTH: 4,
  DEFAULT_MAP_HEIGHT: 4,
  generateWorldMap: generateWorldMapMock,
  adaptWorldToMapData: adaptWorldToMapDataMock
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
  generateWorldMapMock.mockClear();
  adaptWorldToMapDataMock.mockClear();
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
    expect(Array.isArray(location?.map?.seedInfo?.lanes)).toBe(true);
    expect(location?.map?.seedInfo?.lanes?.length).toBe(8);
    expect(typeof location?.map?.seedInfo?.hex).toBe('string');

    const canonical = await canonicalizeSeed(legacySeed);
    expect(location?.map?.seedInfo?.hex).toBe(canonical.hex);
    expect(location?.worldSettings?.seedHash).toBe(canonical.hex);
    expect(location?.worldSettings?.seedLanes).toEqual(Array.from(canonical.lanes));
    expect(saved.worldSettings?.seedHash).toBe(canonical.hex);
    expect(saved.worldSettings?.startingBiomeId).toBe('temperate-broadleaf');

    const generationOptions = generateWorldMapMock.mock.calls[0]?.[0];
    expect(generationOptions?.worldSettings?.seedHash).toBe(canonical.hex);
    expect(Array.isArray(generationOptions?.worldSettings?.seedLanes)).toBe(true);
  });
});
