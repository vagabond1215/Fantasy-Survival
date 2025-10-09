const THEME_STORAGE_KEY = 'theme';

const STANDARD_COLOR_KEYS = [
  'red',
  'orange',
  'yellow',
  'green',
  'blue',
  'pink',
  'purple',
  'brown'
];

const THEME_DEFINITIONS = [
  {
    id: 'aurora-midnight',
    name: 'Aurora Midnight',
    appearance: 'dark',
    colors: {
      background: { light: '#1b2542', base: '#111930', dark: '#070b16' },
      neutral: { light: '#e8efff', base: '#bac4db', dark: '#828ba1' },
      primary: { light: '#6feaff', base: '#3dc2f0', dark: '#2a94c2' },
      secondary: { light: '#b991ff', base: '#7b2ff7', dark: '#5520ad' },
      accent: { light: '#ffe39b', base: '#ffd166', dark: '#c99c30' }
    },
    standardColors: {
      red: { light: '#ff6f7a', dark: '#b7414c' },
      orange: { light: '#ff9955', dark: '#c86b1f' },
      yellow: { light: '#ffe680', dark: '#bfa326' },
      green: { light: '#73e4b8', dark: '#2f9d6f' },
      blue: { light: '#7ccaff', dark: '#2676c9' },
      pink: { light: '#f5a6ff', dark: '#b05bc7' },
      purple: { light: '#b59cff', dark: '#6a55c7' },
      brown: { light: '#d6a37a', dark: '#8a6238' }
    },
    text: {
      primary: '#f5f7ff',
      muted: '#b9c2dc'
    }
  },
  {
    id: 'sunrise-harbor',
    name: 'Sunrise Harbor',
    appearance: 'light',
    colors: {
      background: { light: '#fff6f0', base: '#f6ede6', dark: '#d9c4b4' },
      neutral: { light: '#876f61', base: '#5e4535', dark: '#3e2c24' },
      primary: { light: '#ffb38a', base: '#f2845c', dark: '#c35d35' },
      secondary: { light: '#ff8cb3', base: '#f25d8e', dark: '#c33b68' },
      accent: { light: '#73a8d6', base: '#4a7ba7', dark: '#2e5272' }
    },
    standardColors: {
      red: { light: '#f0716b', dark: '#9c2421' },
      orange: { light: '#f8b36d', dark: '#b55d0e' },
      yellow: { light: '#ffec99', dark: '#b69524' },
      green: { light: '#a9e4a6', dark: '#4a9b47' },
      blue: { light: '#8bc6f0', dark: '#2b76a8' },
      pink: { light: '#f7b6d8', dark: '#c46497' },
      purple: { light: '#c5a7f0', dark: '#6f4ba7' },
      brown: { light: '#c79269', dark: '#714423' }
    },
    text: {
      primary: '#2f1f16',
      muted: '#6f584b'
    }
  },
  {
    id: 'verdant-hollow',
    name: 'Verdant Hollow',
    appearance: 'dark',
    colors: {
      background: { light: '#213528', base: '#15251b', dark: '#0a150e' },
      neutral: { light: '#e6f0e2', base: '#c7d5c5', dark: '#8a9585' },
      primary: { light: '#7ed98f', base: '#58b368', dark: '#3b7f46' },
      secondary: { light: '#5ab292', base: '#3d8a6b', dark: '#23614b' },
      accent: { light: '#ffe79b', base: '#f2cf63', dark: '#c49c2d' }
    },
    standardColors: {
      red: { light: '#ff8a7a', dark: '#b44b3e' },
      orange: { light: '#ffb070', dark: '#c46a28' },
      yellow: { light: '#ffe685', dark: '#b79d28' },
      green: { light: '#8ae79a', dark: '#327a45' },
      blue: { light: '#73c9ff', dark: '#226d9f' },
      pink: { light: '#f3a3d3', dark: '#a95690' },
      purple: { light: '#c0a6ff', dark: '#5e4dad' },
      brown: { light: '#d9b48a', dark: '#7c5632' }
    },
    text: {
      primary: '#f2f8f1',
      muted: '#b9c7b7'
    }
  },
  {
    id: 'emberfall-dusk',
    name: 'Emberfall Dusk',
    appearance: 'dark',
    colors: {
      background: { light: '#3a2725', base: '#2b1c1d', dark: '#130a0a' },
      neutral: { light: '#f2e5dd', base: '#d7c2b8', dark: '#9f8a80' },
      primary: { light: '#f59d89', base: '#e26d5c', dark: '#a94333' },
      secondary: { light: '#ffc48a', base: '#f4a259', dark: '#be6d26' },
      accent: { light: '#aee063', base: '#8cbf3f', dark: '#5d861f' }
    },
    standardColors: {
      red: { light: '#ff8072', dark: '#b43f32' },
      orange: { light: '#ffb676', dark: '#c16920' },
      yellow: { light: '#ffe27d', dark: '#b68c1f' },
      green: { light: '#b6e178', dark: '#4f8620' },
      blue: { light: '#76b4ff', dark: '#1f5f9c' },
      pink: { light: '#f9a2c2', dark: '#a55a7a' },
      purple: { light: '#c79afe', dark: '#6a409c' },
      brown: { light: '#d7a07a', dark: '#7c4c31' }
    },
    text: {
      primary: '#fdf5f1',
      muted: '#cdb9b2'
    }
  },
  {
    id: 'mistwood-veil',
    name: 'Mistwood Veil',
    appearance: 'dark',
    colors: {
      background: { light: '#2b313e', base: '#1f2530', dark: '#10151f' },
      neutral: { light: '#eef3ff', base: '#c5d0e0', dark: '#8c95a6' },
      primary: { light: '#99c3ff', base: '#6ba4ff', dark: '#376ec5' },
      secondary: { light: '#7de2d3', base: '#49c5b6', dark: '#258478' },
      accent: { light: '#ffd5ad', base: '#f2b880', dark: '#c58b4d' }
    },
    standardColors: {
      red: { light: '#ff7f8f', dark: '#b24453' },
      orange: { light: '#ffb17d', dark: '#bf6b33' },
      yellow: { light: '#ffe39f', dark: '#b9933d' },
      green: { light: '#88e2b0', dark: '#2d8360' },
      blue: { light: '#8fc6ff', dark: '#2c6fb6' },
      pink: { light: '#f5a3d6', dark: '#a65f96' },
      purple: { light: '#c3a7ff', dark: '#654fab' },
      brown: { light: '#ceb195', dark: '#735d45' }
    },
    text: {
      primary: '#f5f7ff',
      muted: '#bfc7d7'
    }
  },
  {
    id: 'opaline-garden',
    name: 'Opaline Garden',
    appearance: 'light',
    colors: {
      background: { light: '#f9fbff', base: '#eef3fb', dark: '#ccd7ea' },
      neutral: { light: '#6b7280', base: '#4b5563', dark: '#2f3642' },
      primary: { light: '#7ea7d6', base: '#4f7cac', dark: '#345377' },
      secondary: { light: '#caa1d8', base: '#9a6fb0', dark: '#6d4180' },
      accent: { light: '#ffe4b1', base: '#f0c987', dark: '#c5954d' }
    },
    standardColors: {
      red: { light: '#f28b8d', dark: '#a53437' },
      orange: { light: '#fbb074', dark: '#b5631d' },
      yellow: { light: '#ffe48f', dark: '#b8962b' },
      green: { light: '#9fe3b1', dark: '#3f8c57' },
      blue: { light: '#86baf0', dark: '#2f6fa6' },
      pink: { light: '#f4add5', dark: '#a4538f' },
      purple: { light: '#c7b0f2', dark: '#6a4aa6' },
      brown: { light: '#c89d7d', dark: '#7a4f32' }
    },
    text: {
      primary: '#233047',
      muted: '#5a6475'
    }
  }
];

