import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initSetupUI } from '../src/ui/index.js';
import { difficultySettings, difficultyScore, resolveWorldParameters } from '../src/difficulty.js';
import { resetWorldConfig } from '../src/state.js';

vi.mock('../src/biomes.js', () => ({
  biomes: [
    {
      id: 'temperate-broadleaf',
      name: 'Temperate Woods',
      description: 'Balanced terrain',
      summary: 'Balanced terrain',
      notes: []
    }
  ],
  getBiome: (id: string) => ({
    id,
    name: 'Temperate Woods',
    description: 'Balanced terrain',
    summary: 'Balanced terrain',
    notes: []
  })
}));

const { PREVIEW_MAP_SIZE, buildMockWorld } = vi.hoisted(() => {
  const PREVIEW_MAP_SIZE = 128;
  const buildMockWorld = (width = PREVIEW_MAP_SIZE, height = PREVIEW_MAP_SIZE) => {
    const normalizedWidth = Math.max(1, Math.trunc(width));
    const normalizedHeight = Math.max(1, Math.trunc(height));
    const size = normalizedWidth * normalizedHeight;
    const elevation = new Float32Array(size).fill(0.6);
    const temperature = new Float32Array(size).fill(0.5);
    const moisture = new Float32Array(size).fill(0.5);
    const runoff = new Float32Array(size).fill(0.2);
    const tiles = new Array(size);
    for (let y = 0; y < normalizedHeight; y += 1) {
      for (let x = 0; x < normalizedWidth; x += 1) {
        const index = y * normalizedWidth + x;
        let elev = 0.6;
        let wood = 0.3;
        let vegetation = 0.4;
        let moistureValue = 0.5;
        let runoffValue = 0.2;
        if (y === 0 && x === normalizedWidth - 1) {
          elev = 0.1;
          runoffValue = 0.9;
          moistureValue = 0.95;
        } else if (y === 1 && x === 0) {
          wood = 0.9;
          vegetation = 0.85;
        }
        elevation[index] = elev;
        moisture[index] = moistureValue;
        runoff[index] = runoffValue;
        tiles[index] = Object.freeze({
          index,
          x,
          y,
          elevation: elev,
          temperature: 0.5,
          moisture: moistureValue,
          runoff: runoffValue,
          climate: Object.freeze({ temperature: 'mild', moisture: 'moderate', runoff: 'minimal', frostRisk: 0 }),
          biome: Object.freeze({ id: 'temperate-broadleaf', score: 0.5, reason: 'test-biome' }),
          resources: Object.freeze({
            vegetation,
            wood,
            forage: 0.3,
            ore: 0.2,
            freshWater: 0.3,
            fertility: 0.4
          })
        });
      }
    }
    return {
      dimensions: Object.freeze({ width: normalizedWidth, height: normalizedHeight, size }),
      layers: Object.freeze({
        elevation,
        temperature,
        moisture,
        runoff
      }),
      tiles: Object.freeze(tiles)
    };
  };
  return { PREVIEW_MAP_SIZE, buildMockWorld };
});

vi.mock('../src/map.js', () => ({
  computeCenteredStart: () => ({ xStart: 0, yStart: 0 }),
  DEFAULT_MAP_HEIGHT: PREVIEW_MAP_SIZE,
  DEFAULT_MAP_WIDTH: PREVIEW_MAP_SIZE,
  isWaterTerrain: (type: string) => type === 'water',
  TERRAIN_SYMBOLS: {
    open: '.',
    forest: 'F',
    water: '~',
    stone: 'S',
    ore: 'O'
  }
}));

vi.mock('../src/world/generate', () => ({
  generateWorld: vi.fn(({ width, height } = {}) => buildMockWorld(width, height))
}));

vi.mock('../src/world/seed.js', () => ({
  canonicalizeSeed: vi.fn(async (seed: string) => ({
    raw: seed,
    normalized: seed,
    hex: `hex-${seed}`,
    lanes: [0x1, 0x2, 0x3, 0x4, 0x5, 0x6, 0x7, 0x8]
  }))
}));

