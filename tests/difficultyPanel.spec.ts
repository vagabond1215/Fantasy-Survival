import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initSetupUI } from '../src/ui.js';
import { difficultySettings, difficultyScore, resolveWorldParameters } from '../src/difficulty.js';

vi.mock('../src/biomes.js', () => ({
  biomes: [
    {
      id: 'temperate-deciduous',
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

const mockMap = {
  xStart: 0,
  yStart: 0,
  width: 3,
  height: 3,
  seed: 'seed-value',
  season: 'Thawbound',
  types: [
    ['open', 'open', 'water'],
    ['forest', 'open', 'open'],
    ['open', 'open', 'open']
  ]
};

vi.mock('../src/map.js', () => ({
  computeCenteredStart: () => ({ xStart: 0, yStart: 0 }),
  DEFAULT_MAP_HEIGHT: 3,
  DEFAULT_MAP_WIDTH: 3,
  generateColorMap: vi.fn(() => ({ ...mockMap })),
  TERRAIN_COLORS: {
    open: '#ffffff',
    forest: '#228b22',
    water: '#3399ff'
  }
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
});

describe('difficulty panel interactions', () => {
  it('applies preset values to world sliders', () => {
    initSetupUI(() => {});
    const presetSelect = document.querySelector<HTMLSelectElement>('#difficulty-preset');
    expect(presetSelect).toBeTruthy();
    if (!presetSelect) return;

    presetSelect.value = 'easy';
    presetSelect.dispatchEvent(new Event('change', { bubbles: true }));

    const oreSlider = document.querySelector<HTMLInputElement>('#difficulty-slider-oreDensity');
    expect(oreSlider?.value).toBe(String(difficultySettings.easy.world.oreDensity));

    const mountainsSlider = document.querySelector<HTMLInputElement>('#difficulty-slider-mountains');
    expect(mountainsSlider?.value).toBe(String(difficultySettings.easy.world.mountains));
  });

  it('marks preset as custom when sliders change', () => {
    initSetupUI(() => {});
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
    expect(difficultyScore(params)).toBe(42);
  });
});
