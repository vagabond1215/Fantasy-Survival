const TILE_VARIABLES = {
  open: '--tile-open',
  forest: '--tile-forest',
  stone: '--tile-stone',
  ore: '--tile-ore',
  water: '--tile-water'
} as const;

type TileType = keyof typeof TILE_VARIABLES;

type TilePalette = Record<TileType, string>;

const TILE_FALLBACK_COLORS: TilePalette = {
  open: '#facc15',
  forest: '#16a34a',
  stone: '#94a3b8',
  ore: '#f97316',
  water: '#2d7ff9'
};

let cachedPalette: TilePalette | null = null;

function readCssVariable(
  styles: CSSStyleDeclaration | null,
  variable: (typeof TILE_VARIABLES)[TileType]
): string {
  if (!styles) return '';
  try {
    return styles.getPropertyValue(variable) || '';
  } catch (error) {
    return '';
  }
}

function computeTilePalette(): TilePalette {
  let styles: CSSStyleDeclaration | null = null;
  if (typeof document !== 'undefined' && document.documentElement) {
    try {
      styles = getComputedStyle(document.documentElement);
    } catch (error) {
      styles = null;
    }
  }

  const palette = Object.keys(TILE_VARIABLES).reduce((acc, key) => {
    const type = key as TileType;
    const variable = TILE_VARIABLES[type];
    const value = readCssVariable(styles, variable).trim();
    acc[type] = value || TILE_FALLBACK_COLORS[type];
    return acc;
  }, {} as TilePalette);

  return palette;
}

export function resolveTilePalette(options: { forceRefresh?: boolean } = {}): TilePalette {
  const { forceRefresh = false } = options;
  if (!cachedPalette || forceRefresh) {
    cachedPalette = computeTilePalette();
  }
  return { ...cachedPalette };
}

export const TILE_COLOR_MAP: TilePalette = resolveTilePalette();

export function getTileColor(type?: string | null): string {
  const palette = cachedPalette ?? resolveTilePalette();
  const normalized = typeof type === 'string' && type ? type.toLowerCase() : 'open';
  if ((normalized as TileType) in TILE_FALLBACK_COLORS) {
    return palette[normalized as TileType];
  }
  return palette.open;
}