vi.mock('../src/mapView.js', () => ({
  createMapView: vi.fn(() => {
    const wrapper = document.createElement('div');
    wrapper.className = 'map-wrapper';
    const controls = document.createElement('div');
    const navGrid = document.createElement('div');
    navGrid.className = 'map-nav-grid';
    controls.appendChild(navGrid);
    return {
      setMap: vi.fn(),
      setMarkers: vi.fn(),
      elements: { controls, wrapper }
    };
  })
}));

vi.mock('../src/theme.js', () => {
  let appearance = 'dark';
  const listeners = new Set<(themeId: string, definition: any) => void>();
  const baseDefinition = {
    colors: {
      neutral: { dark: '#202733' },
      background: { light: '#f5f8ff' },
      primary: { light: '#8fb3ff', dark: '#425bff' },
      secondary: { light: '#ffd891', dark: '#b16bff' }
    }
  };
  const notify = () => {
    const definition = { ...baseDefinition, activeAppearance: appearance };
    listeners.forEach(listener => listener('stellar', definition));
  };
  return {
    getAvailableThemes: () => [
      {
        id: 'stellar',
        meta: { label: 'Stellar', emoji: '✨' },
        colors: {
          primary: { light: '#8fb3ff', dark: '#425bff' },
          secondary: { light: '#ffd891', dark: '#b16bff' }
        },
        appearance: 'dark'
      }
    ],
    getTheme: () => 'stellar',
    getThemeDefinition: () => ({ ...baseDefinition, activeAppearance: appearance }),
    getThemeAppearance: () => appearance,
    onThemeChange: (callback: (themeId: string, definition: any) => void, options: { immediate?: boolean } = {}) => {
      listeners.add(callback);
      if (options?.immediate) {
        callback('stellar', { ...baseDefinition, activeAppearance: appearance });
      }
      return () => listeners.delete(callback);
    },
    setTheme: vi.fn(),
    setThemeAppearance: (next: string) => {
      appearance = next;
      notify();
    }
  };
});

beforeEach(() => {
  document.body.innerHTML = '<div id="content"><div id="game" style="display:none;"></div></div>';
  document.body.className = '';
  vi.clearAllMocks();
  (vi as any).unstubAllGlobals?.();
  vi.stubGlobal('crypto', {
    getRandomValues: (array: Uint32Array) => {
      array[0] = 123456;
      return array;
    }
  } as unknown as Crypto);
  resetWorldConfig();
});

describe('difficulty panel interactions', () => {
  it('applies preset values to world sliders', () => {
    initSetupUI(() => {});
    document.querySelector<HTMLButtonElement>('#difficulty-toggle')?.click();
    const presetSelect = document.querySelector<HTMLSelectElement>('#difficulty-preset');
    expect(presetSelect).toBeTruthy();
    if (!presetSelect) return;

    presetSelect.value = 'easy';
    presetSelect.dispatchEvent(new Event('change', { bubbles: true }));

    const oreSlider = document.querySelector<HTMLInputElement>('#difficulty-slider-oreDensity');
    expect(oreSlider?.value).toBe(String(difficultySettings.easy.world.oreDensity));

    const mountainsSlider = document.querySelector<HTMLInputElement>('#difficulty-slider-mountains');
    expect(mountainsSlider?.value).toBe(String(difficultySettings.easy.world.mountains));

    const streamsSlider = document.querySelector<HTMLInputElement>('#difficulty-slider-streams100');
    expect(streamsSlider?.value).toBe(String(difficultySettings.easy.world.streams100));
  });

  it('marks preset as custom when sliders change', () => {
    initSetupUI(() => {});
    document.querySelector<HTMLButtonElement>('#difficulty-toggle')?.click();
    const presetSelect = document.querySelector<HTMLSelectElement>('#difficulty-preset');
    expect(presetSelect?.value).toBe('normal');

    const oreSlider = document.querySelector<HTMLInputElement>('#difficulty-slider-oreDensity');
    expect(oreSlider).toBeTruthy();
    if (!oreSlider || !presetSelect) return;

    oreSlider.value = String(Number(oreSlider.value) + 7);
    oreSlider.dispatchEvent(new Event('input', { bubbles: true }));

    expect(presetSelect.value).toBe('custom');
  });

  it('computes deterministic difficulty score', () => {
    const params = resolveWorldParameters({ oreDensity: 80, mountains: 20 });
    expect(difficultyScore(params)).toBe(44);
  });
});
