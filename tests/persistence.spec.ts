import { beforeEach, describe, expect, it, vi } from 'vitest';
import store from '../src/state.js';
import { loadGame } from '../src/persistence.js';

vi.mock('../src/people.js', () => ({
  refreshStats: vi.fn()
}));

vi.mock('../src/buildings.js', () => ({
  refreshBuildingUnlocks: vi.fn()
}));

vi.mock('../src/technology.js', () => ({
  initializeTechnologyRegistry: vi.fn()
}));

const mapMock = {
  tiles: Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => 'open')),
  types: Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => 'open')),
  xStart: 0,
  yStart: 0,
  seed: 'legacy-seed',
  worldSettings: { oreDensity: 50 }
};

vi.mock('../src/map.js', () => ({
  computeCenteredStart: () => ({ xStart: 0, yStart: 0 }),
  DEFAULT_MAP_WIDTH: 4,
  DEFAULT_MAP_HEIGHT: 4,
  generateColorMap: vi.fn(() => ({ ...mapMock }))
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
});

describe('loadGame', () => {
  it('accepts legacy saves stored with plain objects', () => {
    const legacySave = {
      locations: {
        loc1: {
          id: 'loc1',
          biome: 'temperate-deciduous',
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

    const result = loadGame();

    expect(result).toBe(true);
    expect(errorSpy).not.toHaveBeenCalled();
    expect(store.locations.size).toBe(1);
    const location = store.locations.get('loc1');
    expect(location?.map?.tiles?.length).toBeGreaterThan(0);
    expect(location?.siteCapacities?.forest).toBe(10);

    errorSpy.mockRestore();
  });
});
