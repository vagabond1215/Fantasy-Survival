/**
 * @typedef {(
 *   | 'open'
 *   | 'forest'
 *   | 'stone'
 *   | 'ore'
 *   | 'water'
 *   | 'ocean'
 *   | 'open_ocean'
 *   | 'polar_sea'
 *   | 'abyssal_deep'
 *   | 'seamount'
 *   | 'estuary'
 *   | 'delta'
 *   | 'mangrove_forest'
 *   | 'kelp_forest'
 *   | 'coral_reef'
 *   | 'lake'
 *   | 'pond'
 *   | 'river'
 *   | 'stream'
 *   | 'marsh'
  *   | 'mangrove'
 *   | 'bog'
 *   | 'fen'
 *   | 'swamp'
  *   | 'desert'
  *   | 'grassland'
 *   | 'tundra'
 *   | 'taiga'
 *   | 'savanna'
 *   | 'rainforest'
 *   | 'jungle'
 *   | 'wetland'
 *   | 'sand'
 *   | 'coast'
 *   | 'island'
 *   | 'mountain'
 *   | 'alpine'
 *   | 'volcanic'
 *   | 'temperate'
 *   | 'tropical'
 *   | 'plains'
 * )} TileType
 * @typedef {{ start: string, end: string }} TileGradient
 * @typedef {Record<TileType, string>} TilePalette
 * @typedef {Record<TileType, TileGradient>} TileGradientMap
 */

/** @type {Record<TileType, string>} */
const TILE_VARIABLES = {
  open: '--tile-open',
  forest: '--tile-forest',
  stone: '--tile-stone',
  ore: '--tile-ore',
  water: '--tile-water',
  ocean: '--legend-ocean',
  open_ocean: '--legend-open-ocean',
  polar_sea: '--legend-polar-sea',
  abyssal_deep: '--legend-abyssal-deep',
  seamount: '--legend-seamount',
  estuary: '--legend-estuary',
  delta: '--legend-delta',
  mangrove_forest: '--legend-mangrove-forest',
  kelp_forest: '--legend-kelp-forest',
  coral_reef: '--legend-coral-reef',
  lake: '--legend-lake',
  pond: '--legend-pond',
  river: '--legend-river',
  stream: '--legend-stream',
  marsh: '--legend-marsh',
  mangrove: '--legend-mangrove',
  bog: '--legend-bog',
  fen: '--legend-fen',
  swamp: '--legend-swamp',
  grassland: '--legend-grassland',
  desert: '--legend-desert',
  tundra: '--legend-tundra',
  taiga: '--legend-taiga',
  savanna: '--legend-savanna',
  rainforest: '--legend-rainforest',
  jungle: '--legend-jungle',
  wetland: '--legend-wetland',
  sand: '--legend-sand',
  coast: '--legend-coast',
  island: '--legend-island',
  mountain: '--legend-mountain',
  alpine: '--legend-alpine',
  volcanic: '--legend-volcanic',
  temperate: '--legend-temperate',
  tropical: '--legend-tropical',
  plains: '--legend-plains'
};

/** @type {TilePalette} */
const TILE_FALLBACK_COLORS = {
  open: '#facc15',
  forest: '#16a34a',
  stone: '#94a3b8',
  ore: '#f97316',
  water: '#2d7ff9',
  ocean: '#2563eb',
  open_ocean: '#1d4ed8',
  polar_sea: '#bae6fd',
  abyssal_deep: '#0f172a',
  seamount: '#334155',
  estuary: '#2563eb',
  delta: '#3b82f6',
  mangrove_forest: '#047857',
  kelp_forest: '#0f766e',
  coral_reef: '#f97316',
  lake: '#38bdf8',
  pond: '#67e8f9',
  river: '#0ea5e9',
  stream: '#38bdf8',
  marsh: '#4ade80',
  mangrove: '#065f46',
  bog: '#0f5132',
  fen: '#22c55e',
  swamp: '#166534',
  grassland: '#a3e635',
  desert: '#f4b76b',
  tundra: '#9ac5ff',
  taiga: '#2f6b2a',
  savanna: '#f59e0b',
  rainforest: '#047857',
  jungle: '#0f766e',
  wetland: '#22c55e',
  sand: '#fcd34d',
  coast: '#0ea5e9',
  island: '#38bdf8',
  mountain: '#64748b',
  alpine: '#60a5fa',
  volcanic: '#ea580c',
  temperate: '#4ade80',
  tropical: '#10b981',
  plains: '#facc15'
};

const TILE_GRADIENT_VARIABLES = Object.freeze(
  Object.fromEntries(
    Object.keys(TILE_FALLBACK_COLORS).map(key => [
      key,
      {
        start: `--tile-${key}-gradient-start`,
        end: `--tile-${key}-gradient-end`
      }
    ]),
  ),
);

const GRADIENT_LIGHTEN_RATIO = 0.22;
const GRADIENT_DARKEN_RATIO = 0.18;
const DEFAULT_GRADIENT_BASE = '#6b7280';

/** @type {TilePalette | null} */
let cachedPalette = null;
/** @type {TileGradientMap | null} */
let cachedGradients = null;

function clampChannel(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(255, Math.max(0, Math.round(value)));
}