const THEME_INDEX = new Map(THEME_DEFINITIONS.map(theme => [theme.id, theme]));
const VALID_THEMES = new Set(THEME_DEFINITIONS.map(theme => theme.id));
const THEME_CLASSES = THEME_DEFINITIONS.map(theme => `theme-${theme.id}`);

const listeners = new Set();

let hasStoredPreference = false;
let systemPreferenceQuery = null;
let systemPreferenceListener = null;

function resolveSystemPreferenceQuery() {
  if (systemPreferenceQuery || typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return systemPreferenceQuery;
  }
  try {
    systemPreferenceQuery = window.matchMedia('(prefers-color-scheme: dark)');
  } catch (error) {
    console.warn('Unable to access system color scheme.', error);
    systemPreferenceQuery = null;
  }
  return systemPreferenceQuery;
}

function detectPreferredTheme() {
  const query = resolveSystemPreferenceQuery();
  const prefersDark = query && typeof query.matches === 'boolean' ? query.matches : true;
  const preferredAppearance = prefersDark ? 'dark' : 'light';
  const fallback = THEME_DEFINITIONS.find(theme => theme.appearance === preferredAppearance)
    || THEME_DEFINITIONS[0];
  return fallback?.id || THEME_DEFINITIONS[0].id;
}

let currentTheme = (() => {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored && VALID_THEMES.has(stored)) {
      hasStoredPreference = true;
      return stored;
    }
  } catch (error) {
    console.warn('Unable to access theme preference storage.', error);
  }
  return detectPreferredTheme();
})();

