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
    id: 'apple-orchard',
    meta: {
      label: 'Apple Orchard',
      emoji: '🍎',
      image: null
    },
    appearance: 'dark',
    colors: {
      background: { light: '#3a181b', base: '#271012', dark: '#120708' },
      neutral: { light: '#e4cfc9', base: '#b68f84', dark: '#7d6257' },
      primary: { light: '#ff6b6f', base: '#d9393e', dark: '#941c20' },
      secondary: { light: '#8ed97a', base: '#5faa4c', dark: '#3a6f2b' },
      accent: { light: '#f0b36a', base: '#c87f2f', dark: '#8a4f12' }
    },
    standardColors: {
      red: { light: '#ff6b6f', dark: '#941c20' },
      orange: { light: '#ff9b4f', dark: '#a85318' },
      yellow: { light: '#ffe38a', dark: '#b38a1b' },
      green: { light: '#8ed97a', dark: '#2f6b2a' },
      blue: { light: '#7fc1f7', dark: '#215b8e' },
      pink: { light: '#f7a1b5', dark: '#9a4963' },
      purple: { light: '#c29aff', dark: '#6c3ab8' },
      brown: { light: '#d7a47d', dark: '#7b4a2d' }
    },
    text: {
      primary: '#fbeae7',
      muted: '#c7a8a0'
    }
  },
  {
    id: 'heartbeat-glow',
    meta: {
      label: 'Heartbeat Glow',
      emoji: '❤️',
      image: null
    },
    appearance: 'dark',
    colors: {
      background: { light: '#431a2a', base: '#301320', dark: '#14060d' },
      neutral: { light: '#efd1da', base: '#c79aa9', dark: '#8a6976' },
      primary: { light: '#ff6b8f', base: '#ff3366', dark: '#b1123d' },
      secondary: { light: '#ffa4d9', base: '#ff6fbf', dark: '#c13f8a' },
      accent: { light: '#ffd27f', base: '#ffb347', dark: '#b47618' }
    },
    standardColors: {
      red: { light: '#ff6b8f', dark: '#b1123d' },
      orange: { light: '#ff9354', dark: '#b5541c' },
      yellow: { light: '#ffe382', dark: '#b88a20' },
      green: { light: '#9de2c0', dark: '#2f7a52' },
      blue: { light: '#7fbbff', dark: '#245a9d' },
      pink: { light: '#ff9ed1', dark: '#aa4d83' },
      purple: { light: '#c69dff', dark: '#6f3fab' },
      brown: { light: '#d7a691', dark: '#7a4937' }
    },
    text: {
      primary: '#ffeef3',
      muted: '#d7a3b7'
    }
  },
  {
    id: 'evergreen-grove',
    meta: {
      label: 'Evergreen Grove',
      emoji: '🌳',
      image: null
    },
    appearance: 'light',
    colors: {
      background: { light: '#f7fbf5', base: '#edf5eb', dark: '#c7d5c4' },
      neutral: { light: '#88977f', base: '#5b6a54', dark: '#394637' },
      primary: { light: '#63b36a', base: '#3d8543', dark: '#24562a' },
      secondary: { light: '#9dc98a', base: '#7aa66a', dark: '#4c7341' },
      accent: { light: '#f2c78d', base: '#c9985b', dark: '#8f6330' }
    },
    standardColors: {
      red: { light: '#f07f6f', dark: '#9c3b2c' },
      orange: { light: '#f6a85f', dark: '#b16019' },
      yellow: { light: '#fbe183', dark: '#b39829' },
      green: { light: '#7dd687', dark: '#2d6a35' },
      blue: { light: '#7fb5d9', dark: '#285c7d' },
      pink: { light: '#f2adc5', dark: '#9b4f74' },
      purple: { light: '#bfa6ec', dark: '#62479f' },
      brown: { light: '#cba581', dark: '#6c4b2e' }
    },
    text: {
      primary: '#263322',
      muted: '#546250'
    }
  },
  {
    id: 'ember-forge',
    meta: {
      label: 'Ember Forge',
      emoji: '🔥',
      image: null
    },
    appearance: 'dark',
    colors: {
      background: { light: '#401812', base: '#2a0f0a', dark: '#120503' },
      neutral: { light: '#f1d0c2', base: '#d0a89b', dark: '#946f63' },
      primary: { light: '#ff8a52', base: '#ff6b2d', dark: '#b73c07' },
      secondary: { light: '#ffc075', base: '#ff9f43', dark: '#c36a15' },
      accent: { light: '#ffe28a', base: '#ffd166', dark: '#b99229' }
    },
    standardColors: {
      red: { light: '#ff7053', dark: '#b12f1a' },
      orange: { light: '#ff9f43', dark: '#b55311' },
      yellow: { light: '#ffd76a', dark: '#b48b16' },
      green: { light: '#a4d67a', dark: '#436a1f' },
      blue: { light: '#77b4e8', dark: '#1f5387' },
      pink: { light: '#f293b3', dark: '#9d4363' },
      purple: { light: '#c79ae8', dark: '#69399c' },
      brown: { light: '#d49c71', dark: '#7c451b' }
    },
    text: {
      primary: '#fff2ea',
      muted: '#ddb09e'
    }
  },
  {
    id: 'fireworks-festival',
    meta: {
      label: 'Fireworks Festival',
      emoji: '🎆',
      image: null
    },
    appearance: 'light',
    colors: {
      background: { light: '#fbfdff', base: '#f4f7ff', dark: '#d0d9f5' },
      neutral: { light: '#6f7691', base: '#4e5470', dark: '#313752' },
      primary: { light: '#6d81ff', base: '#3d5af1', dark: '#2235a3' },
      secondary: { light: '#ff83da', base: '#ff4ecd', dark: '#c11c92' },
      accent: { light: '#ffe67a', base: '#ffd74f', dark: '#b89711' }
    },
    standardColors: {
      red: { light: '#ff6a86', dark: '#b31e3d' },
      orange: { light: '#ff9a4a', dark: '#b35d0d' },
      yellow: { light: '#ffe67a', dark: '#b5971a' },
      green: { light: '#94e6c3', dark: '#2c7d4f' },
      blue: { light: '#6fb6ff', dark: '#205ea2' },
      pink: { light: '#ffa0de', dark: '#b94b91' },
      purple: { light: '#b79aff', dark: '#5b38b4' },
      brown: { light: '#c8a37a', dark: '#704c22' }
    },
    text: {
      primary: '#202544',
      muted: '#535a79'
    }
  },
  {
    id: 'rose-garden',
    meta: {
      label: 'Rose Garden',
      emoji: '🌹',
      image: null
    },
    appearance: 'light',
    colors: {
      background: { light: '#fff9fb', base: '#fff4f6', dark: '#e7c7d0' },
      neutral: { light: '#9c6b7b', base: '#6f4a57', dark: '#402730' },
      primary: { light: '#ff7a9b', base: '#d03a59', dark: '#911932' },
      secondary: { light: '#ff98b8', base: '#ff7899', dark: '#c5476b' },
      accent: { light: '#b6daa1', base: '#8fbf72', dark: '#55773d' }
    },
    standardColors: {
      red: { light: '#ff7a9b', dark: '#911932' },
      orange: { light: '#ffad71', dark: '#b55e22' },
      yellow: { light: '#ffe6a3', dark: '#b59135' },
      green: { light: '#9fdda7', dark: '#3d7b43' },
      blue: { light: '#7fbef0', dark: '#2a6190' },
      pink: { light: '#ff9ec6', dark: '#b14a7e' },
      purple: { light: '#c8a1e8', dark: '#6a347f' },
      brown: { light: '#d2a28a', dark: '#744434' }
    },
    text: {
      primary: '#2c1a22',
      muted: '#5c3d47'
    }
  },
  {
    id: 'melody-waves',
    meta: {
      label: 'Melody Waves',
      emoji: '🎵',
      image: null
    },
    appearance: 'dark',
    colors: {
      background: { light: '#272b50', base: '#1a1d3b', dark: '#0a0b1b' },
      neutral: { light: '#d6d8f0', base: '#b5b8d8', dark: '#7c80a3' },
      primary: { light: '#7a8aff', base: '#5b6dff', dark: '#2c38b8' },
      secondary: { light: '#b68aff', base: '#9b58ff', dark: '#6221c1' },
      accent: { light: '#58e2d6', base: '#33d1c6', dark: '#17887e' }
    },
    standardColors: {
      red: { light: '#ff6c87', dark: '#a9203a' },
      orange: { light: '#ff9a55', dark: '#b1581a' },
      yellow: { light: '#ffdf73', dark: '#af8b18' },
      green: { light: '#7ce8c3', dark: '#1f7a54' },
      blue: { light: '#7fb6ff', dark: '#244ea2' },
      pink: { light: '#f99ade', dark: '#a7438a' },
      purple: { light: '#c49dff', dark: '#5f33b6' },
      brown: { light: '#c6a48a', dark: '#704b34' }
    },
    text: {
      primary: '#eef0ff',
      muted: '#bfc2df'
    }
  },
  {
    id: 'ocean-tide',
    meta: {
      label: 'Ocean Tide',
      emoji: '🌊',
      image: null
    },
    appearance: 'light',
    colors: {
      background: { light: '#f4fbfd', base: '#e7f4f9', dark: '#bfd6e1' },
      neutral: { light: '#73929e', base: '#4d6773', dark: '#2c3f46' },
      primary: { light: '#3b92c7', base: '#0f6fa4', dark: '#0a4a6e' },
      secondary: { light: '#55c0e6', base: '#2ba5d6', dark: '#176a8d' },
      accent: { light: '#f5c98a', base: '#f2b866', dark: '#af7a24' }
    },
    standardColors: {
      red: { light: '#f57c7d', dark: '#9c2d2f' },
      orange: { light: '#f7a65d', dark: '#b05919' },
      yellow: { light: '#ffe38a', dark: '#b59128' },
      green: { light: '#87dcb3', dark: '#2f7850' },
      blue: { light: '#68c3ff', dark: '#1e5d9a' },
      pink: { light: '#f4a7c8', dark: '#9e4a73' },
      purple: { light: '#b8a0f0', dark: '#5d3f9c' },
      brown: { light: '#c49a76', dark: '#6d4426' }
    },
    text: {
      primary: '#1f2f38',
      muted: '#4a5e69'
    }
  },
  {
    id: 'sunburst-plains',
    meta: {
      label: 'Sunburst Plains',
      emoji: '☀️',
      image: null
    },
    appearance: 'light',
    colors: {
      background: { light: '#fffdf5', base: '#fff8e6', dark: '#e9d5a5' },
      neutral: { light: '#9d8458', base: '#755f36', dark: '#4a3819' },
      primary: { light: '#ffbe4a', base: '#f4a11a', dark: '#b56a06' },
      secondary: { light: '#ffe066', base: '#ffcc33', dark: '#c1900b' },
      accent: { light: '#7cd3dc', base: '#5dbec8', dark: '#2d8087' }
    },
    standardColors: {
      red: { light: '#ff8360', dark: '#b33e1a' },
      orange: { light: '#ffb347', dark: '#b86612' },
      yellow: { light: '#ffe066', dark: '#b6910a' },
      green: { light: '#a7e37c', dark: '#4a8b20' },
      blue: { light: '#7fc4f5', dark: '#2a6aa6' },
      pink: { light: '#f9a4c2', dark: '#a64d6f' },
      purple: { light: '#c9a6ef', dark: '#6d459d' },
      brown: { light: '#d2a877', dark: '#704819' }
    },
    text: {
      primary: '#2c220e',
      muted: '#605235'
    }
  },
  {
    id: 'lunar-serenity',
    meta: {
      label: 'Lunar Serenity',
      emoji: '🌙',
      image: null
    },
    appearance: 'dark',
    colors: {
      background: { light: '#272a42', base: '#1a1c2e', dark: '#0c0d18' },
      neutral: { light: '#e0e3f0', base: '#c6c9dd', dark: '#8b8fa8' },
      primary: { light: '#9aa5ff', base: '#7c89ff', dark: '#3d48b8' },
      secondary: { light: '#daa9ff', base: '#c98bff', dark: '#8640c9' },
      accent: { light: '#ffe7a4', base: '#f6d87d', dark: '#b79a33' }
    },
    standardColors: {
      red: { light: '#ff7083', dark: '#ac2538' },
      orange: { light: '#ff9e55', dark: '#b35a1b' },
      yellow: { light: '#ffe18a', dark: '#b49028' },
      green: { light: '#8edcc2', dark: '#2f7860' },
      blue: { light: '#80c0ff', dark: '#245ca2' },
      pink: { light: '#f5a7da', dark: '#a55a92' },
      purple: { light: '#c3a2ff', dark: '#5e3ab2' },
      brown: { light: '#cdb196', dark: '#755a3b' }
    },
    text: {
      primary: '#f4f5ff',
      muted: '#c2c5da'
    }
  },
  {
    id: 'frostfall-glade',
    meta: {
      label: 'Frostfall Glade',
      emoji: '❄️',
      image: null
    },
    appearance: 'light',
    colors: {
      background: { light: '#ffffff', base: '#f2f8ff', dark: '#c7d8ea' },
      neutral: { light: '#6d7f93', base: '#4f6175', dark: '#2b3746' },
      primary: { light: '#6bc1f2', base: '#4aa4e0', dark: '#1f6498' },
      secondary: { light: '#b2e1ff', base: '#8fd0ff', dark: '#4d8ec7' },
      accent: { light: '#8ee4d8', base: '#6bd4c4', dark: '#2d8a7d' }
    },
    standardColors: {
      red: { light: '#f27f8e', dark: '#a23744' },
      orange: { light: '#f8ad6a', dark: '#b3621f' },
      yellow: { light: '#ffea95', dark: '#b59a24' },
      green: { light: '#7fdcc0', dark: '#2c7955' },
      blue: { light: '#6fc3ff', dark: '#1f5da0' },
      pink: { light: '#f4a6d5', dark: '#9d4f87' },
      purple: { light: '#bfa4f2', dark: '#5f419f' },
      brown: { light: '#c6a584', dark: '#6e4c2e' }
    },
    text: {
      primary: '#24364b',
      muted: '#54677f'
    }
  },
  {
    id: 'granite-peaks',
    meta: {
      label: 'Granite Peaks',
      emoji: '⛰️',
      image: null
    },
    appearance: 'dark',
    colors: {
      background: { light: '#2b2f32', base: '#1f2224', dark: '#0f1112' },
      neutral: { light: '#e0e3e7', base: '#c2c6cb', dark: '#8a8f95' },
      primary: { light: '#8a98a7', base: '#6d7e8f', dark: '#425260' },
      secondary: { light: '#c69b6c', base: '#a57e54', dark: '#6b4b26' },
      accent: { light: '#7fc2b5', base: '#57a999', dark: '#276f60' }
    },
    standardColors: {
      red: { light: '#f07672', dark: '#a32e2c' },
      orange: { light: '#f29a5a', dark: '#ae5c19' },
      yellow: { light: '#f5d877', dark: '#b08a1f' },
      green: { light: '#9dd2a7', dark: '#316a3a' },
      blue: { light: '#7fb1d4', dark: '#264d6c' },
      pink: { light: '#f0a6c5', dark: '#9a4f74' },
      purple: { light: '#b7a0d9', dark: '#5a417f' },
      brown: { light: '#c7a47f', dark: '#6d4a28' }
    },
    text: {
      primary: '#edf0f3',
      muted: '#b7bcc3'
    }
  },
  {
    id: 'hearthside-brew',
    meta: {
      label: 'Hearthside Brew',
      emoji: '☕',
      image: null
    },
    appearance: 'dark',
    colors: {
      background: { light: '#3f2720', base: '#2e1b13', dark: '#170c08' },
      neutral: { light: '#ecd8c9', base: '#d0b5a1', dark: '#9a7f6b' },
      primary: { light: '#d99260', base: '#c47a3d', dark: '#8a4614' },
      secondary: { light: '#ad6c45', base: '#8d4f2c', dark: '#5b2f14' },
      accent: { light: '#f6dba0', base: '#e5c27c', dark: '#b38a38' }
    },
    standardColors: {
      red: { light: '#f07262', dark: '#a32b1c' },
      orange: { light: '#f89c54', dark: '#ae5614' },
      yellow: { light: '#f8d072', dark: '#b1871a' },
      green: { light: '#97d28c', dark: '#3a6c30' },
      blue: { light: '#76b7df', dark: '#1f547a' },
      pink: { light: '#f09ebc', dark: '#94415f' },
      purple: { light: '#c59be1', dark: '#66358d' },
      brown: { light: '#d8aa7c', dark: '#6d3e1b' }
    },
    text: {
      primary: '#fef4ec',
      muted: '#d8b89d'
    }
  },
  {
    id: 'zephyr-leaf',
    meta: {
      label: 'Zephyr Leaf',
      emoji: '🍃',
      image: null
    },
    appearance: 'light',
    colors: {
      background: { light: '#fafffc', base: '#f2fbf4', dark: '#c8e1cd' },
      neutral: { light: '#789883', base: '#56715c', dark: '#334537' },
      primary: { light: '#73c08b', base: '#4fa26d', dark: '#2f7047' },
      secondary: { light: '#a9d8a8', base: '#8ac78a', dark: '#577f57' },
      accent: { light: '#f6d895', base: '#f2c86b', dark: '#b58b2b' }
    },
    standardColors: {
      red: { light: '#f37d78', dark: '#a33a32' },
      orange: { light: '#f7aa63', dark: '#b3621c' },
      yellow: { light: '#ffe08c', dark: '#b19227' },
      green: { light: '#7fd89a', dark: '#2f6d42' },
      blue: { light: '#7ebfde', dark: '#266180' },
      pink: { light: '#f2a9c7', dark: '#964469' },
      purple: { light: '#bea5e6', dark: '#5f3e93' },
      brown: { light: '#c7a378', dark: '#6b4726' }
    },
    text: {
      primary: '#233027',
      muted: '#4f6355'
    }
  },
  {
    id: 'stormspark',
    meta: {
      label: 'Stormspark',
      emoji: '⚡',
      image: null
    },
    appearance: 'dark',
    colors: {
      background: { light: '#202633', base: '#141923', dark: '#07090d' },
      neutral: { light: '#d5d9e4', base: '#b7bdc9', dark: '#7f8591' },
      primary: { light: '#ffe06a', base: '#ffd13b', dark: '#b99105' },
      secondary: { light: '#86c7ff', base: '#5aa9ff', dark: '#1f69b1' },
      accent: { light: '#ff8c5c', base: '#ff6f3c', dark: '#b33a11' }
    },
    standardColors: {
      red: { light: '#ff6e63', dark: '#b22c22' },
      orange: { light: '#ff9945', dark: '#b55612' },
      yellow: { light: '#ffe06a', dark: '#b89316' },
      green: { light: '#8bd9a3', dark: '#2f7341' },
      blue: { light: '#7dbaff', dark: '#1f5ca7' },
      pink: { light: '#f79cd0', dark: '#a24677' },
      purple: { light: '#c7a3ff', dark: '#6138a2' },
      brown: { light: '#c9a281', dark: '#6f4b2a' }
    },
    text: {
      primary: '#f5f6ff',
      muted: '#c3c8d4'
    }
  }
];

const THEME_INDEX = new Map(THEME_DEFINITIONS.map(theme => [theme.id, theme]));
const VALID_THEMES = new Set(THEME_DEFINITIONS.map(theme => theme.id));
const THEME_CLASSES = THEME_DEFINITIONS.map(theme => `theme-${theme.id}`);

function toThemeExport(theme) {
  if (!theme) return null;
  const meta = theme.meta ? { ...theme.meta } : { label: '', emoji: '', image: null };
  return {
    ...theme,
    meta,
    name: meta.emoji || '',
    label: meta.label || ''
  };
}

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
  const exportableTheme = toThemeExport(themeDefinition);
  listeners.forEach(listener => {
    try {
      listener(currentTheme, exportableTheme);
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
  return toThemeExport(THEME_INDEX.get(themeId));
}

export function getAvailableThemes() {
  return THEME_DEFINITIONS.map(theme => toThemeExport(theme));
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
      listener(currentTheme, toThemeExport(THEME_INDEX.get(currentTheme)));
    } catch (error) {
      console.error('Theme listener error', error);
    }
  }
  return () => {
    listeners.delete(listener);
  };
}

export { STANDARD_COLOR_KEYS };
