const THEME_SELECTION_STORAGE_KEY = 'theme:selected';
const THEME_APPEARANCE_STORAGE_KEY = 'theme:appearance';
const LEGACY_THEME_STORAGE_KEYS = ['theme'];
const LEGACY_THEME_ALIASES = new Map([
  ['lunar-surface-dawn', 'lunar-surface']
]);
const APPEARANCE_VALUES = new Set(['light', 'dark']);

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

/**
 * @typedef {Object} ColorScale
 * @property {string} [light]
 * @property {string} [base]
 * @property {string} [dark]
 */

/**
 * @typedef {Object} ThemeColors
 * @property {ColorScale} [background]
 * @property {ColorScale} [neutral]
 * @property {ColorScale} [primary]
 * @property {ColorScale} [secondary]
 * @property {ColorScale} [accent]
 */

function clamp(value, min = 0, max = 1) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return min;
  }
  return Math.min(Math.max(value, min), max);
}

function normalizeHex(hex) {
  if (!hex) return null;
  const value = String(hex).trim();
  if (!value) return null;
  const prefixed = value.startsWith('#') ? value.slice(1) : value;
  if (/^([0-9a-f]{6})$/i.test(prefixed)) {
    return `#${prefixed.toLowerCase()}`;
  }
  if (/^([0-9a-f]{3})$/i.test(prefixed)) {
    const [r, g, b] = prefixed.split('');
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return null;
}

function hexToRgb(hex) {
  const normalized = normalizeHex(hex);
  if (!normalized) return null;
  const value = normalized.slice(1);
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  if ([r, g, b].some(channel => Number.isNaN(channel))) {
    return null;
  }
  return { r, g, b };
}

function rgbToHex({ r, g, b }) {
  const red = clamp(Math.round(r), 0, 255);
  const green = clamp(Math.round(g), 0, 255);
  const blue = clamp(Math.round(b), 0, 255);
  return `#${[red, green, blue]
    .map(channel => channel.toString(16).padStart(2, '0'))
    .join('')}`;
}

function mixHex(hexA, hexB, weight = 0.5) {
  const colorA = hexToRgb(hexA);
  const colorB = hexToRgb(hexB);
  if (!colorA || !colorB) {
    return normalizeHex(hexA) || normalizeHex(hexB);
  }
  const ratio = clamp(weight, 0, 1);
  return rgbToHex({
    r: colorA.r * (1 - ratio) + colorB.r * ratio,
    g: colorA.g * (1 - ratio) + colorB.g * ratio,
    b: colorA.b * (1 - ratio) + colorB.b * ratio
  });
}

function lightenHex(hex, amount = 0.15) {
  return mixHex(hex, '#ffffff', clamp(amount, 0, 1));
}

function darkenHex(hex, amount = 0.15) {
  return mixHex(hex, '#000000', clamp(amount, 0, 1));
}

function relativeLuminance(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const components = [rgb.r, rgb.g, rgb.b].map(channel => {
    const value = channel / 255;
    if (value <= 0.03928) {
      return value / 12.92;
    }
    return Math.pow((value + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * components[0] + 0.7152 * components[1] + 0.0722 * components[2];
}

function contrastRatio(foreground, background) {
  const fg = normalizeHex(foreground);
  const bg = normalizeHex(background);
  if (!fg || !bg) return 1;
  const fgLum = relativeLuminance(fg);
  const bgLum = relativeLuminance(bg);
  const lighter = Math.max(fgLum, bgLum);
  const darker = Math.min(fgLum, bgLum);
  return (lighter + 0.05) / (darker + 0.05);
}

function ensureContrast(foreground, background, minimumRatio = 4.5) {
  const bg = normalizeHex(background);
  if (!bg) {
    return normalizeHex(foreground) || '#ffffff';
  }

  const baseForeground = normalizeHex(foreground);
  const backgroundLum = relativeLuminance(bg);
  const preferredTarget = backgroundLum > 0.5 ? '#111827' : '#f9fafb';
  const alternateTarget = backgroundLum > 0.5 ? '#f9fafb' : '#111827';

  const candidates = [];
  if (baseForeground) {
    candidates.push({ color: baseForeground, ratio: contrastRatio(baseForeground, bg) });
  }
  candidates.push({ color: normalizeHex(preferredTarget), ratio: contrastRatio(preferredTarget, bg) });
  candidates.push({ color: normalizeHex(alternateTarget), ratio: contrastRatio(alternateTarget, bg) });

  let best = candidates
    .filter(candidate => candidate.color)
    .sort((a, b) => b.ratio - a.ratio)[0];

  if (!best) {
    return '#ffffff';
  }

  if (best.ratio >= minimumRatio) {
    return best.color;
  }

  const target = backgroundLum > 0.5 ? '#000000' : '#ffffff';
  let adjusted = best.color;
  let ratio = best.ratio;
  for (let step = 0; step < 6 && ratio < minimumRatio; step += 1) {
    adjusted = mixHex(adjusted, target, 0.35);
    ratio = contrastRatio(adjusted, bg);
  }

  return ratio >= minimumRatio ? adjusted : best.color;
}

/**
 * @param {ColorScale} [scale]
 * @returns {{ light: string, base: string, dark: string }}
 */
function fillColorScale(scale = {}) {
  const base = normalizeHex(scale.base) || normalizeHex(scale.light) || normalizeHex(scale.dark) || '#6b7280';
  const light = normalizeHex(scale.light) || lightenHex(base, 0.18);
  const dark = normalizeHex(scale.dark) || darkenHex(base, 0.22);
  return { light, base: normalizeHex(scale.base) || base, dark };
}

function pickStandardColor(standardColors, key, tone = 'light') {
  if (!standardColors || !key) return null;
  const palette = standardColors[key];
  if (!palette) return null;
  return normalizeHex(palette[tone]) || null;
}

const THEME_DEFINITIONS = [
  {
    id: 'lunar-surface',
    meta: {
      label: 'Lunar Surface',
      emoji: '🌕',
      image:
        'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Full%20Moon/3D/full_moon_3d.png',
    },
    appearance: 'dark',
    colors: {
      background: { light: '#2d3036', base: '#1f2228', dark: '#111419' },
      neutral: { light: '#d8dbe2', base: '#b4b8c1', dark: '#828690' },
      primary: { light: '#c1c4cc', base: '#a0a4ac', dark: '#72757c' },
      secondary: { light: '#acb0b8', base: '#8e929a', dark: '#63666d' },
      accent: { light: '#d0d3da', base: '#b1b5bd', dark: '#7f8289' }
    },
    standardColors: {
      red: { light: '#d7dadd', dark: '#6b6e74' },
      orange: { light: '#cfd1d6', dark: '#686b71' },
      yellow: { light: '#c7cacf', dark: '#5f6268' },
      green: { light: '#c1c4c9', dark: '#585b60' },
      blue: { light: '#bbbfc5', dark: '#51555c' },
      pink: { light: '#d2d5da', dark: '#6a6d73' },
      purple: { light: '#c6c9d0', dark: '#5d6168' },
      brown: { light: '#bfc2c7', dark: '#55585e' }
    },
    text: {
      primary: '#f0f2f7',
      muted: '#b9bdc5'
    },
    appearances: {
      light: {
        colors: {
          background: { light: '#f5f6f8', base: '#e5e7eb', dark: '#c2c5cc' },
          neutral: { light: '#4f5359', base: '#383c42', dark: '#202329' },
          primary: { light: '#6d7178', base: '#555960', dark: '#3a3e44' },
          secondary: { light: '#90949c', base: '#757981', dark: '#4f535a' },
          accent: { light: '#a4a8b0', base: '#878b93', dark: '#5d6168' }
        },
        standardColors: {
          red: { light: '#a6a9af', dark: '#4a4d53' },
          orange: { light: '#b0b3b9', dark: '#505359' },
          yellow: { light: '#bbbfc6', dark: '#555960' },
          green: { light: '#aeb1b8', dark: '#4c5056' },
          blue: { light: '#a1a5ac', dark: '#45494f' },
          pink: { light: '#b7bac1', dark: '#53565d' },
          purple: { light: '#bfc2ca', dark: '#595d63' },
          brown: { light: '#a7abb2', dark: '#4a4e54' }
        },
        text: {
          primary: '#1c1f23',
          muted: '#4f535a'
        }
      }
    }
  },
  {
    id: 'apple-orchard',
    meta: {
      label: 'Apple Orchard',
      emoji: '🍎',
      image:
        'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Red%20Apple/3D/red_apple_3d.png',
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
      image:
        'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Red%20Heart/3D/red_heart_3d.png',
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
      image:
        'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Evergreen%20Tree/3D/evergreen_tree_3d.png',
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
      image:
        'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Fire/3D/fire_3d.png',
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
      image:
        'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Fireworks/3D/fireworks_3d.png',
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
      image:
        'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Rose/3D/rose_3d.png',
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
      image:
        'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Musical%20Notes/3D/musical_notes_3d.png',
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
      image:
        'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Water%20Wave/3D/water_wave_3d.png',
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
      image:
        'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Sun/3D/sun_3d.png',
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
      image:
        'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Crescent%20Moon/3D/crescent_moon_3d.png',
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
      image:
        'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Snowflake/3D/snowflake_3d.png',
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
      image:
        'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Mountain/3D/mountain_3d.png',
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
      image:
        'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Hot%20Beverage/3D/hot_beverage_3d.png',
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
      image:
        'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Leaf%20Fluttering%20In%20Wind/3D/leaf_fluttering_in_wind_3d.png',
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
      image:
        'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Cloud%20With%20Lightning/3D/cloud_with_lightning_3d.png',
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

function resolveThemeAppearance(theme, appearance) {
  if (!theme) {
    return { colors: {}, standardColors: undefined, text: undefined, legendColors: undefined };
  }

  const baseColors = theme.colors ? { ...theme.colors } : {};
  const baseStandardColors = theme.standardColors ? { ...theme.standardColors } : undefined;
  const baseText = theme.text ? { ...theme.text } : undefined;
  const baseLegendColors = theme.legendColors ? { ...theme.legendColors } : undefined;

  const variants = theme.appearances || null;
  const variant =
    variants?.[appearance] || (theme.appearance && variants?.[theme.appearance]) || null;

  if (!variant) {
    return {
      colors: baseColors,
      standardColors: baseStandardColors,
      text: baseText,
      legendColors: baseLegendColors
    };
  }

  const colors = variant.colors ? { ...baseColors, ...variant.colors } : baseColors;
  const standardColors = variant.standardColors || baseStandardColors;
  const text = variant.text || baseText;
  const legendColors = variant.legendColors
    ? { ...(baseLegendColors || {}), ...variant.legendColors }
    : baseLegendColors;

  return { colors, standardColors, text, legendColors };
}

const THEME_INDEX = new Map(THEME_DEFINITIONS.map(theme => [theme.id, theme]));
const VALID_THEMES = new Set(THEME_DEFINITIONS.map(theme => theme.id));
const THEME_CLASSES = THEME_DEFINITIONS.map(theme => `theme-${theme.id}`);

function toThemeExport(theme, activeAppearance = currentAppearance) {
  if (!theme) return null;
  const meta = theme.meta ? { ...theme.meta } : { label: '', emoji: '', image: null };
  const resolved = resolveThemeAppearance(theme, activeAppearance);
  return {
    ...theme,
    meta,
    colors: resolved.colors,
    standardColors: resolved.standardColors,
    text: resolved.text,
    name: meta.emoji || '',
    label: meta.label || '',
    activeAppearance
  };
}

const listeners = new Set();

let hasStoredThemePreference = false;
let hasStoredAppearancePreference = false;
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

function detectPreferredAppearance() {
  const keys = [THEME_APPEARANCE_STORAGE_KEY, ...LEGACY_THEME_STORAGE_KEYS];
  for (const key of keys) {
    try {
      const stored = localStorage.getItem(key);
      if (stored && APPEARANCE_VALUES.has(stored)) {
        hasStoredAppearancePreference = true;
        return stored;
      }
    } catch (error) {
      console.warn('Unable to access theme appearance preference.', error);
    }
  }
  const query = resolveSystemPreferenceQuery();
  const prefersDark = query && typeof query.matches === 'boolean' ? query.matches : true;
  return prefersDark ? 'dark' : 'light';
}

function detectPreferredTheme(preferredAppearance) {
  const appearance = preferredAppearance || currentAppearance || 'dark';
  const fallback = THEME_DEFINITIONS.find(theme => theme.appearance === appearance)
    || THEME_DEFINITIONS[0];
  return fallback?.id || THEME_DEFINITIONS[0]?.id;
}

function readStoredThemeSelection() {
  const keys = [THEME_SELECTION_STORAGE_KEY, ...LEGACY_THEME_STORAGE_KEYS];
  for (const key of keys) {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        if (VALID_THEMES.has(stored)) {
          return stored;
        }
        const alias = LEGACY_THEME_ALIASES.get(stored);
        if (alias && VALID_THEMES.has(alias)) {
          return alias;
        }
      }
    } catch (error) {
      console.warn('Unable to access theme preference storage.', error);
    }
  }
  return null;
}

let currentAppearance = detectPreferredAppearance();

let currentTheme = (() => {
  const storedTheme = readStoredThemeSelection();
  if (storedTheme) {
    hasStoredThemePreference = true;
    return storedTheme;
  }
  return detectPreferredTheme(currentAppearance);
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
    const light = normalizeHex(palette.light);
    const dark = normalizeHex(palette.dark);
    setCSSVariable(root, `--color-${key}-light`, light || '');
    setCSSVariable(root, `--color-${key}-dark`, dark || '');
  });
}

function buildGradient(from, to) {
  if (!from || !to) return '';
  return `linear-gradient(135deg, ${from}, ${to})`;
}

function rgbaFromHex(hex, alpha = 1) {
  const normalized = normalizeHex(hex);
  if (!normalized) return '';
  const r = parseInt(normalized.slice(1, 3), 16);
  const g = parseInt(normalized.slice(3, 5), 16);
  const b = parseInt(normalized.slice(5, 7), 16);
  if ([r, g, b].some(channel => Number.isNaN(channel))) {
    return '';
  }
  const clampedAlpha = Math.round(clamp(alpha, 0, 1) * 1000) / 1000;
  return `rgba(${r}, ${g}, ${b}, ${clampedAlpha})`;
}

function applyThemeVariables() {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const body = document.body;
  if (!root || !body) return;
  const theme = THEME_INDEX.get(currentTheme);
  if (!theme) return;

  const { colors: rawColors, standardColors, text, legendColors } = resolveThemeAppearance(
    theme,
    currentAppearance
  );

  /** @type {ThemeColors} */
  const colors = rawColors || {};

  const backgroundScale = fillColorScale(colors.background || {});
  const neutralScale = fillColorScale(colors.neutral || {});
  const primaryScale = fillColorScale(colors.primary || {});
  const secondaryScale = fillColorScale(colors.secondary || {});
  const accentScale = fillColorScale(colors.accent || {});

  let backgroundBase;
  let backgroundLight;
  let backgroundDark;
  let backgroundStrong;
  let neutralBase;
  let neutralLight;
  let neutralDark;
  let neutralStrong;
  let layerBackgrounds;

  if (currentAppearance === 'light') {
    backgroundBase = backgroundScale.light;
    backgroundLight = lightenHex(backgroundBase, 0.12);
    backgroundDark = backgroundScale.base;
    backgroundStrong = darkenHex(backgroundScale.base, 0.22);

    neutralBase = neutralScale.light;
    neutralLight = lightenHex(neutralBase, 0.12);
    neutralDark = neutralScale.base;
    neutralStrong = neutralScale.dark;

    layerBackgrounds = [
      backgroundBase,
      backgroundLight,
      lightenHex(backgroundLight, 0.14),
      neutralBase,
      neutralLight
    ];
  } else {
    backgroundBase = backgroundScale.base;
    backgroundLight = backgroundScale.light;
    backgroundDark = backgroundScale.dark;
    backgroundStrong = darkenHex(backgroundDark, 0.28);

    neutralBase = neutralScale.base;
    neutralLight = neutralScale.light;
    neutralDark = neutralScale.dark;
    neutralStrong = darkenHex(neutralDark, 0.24);

    layerBackgrounds = [
      backgroundStrong,
      backgroundBase,
      backgroundLight,
      neutralDark,
      neutralBase
    ];
  }

  setCSSVariable(root, '--color-background', backgroundBase);
  setCSSVariable(root, '--color-background-light', backgroundLight);
  setCSSVariable(root, '--color-background-dark', backgroundDark);

  setCSSVariable(root, '--color-neutral', neutralBase);
  setCSSVariable(root, '--color-neutral-light', neutralLight);
  setCSSVariable(root, '--color-neutral-dark', neutralDark);

  setCSSVariable(root, '--color-primary', primaryScale.base);
  setCSSVariable(root, '--color-primary-light', primaryScale.light);
  setCSSVariable(root, '--color-primary-dark', primaryScale.dark);

  setCSSVariable(root, '--color-secondary', secondaryScale.base);
  setCSSVariable(root, '--color-secondary-light', secondaryScale.light);
  setCSSVariable(root, '--color-secondary-dark', secondaryScale.dark);

  setCSSVariable(root, '--color-accent', accentScale.base);
  setCSSVariable(root, '--color-accent-light', accentScale.light);
  setCSSVariable(root, '--color-accent-dark', accentScale.dark);
  setCSSVariable(root, '--accent', accentScale.base);
  setCSSVariable(root, '--accent-500', accentScale.base);
  setCSSVariable(root, '--accent-bright', accentScale.light);
  setCSSVariable(root, '--accent-strong', accentScale.dark);

  setCSSVariable(root, '--layer-background-0', layerBackgrounds[0]);
  setCSSVariable(root, '--layer-background-1', layerBackgrounds[1]);
  setCSSVariable(root, '--layer-background-2', layerBackgrounds[2]);
  setCSSVariable(root, '--layer-background-3', layerBackgrounds[3]);
  setCSSVariable(root, '--layer-background-4', layerBackgrounds[4]);

  const surface1 = layerBackgrounds[1] || backgroundBase;
  const surface2 = layerBackgrounds[2] || surface1;
  const surface3 = layerBackgrounds[3] || surface2;
  const surface4 = layerBackgrounds[4] || surface3;
  const backgroundRoot = layerBackgrounds[0] || backgroundBase;

  setCSSVariable(root, '--bg', backgroundRoot);
  setCSSVariable(root, '--surface', surface1);
  setCSSVariable(root, '--surface-1', surface1);
  setCSSVariable(root, '--surface-2', surface2);
  setCSSVariable(root, '--surface-3', surface3);
  setCSSVariable(root, '--surface-4', surface4);

  setCSSVariable(root, '--bg-color', backgroundRoot);
  setCSSVariable(root, '--surface-color', surface1);
  setCSSVariable(root, '--surface-alt-color', surface2);
  setCSSVariable(root, '--surface-strong-color', surface3);

  setCSSVariable(root, '--menu-bg', layerBackgrounds[1]);
  setCSSVariable(root, '--map-bg', layerBackgrounds[1]);
  const mapBorderAlpha = currentAppearance === 'light' ? 0.32 : 0.45;
  const mapBorderStrongAlpha = currentAppearance === 'light' ? 0.4 : 0.55;
  setCSSVariable(root, '--map-border', rgbaFromHex(primaryScale.dark, mapBorderAlpha));
  setCSSVariable(root, '--map-border-strong', rgbaFromHex(secondaryScale.dark, mapBorderStrongAlpha));

  setCSSVariable(root, '--action-panel-bg', layerBackgrounds[2]);
  setCSSVariable(root, '--action-option-bg', layerBackgrounds[3]);
  setCSSVariable(root, '--card-bg', layerBackgrounds[3]);
  setCSSVariable(root, '--card-bg-alt', layerBackgrounds[4]);

  const baseSurface = surface1;
  const cardSurface = surface3;

  const primaryText = ensureContrast(text?.primary, baseSurface, 4.6);
  const mutedText = ensureContrast(text?.muted, baseSurface, 3.2);
  const headingText = ensureContrast(text?.primary, cardSurface, 4.6);

  setCSSVariable(root, '--text-color', primaryText);
  setCSSVariable(root, '--text', primaryText);
  setCSSVariable(root, '--text-strong', headingText);
  setCSSVariable(root, '--text-muted', mutedText);
  setCSSVariable(root, '--card-text', ensureContrast(text?.primary, cardSurface, 4.6));
  setCSSVariable(root, '--heading-color', headingText);

  const accentContrast = ensureContrast(text?.primary, accentScale.base, 4.6);
  setCSSVariable(root, '--accent-contrast', accentContrast);

  const actionButtonGradient = buildGradient(primaryScale.dark, primaryScale.light);
  const actionButtonActiveGradient = buildGradient(secondaryScale.dark, secondaryScale.light);

  setCSSVariable(root, '--action-button-bg', actionButtonGradient);
  setCSSVariable(root, '--action-button-text', ensureContrast(primaryText, primaryScale.dark, 4.6));
  const actionShadowBase = currentAppearance === 'light' ? 0.25 : 0.4;
  const actionShadowHover = currentAppearance === 'light' ? 0.3 : 0.5;
  const actionShadowActive = currentAppearance === 'light' ? 0.3 : 0.45;
  setCSSVariable(root, '--action-button-shadow', `0 3px 12px ${rgbaFromHex(primaryScale.dark, actionShadowBase)}`);
  setCSSVariable(root, '--action-button-shadow-hover', `0 10px 24px ${rgbaFromHex(primaryScale.dark, actionShadowHover)}`);
  setCSSVariable(root, '--action-button-bg-active', actionButtonActiveGradient);
  setCSSVariable(root, '--action-button-text-active', ensureContrast(primaryText, secondaryScale.dark, 4.6));
  setCSSVariable(root, '--action-button-shadow-active', `0 12px 26px ${rgbaFromHex(secondaryScale.dark, actionShadowActive)}`);

  const chipBase = mixHex(neutralDark, baseSurface, currentAppearance === 'light' ? 0.6 : 0.35);
  const chipHover = mixHex(neutralDark, baseSurface, currentAppearance === 'light' ? 0.5 : 0.28);
  const chipActive = mixHex(neutralDark, baseSurface, currentAppearance === 'light' ? 0.42 : 0.22);
  setCSSVariable(root, '--chip-bg', chipBase);
  setCSSVariable(root, '--chip-bg-hover', chipHover);
  setCSSVariable(root, '--chip-bg-active', chipActive);

  setCSSVariable(root, '--outline-strong', primaryScale.light);
  const borderStrong = mixHex(neutralStrong, baseSurface, currentAppearance === 'light' ? 0.35 : 0.6);
  const borderSoft = mixHex(neutralStrong, baseSurface, currentAppearance === 'light' ? 0.65 : 0.35);
  setCSSVariable(root, '--border-strong', borderStrong);
  setCSSVariable(root, '--border-soft', borderSoft);

  const backdropAlpha = currentAppearance === 'light' ? 0.28 : 0.55;
  setCSSVariable(root, '--backdrop-shadow', `0 24px 60px ${rgbaFromHex(backgroundStrong, backdropAlpha)}`);

  setCSSVariable(
    root,
    '--accent-glow-soft',
    rgbaFromHex(accentScale.light, currentAppearance === 'light' ? 0.35 : 0.4)
  );

  applyStandardColorVariables(root, standardColors);

  body.dataset.themeAppearance = currentAppearance;
}

function updateTheme(nextTheme, { persist = true } = {}) {
  if (!VALID_THEMES.has(nextTheme)) return;

  if (persist) {
    hasStoredThemePreference = true;
    try {
      localStorage.setItem(THEME_SELECTION_STORAGE_KEY, nextTheme);
      if (LEGACY_THEME_STORAGE_KEYS[0]) {
        localStorage.setItem(LEGACY_THEME_STORAGE_KEYS[0], nextTheme);
      }
    } catch (error) {
      console.warn('Unable to persist theme preference.', error);
    }
  }

  currentTheme = nextTheme;
  applyThemeClass();
  applyThemeVariables();
  notifyListeners();
}

function applyAppearance(nextAppearance, { persist = true, notify = true } = {}) {
  if (!APPEARANCE_VALUES.has(nextAppearance)) {
    return;
  }
  if (nextAppearance === currentAppearance) {
    return;
  }
  if (persist) {
    hasStoredAppearancePreference = true;
    try {
      localStorage.setItem(THEME_APPEARANCE_STORAGE_KEY, nextAppearance);
    } catch (error) {
      console.warn('Unable to persist theme appearance preference.', error);
    }
  }
  currentAppearance = nextAppearance;
  applyThemeVariables();
  if (notify) {
    notifyListeners();
  }
}

function setupSystemPreferenceListener() {
  const query = resolveSystemPreferenceQuery();
  if (!query || systemPreferenceListener) {
    return;
  }

  const handleChange = event => {
    if (hasStoredAppearancePreference) {
      return;
    }
    const matches = typeof event?.matches === 'boolean' ? event.matches : !!query.matches;
    const preferredAppearance = matches ? 'dark' : 'light';
    const nextTheme =
      THEME_DEFINITIONS.find(theme => theme.appearance === preferredAppearance)?.id || currentTheme;
    const willChangeTheme = !hasStoredThemePreference && nextTheme !== currentTheme;
    applyAppearance(preferredAppearance, { persist: false, notify: !willChangeTheme });
    if (!hasStoredThemePreference && willChangeTheme) {
      updateTheme(nextTheme, { persist: false });
    }
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
  const exportableTheme = toThemeExport(themeDefinition, currentAppearance);
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
  return toThemeExport(THEME_INDEX.get(themeId), currentAppearance);
}

export function getAvailableThemes() {
  return THEME_DEFINITIONS.map(theme => toThemeExport(theme, currentAppearance));
}

export function setTheme(nextTheme) {
  if (!VALID_THEMES.has(nextTheme)) return;
  updateTheme(nextTheme, { persist: true });
}

export function getThemeAppearance() {
  return currentAppearance;
}

export function setThemeAppearance(nextAppearance) {
  applyAppearance(nextAppearance, { persist: true, notify: true });
}

export function onThemeChange(listener, { immediate = false } = {}) {
  if (typeof listener !== 'function') {
    return () => {};
  }
  listeners.add(listener);
  if (immediate) {
    try {
      listener(currentTheme, toThemeExport(THEME_INDEX.get(currentTheme), currentAppearance));
    } catch (error) {
      console.error('Theme listener error', error);
    }
  }
  return () => {
    listeners.delete(listener);
  };
}

export { STANDARD_COLOR_KEYS };