function setCSSVariable(root, name, value) {
  if (!root || typeof root.style?.setProperty !== 'function' || !name) return;
  root.style.setProperty(name, value);
}

function applyStandardColorVariables(root, standardColors) {
  STANDARD_COLOR_KEYS.forEach(key => {
    const palette = standardColors?.[key];
    if (!palette) {
      setCSSVariable(root, `--color-${key}-light`, '');
      setCSSVariable(root, `--color-${key}-dark`, '');
      return;
    }
    setCSSVariable(root, `--color-${key}-light`, palette.light);
    setCSSVariable(root, `--color-${key}-dark`, palette.dark);
  });
}

function buildGradient(from, to) {
  if (!from || !to) return '';
  return `linear-gradient(135deg, ${from}, ${to})`;
}

function rgbaFromHex(hex, alpha = 1) {
  if (!hex) return '';
  const trimmed = hex.replace('#', '');
  if (trimmed.length !== 6) {
    return '';
  }
  const r = parseInt(trimmed.slice(0, 2), 16);
  const g = parseInt(trimmed.slice(2, 4), 16);
  const b = parseInt(trimmed.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function applyThemeVariables() {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const body = document.body;
  if (!root || !body) return;
  const theme = THEME_INDEX.get(currentTheme);
  if (!theme) return;

  const { colors, standardColors, text } = theme;

  const layerBackgrounds = [
    colors.background.dark,
    colors.background.base,
    colors.background.light,
    colors.neutral.dark,
    colors.neutral.base
  ];

  setCSSVariable(root, '--color-background', colors.background.base);
  setCSSVariable(root, '--color-background-light', colors.background.light);
  setCSSVariable(root, '--color-background-dark', colors.background.dark);

  setCSSVariable(root, '--color-neutral', colors.neutral.base);
  setCSSVariable(root, '--color-neutral-light', colors.neutral.light);
  setCSSVariable(root, '--color-neutral-dark', colors.neutral.dark);

  setCSSVariable(root, '--color-primary', colors.primary.base);
  setCSSVariable(root, '--color-primary-light', colors.primary.light);
  setCSSVariable(root, '--color-primary-dark', colors.primary.dark);

  setCSSVariable(root, '--color-secondary', colors.secondary.base);
  setCSSVariable(root, '--color-secondary-light', colors.secondary.light);
  setCSSVariable(root, '--color-secondary-dark', colors.secondary.dark);

  setCSSVariable(root, '--color-accent', colors.accent.base);
  setCSSVariable(root, '--color-accent-light', colors.accent.light);
  setCSSVariable(root, '--color-accent-dark', colors.accent.dark);

  setCSSVariable(root, '--layer-background-0', layerBackgrounds[0]);
  setCSSVariable(root, '--layer-background-1', layerBackgrounds[1]);
  setCSSVariable(root, '--layer-background-2', layerBackgrounds[2]);
  setCSSVariable(root, '--layer-background-3', layerBackgrounds[3]);
  setCSSVariable(root, '--layer-background-4', layerBackgrounds[4]);

  setCSSVariable(root, '--bg-color', layerBackgrounds[0]);
  setCSSVariable(root, '--surface-color', layerBackgrounds[1]);
  setCSSVariable(root, '--surface-alt-color', layerBackgrounds[2]);
  setCSSVariable(root, '--surface-strong-color', layerBackgrounds[3]);

  setCSSVariable(root, '--menu-bg', layerBackgrounds[1]);
  setCSSVariable(root, '--map-bg', layerBackgrounds[1]);
  setCSSVariable(root, '--map-border', rgbaFromHex(colors.primary.dark, 0.45));
  setCSSVariable(root, '--map-border-strong', rgbaFromHex(colors.secondary.dark, 0.55));

  setCSSVariable(root, '--action-panel-bg', layerBackgrounds[2]);
  setCSSVariable(root, '--action-option-bg', layerBackgrounds[3]);
  setCSSVariable(root, '--card-bg', layerBackgrounds[3]);
  setCSSVariable(root, '--card-bg-alt', layerBackgrounds[4]);

  const primaryText = text?.primary || colors.neutral.light;
  const mutedText = text?.muted || colors.neutral.base;

  setCSSVariable(root, '--text-color', primaryText);
  setCSSVariable(root, '--text-muted', mutedText);
  setCSSVariable(root, '--card-text', primaryText);
  setCSSVariable(root, '--heading-color', text?.primary || primaryText);

  const actionButtonGradient = buildGradient(colors.primary.dark, colors.primary.light);
  const actionButtonActiveGradient = buildGradient(colors.secondary.dark, colors.secondary.light);

  setCSSVariable(root, '--action-button-bg', actionButtonGradient);
  setCSSVariable(root, '--action-button-text', primaryText);
  setCSSVariable(root, '--action-button-shadow', `0 3px 12px ${rgbaFromHex(colors.primary.dark, 0.4)}`);
  setCSSVariable(root, '--action-button-shadow-hover', `0 10px 24px ${rgbaFromHex(colors.primary.dark, 0.5)}`);
  setCSSVariable(root, '--action-button-bg-active', actionButtonActiveGradient);
  setCSSVariable(root, '--action-button-text-active', colors.neutral.light);
  setCSSVariable(root, '--action-button-shadow-active', `0 12px 26px ${rgbaFromHex(colors.secondary.dark, 0.45)}`);

  setCSSVariable(root, '--chip-bg', rgbaFromHex(colors.neutral.dark, 0.6));
  setCSSVariable(root, '--chip-bg-hover', rgbaFromHex(colors.neutral.dark, 0.75));
  setCSSVariable(root, '--chip-bg-active', rgbaFromHex(colors.neutral.dark, 0.9));

  setCSSVariable(root, '--outline-strong', colors.primary.light);
  setCSSVariable(root, '--border-strong', rgbaFromHex(colors.neutral.dark, 0.6));
  setCSSVariable(root, '--border-soft', rgbaFromHex(colors.neutral.dark, 0.35));
  setCSSVariable(root, '--backdrop-shadow', `0 24px 60px ${rgbaFromHex(colors.background.dark, 0.55)}`);

  setCSSVariable(root, '--accent-glow-soft', rgbaFromHex(colors.accent.light, 0.4));

  applyStandardColorVariables(root, standardColors);

  body.dataset.themeAppearance = theme.appearance;
}

function updateTheme(nextTheme, { persist = true } = {}) {
  if (!VALID_THEMES.has(nextTheme)) return;

  if (persist) {
    hasStoredPreference = true;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch (error) {
      console.warn('Unable to persist theme preference.', error);
    }
  }

  currentTheme = nextTheme;
  applyThemeClass();
  applyThemeVariables();
  notifyListeners();
}

function setupSystemPreferenceListener() {
  const query = resolveSystemPreferenceQuery();
  if (!query || systemPreferenceListener) {
    return;
  }

  const handleChange = event => {
    if (hasStoredPreference) {
      return;
    }
    const matches = typeof event?.matches === 'boolean' ? event.matches : !!query.matches;
    const preferredAppearance = matches ? 'dark' : 'light';
    const nextTheme =
      THEME_DEFINITIONS.find(theme => theme.appearance === preferredAppearance)?.id || currentTheme;
    updateTheme(nextTheme, { persist: false });
  };

  if (typeof query.addEventListener === 'function') {
    query.addEventListener('change', handleChange);
    systemPreferenceListener = () => {
      query.removeEventListener('change', handleChange);
      systemPreferenceListener = null;
    };
  } else if (typeof query.addListener === 'function') {
    query.addListener(handleChange);
    systemPreferenceListener = () => {
      query.removeListener(handleChange);
      systemPreferenceListener = null;
    };
  }
}

function applyThemeClass() {
  if (typeof document === 'undefined' || !document.body) return;
  const { body } = document;
  body.classList.remove(...THEME_CLASSES);
  if (currentTheme) {
    body.classList.add(`theme-${currentTheme}`);
  }
}

function notifyListeners() {
  const themeDefinition = THEME_INDEX.get(currentTheme);
  listeners.forEach(listener => {
    try {
      listener(currentTheme, themeDefinition);
    } catch (error) {
      console.error('Theme listener error', error);
    }
  });
}

export function initTheme() {
  applyThemeClass();
  applyThemeVariables();
  notifyListeners();
  setupSystemPreferenceListener();
}

export function getTheme() {
  return currentTheme;
}

export function getThemeDefinition(themeId = currentTheme) {
  return THEME_INDEX.get(themeId) || null;
}

export function getAvailableThemes() {
  return THEME_DEFINITIONS.map(({ id, name, appearance, colors, standardColors }) => ({
    id,
    name,
    appearance,
    colors,
    standardColors
  }));
}

export function setTheme(nextTheme) {
  if (!VALID_THEMES.has(nextTheme)) return;
  updateTheme(nextTheme, { persist: true });
}

export function onThemeChange(listener, { immediate = false } = {}) {
  if (typeof listener !== 'function') {
    return () => {};
  }
  listeners.add(listener);
  if (immediate) {
    try {
      listener(currentTheme, THEME_INDEX.get(currentTheme));
    } catch (error) {
      console.error('Theme listener error', error);
    }
  }
  return () => {
    listeners.delete(listener);
  };
}

export { STANDARD_COLOR_KEYS };
