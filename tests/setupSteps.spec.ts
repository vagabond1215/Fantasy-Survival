import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initSetupUI } from '../src/ui.js';

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

vi.mock('../src/difficulty.js', () => {
  const difficulties = [
    { id: 'easy', name: 'Easy', summary: 'Lenient' },
    { id: 'normal', name: 'Normal', summary: 'Balanced' },
    { id: 'hard', name: 'Hard', summary: 'Severe' }
  ];

  const defaultWorldParameters = {
    oreDensity: 50,
    waterTable: 50,
    temperature: 50,
    rainfall: 50,
    mountains: 50,
    rivers100: 50,
    lakes100: 50,
    advanced: {
      elevationBase: 50,
      elevationVariance: 50,
      elevationScale: 50,
      vegetationScale: 50,
      oreNoiseScale: 50,
      oreThresholdOffset: 50,
      waterGuaranteeRadius: 50
    }
  };

  const resolveWorldParameters = (partial: any = {}) => ({
    ...defaultWorldParameters,
    ...partial,
    advanced: {
      ...defaultWorldParameters.advanced,
      ...(partial.advanced || {})
    }
  });

  const difficultySettings = {
    easy: {
      start: { people: 8, foodDays: 6, firewoodDays: 6, tools: {} },
      world: resolveWorldParameters({ oreDensity: 60, waterTable: 60 })
    },
    normal: {
      start: { people: 6, foodDays: 3, firewoodDays: 3, tools: {} },
      world: resolveWorldParameters({})
    },
    hard: {
      start: { people: 4, foodDays: 1, firewoodDays: 1, tools: {} },
      world: resolveWorldParameters({ oreDensity: 40, mountains: 65 })
    },
    custom: {
      start: { people: 6, foodDays: 3, firewoodDays: 3, tools: {} },
      world: resolveWorldParameters({})
    }
  };

  const getDifficultyPreset = (id: string) => difficultySettings[id] || difficultySettings.normal;

  return {
    difficulties,
    difficultySettings,
    defaultWorldParameters,
    resolveWorldParameters,
    difficultyScore: () => 50,
    getDifficultyPreset
  };
});

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

describe('setup step navigation', () => {
  it('renders ordered steps and updates aria-current when navigating', () => {
    initSetupUI(() => {});
    const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('.create-step'));
    expect(buttons).toHaveLength(5);
    expect(buttons[0].classList.contains('is-current')).toBe(true);
    expect(buttons[0].getAttribute('aria-current')).toBe('step');
    expect(buttons[0].classList.contains('is-complete')).toBe(true);
    expect(buttons[1].hasAttribute('aria-current')).toBe(false);

    buttons[1].click();
    expect(buttons[1].classList.contains('is-current')).toBe(true);
    expect(buttons[1].getAttribute('aria-current')).toBe('step');
    expect(buttons[0].classList.contains('is-current')).toBe(false);
    expect(buttons[0].classList.contains('is-complete')).toBe(true);

    const previewGroup = document.querySelector<HTMLElement>('[data-step-group="preview"]');
    expect(previewGroup?.hidden).toBe(true);

    const finalButton = buttons[4];
    finalButton.click();
    expect(finalButton.classList.contains('is-current')).toBe(true);
    expect(finalButton.getAttribute('aria-current')).toBe('step');
    expect(previewGroup?.hidden).toBe(false);
  });

  it('supports arrow key focus movement across step controls', () => {
    initSetupUI(() => {});
    const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('.create-step'));
    const second = buttons[1];
    second.focus();
    const event = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true });
    second.dispatchEvent(event);
    expect(document.activeElement).toBe(buttons[2]);
  });
});

describe('season selection buttons', () => {
  it('renders icon-only buttons with accessible metadata', () => {
    initSetupUI(() => {});
    const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('#season-seg button'));
    const expected = [
      { id: 'Thawbound', label: 'Spring', icon: '🌱' },
      { id: 'Sunheight', label: 'Summer', icon: '☀️' },
      { id: 'Emberwane', label: 'Autumn', icon: '🍂' },
      { id: 'Frostshroud', label: 'Winter', icon: '❄️' }
    ];
    expect(buttons).toHaveLength(expected.length);
    buttons.forEach((button, index) => {
      const { id, label, icon } = expected[index];
      expect(button.dataset.season).toBe(id);
      expect(button.textContent).toBe(icon);
      expect(button.getAttribute('aria-label')).toBe(label);
      expect(button.getAttribute('title')).toBe(label);
    });
  });
});
