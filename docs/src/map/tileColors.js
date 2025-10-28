/**
 * @typedef {(
 *   | 'open'
 *   | 'forest'
 *   | 'stone'
 *   | 'ore'
 *   | 'water'
 *   | 'ocean'
 *   | 'lake'
 *   | 'river'
 *   | 'marsh'
 *   | 'mangrove'
 *   | 'sand'
 *   | 'tundra'
 *   | 'taiga'
 *   | 'savanna'
 *   | 'rainforest'
 *   | 'jungle'
 *   | 'swamp'
 *   | 'wetland'
 *   | 'coast'
 *   | 'island'
 *   | 'mountain'
 *   | 'plains'
 *   | 'desert'
 *   | 'alpine'
 *   | 'volcanic'
 *   | 'temperate'
 *   | 'tropical'
 * )} TileType
 * @typedef {Record<TileType, string>} TilePalette
 */

/** @type {Record<TileType, string>} */
const TILE_VARIABLES = {
  open: '--tile-open',
  forest: '--tile-forest',
  stone: '--tile-stone',
  ore: '--tile-ore',
  water: '--tile-water',
  ocean: '--legend-ocean',
  lake: '--legend-lake',
  river: '--legend-river',
  marsh: '--legend-marsh',
  mangrove: '--legend-mangrove',
  sand: '--legend-sand',
  tundra: '--legend-tundra',
  taiga: '--legend-taiga',
  savanna: '--legend-savanna',
  rainforest: '--legend-rainforest',
  jungle: '--legend-jungle',
  swamp: '--legend-swamp',
  wetland: '--legend-wetland',
  coast: '--legend-coast',
  island: '--legend-island',
  mountain: '--legend-mountain',
  plains: '--legend-plains',
  desert: '--legend-desert',
  alpine: '--legend-alpine',
  volcanic: '--legend-volcanic',
  temperate: '--legend-temperate',
  tropical: '--legend-tropical'
};

/** @type {TilePalette} */
const TILE_FALLBACK_COLORS = {
  open: '#facc15',
  forest: '#16a34a',
  stone: '#94a3b8',
  ore: '#f97316',
  water: '#2d7ff9',
  ocean: '#2563eb',
  lake: '#38bdf8',
  river: '#0ea5e9',
  marsh: '#4ade80',
  mangrove: '#065f46',
  sand: '#fcd34d',
  tundra: '#9ac5ff',
  taiga: '#2f6b2a',
  savanna: '#f59e0b',
  rainforest: '#047857',
  jungle: '#0f766e',
  swamp: '#14532d',
  wetland: '#22c55e',
  coast: '#0ea5e9',
  island: '#38bdf8',
  mountain: '#64748b',
  plains: '#facc15',
  desert: '#f4b76b',
  alpine: '#60a5fa',
  volcanic: '#ea580c',
  temperate: '#4ade80',
  tropical: '#10b981'
};

/** @type {TilePalette | null} */
let cachedPalette = null;

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