function parseColorToRgb(color) {
  if (!color) return null;
  const value = String(color).trim();
  if (!value) return null;
  const hexMatch = value.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hexMatch) {
    let hex = hexMatch[1];
    if (hex.length === 3) {
      hex = hex
        .split('')
        .map(ch => ch + ch)
        .join('');
    }
    const int = Number.parseInt(hex, 16);
    if (Number.isNaN(int)) return null;
    return {
      r: (int >> 16) & 255,
      g: (int >> 8) & 255,
      b: int & 255
    };
  }
  if (/^rgba?\(/i.test(value)) {
    const numeric = value
      .replace(/rgba?\(/i, '')
      .replace(/\)/g, '')
      .replace(/\//g, ' ')
      .split(/[\s,]+/)
      .filter(Boolean)
      .slice(0, 3)
      .map(part => Number.parseFloat(part));
    if (numeric.length < 3 || numeric.some(channel => Number.isNaN(channel))) {
      return null;
    }
    return {
      r: clampChannel(numeric[0]),
      g: clampChannel(numeric[1]),
      b: clampChannel(numeric[2])
    };
  }
  return null;
}

function rgbToHex({ r, g, b }) {
  return `#${[clampChannel(r), clampChannel(g), clampChannel(b)]
    .map(channel => channel.toString(16).padStart(2, '0'))
    .join('')}`;
}

function mixRgb(base, target, ratio = 0.5) {
  const weight = Math.min(1, Math.max(0, ratio));
  return {
    r: base.r * (1 - weight) + target.r * weight,
    g: base.g * (1 - weight) + target.g * weight,
    b: base.b * (1 - weight) + target.b * weight
  };
}

export function createGradientFromColor(color) {
  const base = parseColorToRgb(color) || parseColorToRgb(DEFAULT_GRADIENT_BASE);
  if (!base) {
    return {
      start: DEFAULT_GRADIENT_BASE,
      end: '#1f2937'
    };
  }
  const light = mixRgb(base, { r: 255, g: 255, b: 255 }, GRADIENT_LIGHTEN_RATIO);
  const dark = mixRgb(base, { r: 0, g: 0, b: 0 }, GRADIENT_DARKEN_RATIO);
  return {
    start: rgbToHex(light),
    end: rgbToHex(dark)
  };
}

/**
 * @param {CSSStyleDeclaration | null} styles
 * @param {string} variable
 * @returns {string}
 */
function readCssVariable(styles, variable) {
  if (!styles) return '';
  try {
    return styles.getPropertyValue(variable) || '';
  } catch (error) {
    return '';
  }
}

/**
 * @returns {TilePalette}
 */
function computeTilePalette() {
  /** @type {CSSStyleDeclaration | null} */
  let styles = null;
  if (typeof document !== 'undefined' && document.documentElement) {
    try {
      styles = getComputedStyle(document.documentElement);
    } catch (error) {
      styles = null;
    }
  }

  /** @type {TilePalette} */
  const palette = { ...TILE_FALLBACK_COLORS };

  Object.keys(TILE_VARIABLES).forEach(key => {
    const type = /** @type {TileType} */ (key);
    const variable = TILE_VARIABLES[type];
    const value = readCssVariable(styles, variable).trim();
    palette[type] = value || TILE_FALLBACK_COLORS[type];
  });

  return palette;
}

/**
 * @param {{ forceRefresh?: boolean }} [options]
 * @returns {TilePalette}
 */
export function resolveTilePalette(options = {}) {
  const { forceRefresh = false } = options;
  if (!cachedPalette || forceRefresh) {
    cachedPalette = computeTilePalette();
  }
  return { ...cachedPalette };
}

export const TILE_COLOR_MAP = resolveTilePalette();

/**
 * @returns {TileGradientMap}
 */
function computeTileGradients() {
  /** @type {CSSStyleDeclaration | null} */
  let styles = null;
  if (typeof document !== 'undefined' && document.documentElement) {
    try {
      styles = getComputedStyle(document.documentElement);
    } catch (error) {
      styles = null;
    }
  }
  const palette = cachedPalette ?? resolveTilePalette();
  /** @type {TileGradientMap} */
  const gradients = /** @type {TileGradientMap} */ ({});
  Object.keys(TILE_GRADIENT_VARIABLES).forEach(key => {
    const type = /** @type {TileType} */ (key);
    const variables = TILE_GRADIENT_VARIABLES[type];
    const startValue = readCssVariable(styles, variables.start).trim();
    const endValue = readCssVariable(styles, variables.end).trim();
    const baseColor = palette[type] || TILE_FALLBACK_COLORS[type];
    const generated = createGradientFromColor(baseColor);
    gradients[type] = {
      start: startValue || generated.start,
      end: endValue || generated.end
    };
  });
  return gradients;
}

/**
 * @param {{ forceRefresh?: boolean }} [options]
 * @returns {TileGradientMap}
 */
export function resolveTileGradients(options = {}) {
  const { forceRefresh = false } = options;
  if (!cachedGradients || forceRefresh) {
    if (forceRefresh) {
      resolveTilePalette({ forceRefresh: true });
    }
    cachedGradients = computeTileGradients();
  }
  /** @type {TileGradientMap} */
  const gradients = /** @type {TileGradientMap} */ ({});
  Object.entries(cachedGradients).forEach(([key, value]) => {
    gradients[key] = { ...value };
  });
  return gradients;
}

export function getTileGradient(type) {
  const gradients = cachedGradients ?? resolveTileGradients();
  const normalized = typeof type === 'string' && type ? type.toLowerCase() : 'open';
  if (Object.prototype.hasOwnProperty.call(gradients, normalized)) {
    const gradient = gradients[normalized];
    return { ...gradient };
  }
  return { ...gradients.open };
}

/**
 * @param {string | null | undefined} type
 * @returns {string}
 */
export function getTileColor(type) {
  const palette = cachedPalette ?? resolveTilePalette();
  const normalized = typeof type === 'string' && type ? type.toLowerCase() : 'open';
  if (Object.prototype.hasOwnProperty.call(TILE_FALLBACK_COLORS, normalized)) {
    const tileType = /** @type {TileType} */ (normalized);
    return palette[tileType];
  }
  return palette.open;
}

