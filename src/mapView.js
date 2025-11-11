// @ts-nocheck
import { DEFAULT_MAP_WIDTH, TERRAIN_SYMBOLS } from './map.js';
import {
  getTileColor,
  getTileGradient,
  resolveTilePalette,
  createGradientFromColor
} from './map/tileColors.js';
import { createCamera } from './map/camera.js';
import { createMapRenderer } from './map/renderer.js';
import { getBiomeCssColor, getBiomeName, getBiomeId } from './map/biomePalette.js';
import { createZoomControls } from './ui/ZoomControls.js';
import { chunkDataCache, tileCanvasCache, sharedCanvasPool } from './storage/chunkCache.js';

const DEVELOPMENT_STATUS_ALIASES = new Map(
  [
    ['complete', 'completed'],
    ['completed', 'completed'],
    ['built', 'completed'],
    ['finished', 'completed'],
    ['constructed', 'completed'],
    ['constructing', 'under-construction'],
    ['building', 'under-construction'],
    ['under construction', 'under-construction'],
    ['under-construction', 'under-construction'],
    ['in-progress', 'under-construction'],
    ['progress', 'under-construction'],
    ['queued', 'planned'],
    ['pending', 'planned'],
    ['planned', 'planned'],
    ['noted', 'noted'],
    ['mixed', 'mixed']
  ].map(([alias, status]) => [alias, status])
);

const ARROW_KEY_MOVES = Object.freeze({
  ArrowUp: { dx: 0, dy: -1 },
  ArrowDown: { dx: 0, dy: 1 },
  ArrowLeft: { dx: -1, dy: 0 },
  ArrowRight: { dx: 1, dy: 0 }
});

const KEYBOARD_SNAP_DELAY = 220;

const DEBUG_QUERY_PARAM = 'debug';
const DEBUG_QUERY_VALUE = '1';

const SPAWN_SUGGESTION_LIMIT = 5;

function isDebugModeEnabled() {
  if (typeof window === 'undefined' || typeof URLSearchParams === 'undefined') {
    return false;
  }
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get(DEBUG_QUERY_PARAM) === DEBUG_QUERY_VALUE;
  } catch (_error) {
    return false;
  }
}

function toFiniteInteger(value) {
  return Number.isFinite(value) ? Math.trunc(value) : null;
}

function clampNumber(value, min, max) {
  if (!Number.isFinite(value)) return value;
  if (min > max) return value;
  return Math.min(max, Math.max(min, value));
}

function normalizeDevelopmentStatus(status, fallback = 'noted') {
  if (!status) return fallback;
  const key = String(status).trim().toLowerCase();
  return DEVELOPMENT_STATUS_ALIASES.get(key) || fallback;
}

function coerceStructureName(entry) {
  if (!entry) return '';
  if (typeof entry === 'string') return entry;
  return (
    entry.name ||
    entry.label ||
    entry.title ||
    entry.typeName ||
    entry.typeId ||
    (typeof entry.toString === 'function' ? entry.toString() : '') ||
    ''
  );
}

function normalizeDevelopmentDescriptor(entry, index = 0) {
  if (!entry) return null;
  const source = typeof entry === 'object' ? entry : { structures: [entry] };
  const x = toFiniteInteger(source.x ?? source.col ?? source.column ?? source.tileX ?? source.tile?.x);
  const y = toFiniteInteger(source.y ?? source.row ?? source.tileY ?? source.tile?.y);
  if (x === null || y === null) return null;
  const structuresRaw = Array.isArray(source.structures)
    ? source.structures
    : Array.isArray(source.projects)
      ? source.projects
      : source.structure
        ? [source.structure]
        : source.name
          ? [source.name]
          : [];
  const structures = structuresRaw
    .map(item => coerceStructureName(item))
    .map(name => String(name || '').trim())
    .filter(Boolean);
  const status = normalizeDevelopmentStatus(source.status || source.state || source.progress || null);
  const tooltipParts = [];
  if (source.tooltip) tooltipParts.push(String(source.tooltip));
  if (source.details) tooltipParts.push(String(source.details));
  if (source.description) tooltipParts.push(String(source.description));
  if (tooltipParts.length === 0 && structures.length) {
    tooltipParts.push(structures.join(', '));
  }
  const label =
    source.label ||
    (structures.length ? structures[0] : '') ||
    source.name ||
    source.title ||
    `Development ${index + 1}`;
  const count = Number.isFinite(source.count) ? Math.max(0, Math.trunc(source.count)) : structures.length;
  return {
    x,
    y,
    status,
    structures,
    label,
    tooltip: tooltipParts.join(' • '),
    count,
    emphasis: source.emphasis === true,
    highlight: source.highlight === true
  };
}

function normalizeTerrainColorOverrides(overrides) {
  if (!overrides || typeof overrides !== 'object') return null;
  const normalized = {};
  for (const [rawKey, rawValue] of Object.entries(overrides)) {
    if (!rawKey && rawKey !== 0) continue;
    const key = String(rawKey).trim().toLowerCase();
    if (!key) continue;
    if (rawValue === null || rawValue === undefined) continue;
    const value = String(rawValue).trim();
    if (!value) continue;
    normalized[key] = value;
  }
  return Object.keys(normalized).length ? normalized : null;
}

function summarizeStructureGroup(group) {
  const completed = [];
  const underway = [];
  const planned = [];
  const notes = [];
  group.items.forEach(item => {
    const name = coerceStructureName(item);
    const cleanName = String(name || '').trim() || 'Structure';
    const status = normalizeDevelopmentStatus(item.status || item.state || item.progress || null, 'planned');
    if (status === 'completed') {
      completed.push(cleanName);
    } else if (status === 'under-construction') {
      underway.push(cleanName);
    } else {
      planned.push(cleanName);
    }
    if (item.details) {
      notes.push(String(item.details));
    } else if (item.description) {
      notes.push(String(item.description));
    }
  });
  const detailParts = [];
  if (completed.length) {
    detailParts.push(
      `${completed.length > 1 ? 'Completed structures' : 'Completed structure'}: ${completed.join(', ')}`
    );
  }
  if (underway.length) {
    detailParts.push(
      `${underway.length > 1 ? 'Under construction' : 'Under construction'}: ${underway.join(', ')}`
    );
  }
  if (planned.length) {
    detailParts.push(`Planned: ${planned.join(', ')}`);
  }
  if (notes.length) {
    detailParts.push(notes.join(' • '));
  }
  let status = 'noted';
  if (underway.length) {
    status = completed.length ? 'mixed' : 'under-construction';
  } else if (completed.length) {
    status = 'completed';
  } else if (planned.length) {
    status = 'planned';
  }
  const structures = [...completed, ...underway, ...planned];
  const label = group.label || structures[0] || 'Development';
  return {
    x: group.x,
    y: group.y,
    status,
    structures,
    label,
    tooltip: detailParts.join(' • '),
    count: structures.length,
    emphasis: Boolean(group.emphasis),
    highlight: Boolean(group.highlight)
  };
}

export function identifyDevelopmentTiles(map = {}, options = {}) {
  const results = [];
  const seen = new Set();

  const directSources =
    options.developments ?? map.developments ?? map.development ?? map.developmentTiles ?? null;
  if (Array.isArray(directSources)) {
    directSources.forEach((entry, index) => {
      const normalized = normalizeDevelopmentDescriptor(entry, index);
      if (!normalized) return;
      const key = `${normalized.x}:${normalized.y}`;
      seen.add(key);
      results.push(normalized);
    });
  } else if (directSources && typeof directSources === 'object') {
    Object.values(directSources).forEach((entry, index) => {
      const normalized = normalizeDevelopmentDescriptor(entry, index);
      if (!normalized) return;
      const key = `${normalized.x}:${normalized.y}`;
      seen.add(key);
      results.push(normalized);
    });
  }

  const structureCandidates = Array.isArray(options.structures)
    ? options.structures
    : Array.isArray(map.structures)
      ? map.structures
      : [];

  if (structureCandidates.length) {
    const grouped = new Map();
    structureCandidates.forEach(item => {
      if (!item) return;
      const tile = item.tile || item.location || item.coords || {};
      const x = toFiniteInteger(item.x ?? tile.x ?? item.col);
      const y = toFiniteInteger(item.y ?? tile.y ?? item.row);
      if (x === null || y === null) return;
      const key = `${x}:${y}`;
      if (!grouped.has(key)) {
        grouped.set(key, { x, y, items: [], label: item.label || item.name || null, emphasis: item.emphasis, highlight: item.highlight });
      }
      grouped.get(key).items.push(item);
    });

    grouped.forEach((group, key) => {
      if (seen.has(key)) return;
      const summary = summarizeStructureGroup(group);
      if (summary) {
        seen.add(key);
        results.push(summary);
      }
    });
  }

  return results;
}

const LEGEND_DEFAULTS = {
  water: 'Water',
  ocean: 'Ocean',
  lake: 'Lake',
  river: 'River',
  marsh: 'Marsh',
  mangrove: 'Mangrove Forest',
  open: 'Open Land',
  forest: 'Forest',
  ore: 'Ore Deposits',
  stone: 'Stone Outcrop'
};

const BUFFER_MARGIN = 12;
const DEFAULT_TILE_BASE_SIZE = 16;

function computeBufferPadding(dimensions, viewportWidth, viewportHeight) {
  const cols = Math.max(
    0,
    dimensions?.width ?? dimensions?.cols ?? getGridBaseWidth(dimensions, 0)
  );
  const rows = Math.max(
    0,
    dimensions?.height ?? dimensions?.rows ?? getGridBaseHeight(dimensions, 0)
  );
  const width = Math.max(0, viewportWidth || 0);
  const height = Math.max(0, viewportHeight || 0);
  return {
    x: Math.max(0, Math.floor((cols - width) / 2)),
    y: Math.max(0, Math.floor((rows - height) / 2))
  };
}
const DEFAULT_VIEWPORT_SIZE = DEFAULT_MAP_WIDTH;

function computeViewportDimensions(
  cols = 0,
  rows = 0,
  availableWidth = null,
  availableHeight = null
) {
  const MIN_SIZE = 220;

  if (typeof window === 'undefined') {
    const fallback = Math.max(MIN_SIZE, 320);
    return { width: fallback, height: fallback };
  }

  const aspectRatio = Number.isFinite(cols) && Number.isFinite(rows) && rows > 0
    ? Math.max(0.01, cols / rows)
    : 1;

  const widthAllowance = Math.max(
    MIN_SIZE,
    Number.isFinite(availableWidth) && availableWidth > 0
      ? availableWidth
      : window.innerWidth - 80
  );
  const heightAllowance = Math.max(
    MIN_SIZE,
    Number.isFinite(availableHeight) && availableHeight > 0
      ? availableHeight
      : window.innerHeight - 260
  );

  const maxWidth = Math.max(MIN_SIZE, Math.round(widthAllowance));
  const maxHeight = Math.max(MIN_SIZE, Math.round(heightAllowance));

  let width = maxWidth;
  let height = Math.round(width / aspectRatio);

  if (height > maxHeight) {
    height = maxHeight;
    width = Math.round(height * aspectRatio);
    if (width > maxWidth) {
      width = maxWidth;
      height = Math.round(width / aspectRatio);
    }
  }

  width = Math.max(1, Math.min(maxWidth, Math.round(width)));
  height = Math.max(1, Math.min(maxHeight, Math.round(height)));

  return { width, height };
}

function requestFrame(callback) {
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    window.requestAnimationFrame(callback);
  } else {
    setTimeout(callback, 0);
  }
}

function toInteger(value, fallback = 0) {
  return Number.isFinite(value) ? Math.trunc(value) : fallback;
}

function resolveBufferDimensions(source) {
  if (!source || typeof source !== 'object') {
    return { width: 0, height: 0 };
  }

  const explicitWidth = toInteger(
    source.width ?? source.cols ?? source.dimensions?.width ?? source.shape?.width,
    0
  );
  const explicitHeight = toInteger(
    source.height ?? source.rows ?? source.dimensions?.height ?? source.shape?.height,
    0
  );

  if (explicitWidth && explicitHeight) {
    return { width: explicitWidth, height: explicitHeight };
  }

  const tiles = source.tiles ?? source.tileMatrix ?? null;
  if (tiles && typeof tiles === 'object') {
    const width = toInteger(tiles.width ?? tiles.cols, 0);
    const height = toInteger(tiles.height ?? tiles.rows, 0);
    if (width && height) {
      return { width, height };
    }
  }

  if (Array.isArray(tiles)) {
    const rows = tiles.length;
    const cols = rows ? (Array.isArray(tiles[0]) ? tiles[0].length || 0 : tiles.length) : 0;
    if (cols && rows) {
      return { width: cols, height: rows };
    }
  }

  if (Array.isArray(source.tiles)) {
    const rows = source.tiles.length;
    const cols = rows ? (Array.isArray(source.tiles[0]) ? source.tiles[0].length || 0 : source.tiles.length) : 0;
    if (cols && rows) {
      return { width: cols, height: rows };
    }
  }

  if (Array.isArray(source.types)) {
    const rows = source.types.length;
    const cols = rows ? (Array.isArray(source.types[0]) ? source.types[0].length || 0 : source.types.length) : 0;
    if (cols && rows) {
      return { width: cols, height: rows };
    }
  }

  const size = toInteger(source.size ?? source.length, 0);
  if (size && explicitWidth) {
    const derivedHeight = Math.max(1, Math.trunc(size / explicitWidth));
    return { width: explicitWidth, height: derivedHeight };
  }

  return { width: 0, height: 0 };
}

function isGridView(candidate) {
  return (
    candidate &&
    typeof candidate === 'object' &&
    Number.isFinite(candidate.width) &&
    Number.isFinite(candidate.height) &&
    typeof candidate.get === 'function' &&
    typeof candidate.getIndex === 'function'
  );
}

function createGridViewFromData(
  data,
  {
    width,
    height,
    baseWidth = width,
    baseHeight = height,
    defaultValue = null,
    offsetX = 0,
    offsetY = 0
  }
) {
  const normalizedWidth = Math.max(0, Math.trunc(width || 0));
  const normalizedHeight = Math.max(0, Math.trunc(height || 0));
  const fullWidth = Math.max(normalizedWidth, Math.trunc(baseWidth || normalizedWidth || 0));
  const fullHeight = Math.max(normalizedHeight, Math.trunc(baseHeight || normalizedHeight || 0));
  const baseOffsetX = Math.max(0, Math.trunc(offsetX || 0));
  const baseOffsetY = Math.max(0, Math.trunc(offsetY || 0));
  const view = {
    data,
    width: normalizedWidth,
    height: normalizedHeight,
    baseWidth: fullWidth,
    baseHeight: fullHeight,
    offsetX: baseOffsetX,
    offsetY: baseOffsetY,
    size: normalizedWidth * normalizedHeight,
    defaultValue,
    get(x, y) {
      const localX = Math.trunc(x);
      const localY = Math.trunc(y);
      if (
        !Number.isFinite(localX) ||
        !Number.isFinite(localY) ||
        localX < 0 ||
        localY < 0 ||
        localX >= this.width ||
        localY >= this.height
      ) {
        return defaultValue;
      }
      const worldX = this.offsetX + localX;
      const worldY = this.offsetY + localY;
      if (worldX < 0 || worldY < 0 || worldX >= this.baseWidth || worldY >= this.baseHeight) {
        return defaultValue;
      }
      const index = worldY * this.baseWidth + worldX;
      if (!data || index < 0 || index >= data.length) {
        return defaultValue;
      }
      return data[index] ?? defaultValue;
    },
    getIndex(index) {
      if (!Number.isFinite(index) || index < 0 || index >= this.size) {
        return defaultValue;
      }
      const localX = index % this.width;
      const localY = Math.trunc(index / this.width);
      return this.get(localX, localY);
    },
    getByWorld(worldX, worldY) {
      const normalizedX = Math.trunc(worldX);
      const normalizedY = Math.trunc(worldY);
      if (
        !Number.isFinite(normalizedX) ||
        !Number.isFinite(normalizedY) ||
        normalizedX < 0 ||
        normalizedY < 0 ||
        normalizedX >= this.baseWidth ||
        normalizedY >= this.baseHeight
      ) {
        return defaultValue;
      }
      const index = normalizedY * this.baseWidth + normalizedX;
      if (!data || index < 0 || index >= data.length) {
        return defaultValue;
      }
      return data[index] ?? defaultValue;
    },
    slice(sliceOffsetX, sliceOffsetY, sliceWidth, sliceHeight) {
      const normalizedSliceWidth = Math.max(0, Math.trunc(sliceWidth || 0));
      const normalizedSliceHeight = Math.max(0, Math.trunc(sliceHeight || 0));
      const nextOffsetX = this.offsetX + Math.max(0, Math.trunc(sliceOffsetX || 0));
      const nextOffsetY = this.offsetY + Math.max(0, Math.trunc(sliceOffsetY || 0));
      const maxWidth = Math.max(0, this.baseWidth - nextOffsetX);
      const maxHeight = Math.max(0, this.baseHeight - nextOffsetY);
      const clampedWidth = Math.min(normalizedSliceWidth, maxWidth);
      const clampedHeight = Math.min(normalizedSliceHeight, maxHeight);
      return createGridViewFromData(data, {
        width: clampedWidth,
        height: clampedHeight,
        baseWidth: this.baseWidth,
        baseHeight: this.baseHeight,
        defaultValue,
        offsetX: nextOffsetX,
        offsetY: nextOffsetY
      });
    }
  };
  return view;
}

function normalizeGridSource(source, width, height, defaultValue = null) {
  if (!width || !height) {
    return createGridViewFromData(new Array(0), {
      width: 0,
      height: 0,
      baseWidth: 0,
      baseHeight: 0,
      defaultValue
    });
  }

  if (isGridView(source)) {
    return source;
  }

  const size = Math.max(0, width * height);
  if (Array.isArray(source)) {
    if (source.length === size && !Array.isArray(source[0])) {
      return createGridViewFromData(source, {
        width,
        height,
        baseWidth: width,
        baseHeight: height,
        defaultValue
      });
    }
    if (Array.isArray(source[0])) {
      const flattened = new Array(size);
      for (let row = 0; row < height; row += 1) {
        const rowData = source[row] || [];
        for (let col = 0; col < width; col += 1) {
          flattened[row * width + col] = rowData[col] ?? defaultValue;
        }
      }
      return createGridViewFromData(flattened, {
        width,
        height,
        baseWidth: width,
        baseHeight: height,
        defaultValue
      });
    }
    if (source.length >= size) {
      return createGridViewFromData(source, {
        width,
        height,
        baseWidth: width,
        baseHeight: height,
        defaultValue
      });
    }
  }

  if (typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView && ArrayBuffer.isView(source)) {
    return createGridViewFromData(source, {
      width,
      height,
      baseWidth: width,
      baseHeight: height,
      defaultValue
    });
  }

  const fallback = new Array(size);
  for (let index = 0; index < size; index += 1) {
    fallback[index] = defaultValue;
  }

  return createGridViewFromData(fallback, {
    width,
    height,
    baseWidth: width,
    baseHeight: height,
    defaultValue
  });
}

function createSubGridView(view, offsetX, offsetY, width, height) {
  if (!view || typeof view.slice !== 'function') {
    return null;
  }
  return view.slice(offsetX, offsetY, width, height);
}

function getWorldDimensions(stateRef) {
  const width = Number.isFinite(stateRef.world?.dimensions?.width)
    ? Math.max(0, Math.trunc(stateRef.world.dimensions.width))
    : 0;
  const height = Number.isFinite(stateRef.world?.dimensions?.height)
    ? Math.max(0, Math.trunc(stateRef.world.dimensions.height))
    : 0;
  return { width, height };
}

function getWorldIndex(stateRef, x, y) {
  const { width, height } = getWorldDimensions(stateRef);
  if (!width || !height) return -1;
  const col = Math.trunc(x);
  const row = Math.trunc(y);
  if (col < 0 || row < 0 || col >= width || row >= height) return -1;
  return row * width + col;
}

function readWorldLayerValue(layer, index, fallback = 0) {
  if (!layer || index < 0) return fallback;
  if (index >= layer.length) return fallback;
  const value = layer[index];
  return Number.isFinite(value) ? value : fallback;
}

function formatPercent(value, digits = 0) {
  if (!Number.isFinite(value)) return '0%';
  const percent = value * 100;
  const factor = 10 ** digits;
  const rounded = Math.round(percent * factor) / factor;
  return `${rounded.toFixed(digits)}%`;
}

function getGridWidth(grid, fallback = 0) {
  if (!grid) return fallback;
  if (Number.isFinite(grid.width)) {
    return Math.max(0, Math.trunc(grid.width));
  }
  return fallback;
}

function getGridHeight(grid, fallback = 0) {
  if (!grid) return fallback;
  if (Number.isFinite(grid.height)) {
    return Math.max(0, Math.trunc(grid.height));
  }
  return fallback;
}

function getGridBaseWidth(grid, fallback = 0) {
  if (!grid) return fallback;
  if (Number.isFinite(grid.baseWidth)) {
    return Math.max(0, Math.trunc(grid.baseWidth));
  }
  return getGridWidth(grid, fallback);
}

function getGridBaseHeight(grid, fallback = 0) {
  if (!grid) return fallback;
  if (Number.isFinite(grid.baseHeight)) {
    return Math.max(0, Math.trunc(grid.baseHeight));
  }
  return getGridHeight(grid, fallback);
}

function extractBufferMap(mapLike) {
  if (!mapLike) return null;
  const candidate =
    mapLike.buffer &&
    (mapLike.buffer.tiles || mapLike.buffer.tileData || mapLike.buffer.layers)
      ? mapLike.buffer
      : mapLike;

  if (!candidate || typeof candidate !== 'object') {
    return null;
  }

  const { width: derivedWidth, height: derivedHeight } = resolveBufferDimensions(candidate);
  const width = Math.max(0, toInteger(candidate.width, derivedWidth));
  const height = Math.max(0, toInteger(candidate.height, derivedHeight));

  if (!width || !height) {
    return null;
  }

  const layers = candidate.layers ?? candidate.layerBuffers ?? null;
  const elevationSource =
    candidate.elevations ??
    layers?.elevation ??
    (candidate.layerBuffers ? candidate.layerBuffers.elevation : null);
  const typesSource = candidate.types ?? null;
  const tilesSource = candidate.tiles ?? candidate.tileMatrix ?? null;

  const normalizedTiles = normalizeGridSource(tilesSource, width, height, '');
  const normalizedTypes = typesSource
    ? normalizeGridSource(typesSource, width, height, null)
    : null;
  const normalizedElevations = elevationSource
    ? normalizeGridSource(elevationSource, width, height, 0)
    : null;

  const tileData = Array.isArray(candidate.tileData)
    ? candidate.tileData
    : candidate.tilesFlat && Array.isArray(candidate.tilesFlat)
      ? candidate.tilesFlat
      : null;

  return {
    ...candidate,
    tiles: normalizedTiles,
    types: normalizedTypes,
    elevations: normalizedElevations,
    layers,
    tileData,
    width,
    height,
    size: width * height,
    xStart: toInteger(candidate.xStart, 0),
    yStart: toInteger(candidate.yStart, 0),
    world: candidate.world || null
  };
}

function deriveViewportSize(buffer, fallbackWidth = 0, fallbackHeight = 0) {
  if (fallbackWidth && fallbackHeight) {
    return { width: fallbackWidth, height: fallbackHeight };
  }
  if (!buffer) {
    return { width: DEFAULT_VIEWPORT_SIZE, height: DEFAULT_VIEWPORT_SIZE };
  }
  const { width, height } = resolveBufferDimensions(buffer);
  if (width || height) {
    const target = Math.max(width, height);
    return {
      width: target || DEFAULT_VIEWPORT_SIZE,
      height: target || DEFAULT_VIEWPORT_SIZE
    };
  }
  return { width: DEFAULT_VIEWPORT_SIZE, height: DEFAULT_VIEWPORT_SIZE };
}

export function createMapView(container, {
  legendLabels = LEGEND_DEFAULTS,
  showControls = true,
  showLegend = true,
  allowDrag = true,
  idPrefix = 'map',
  fetchMap = null,
  onMapUpdate = null,
  onTileClick = null,
  navMode = 'viewport',
  onNavigate = null,
  actions = {},
  jobSelector = null,
  useTerrainColors = false,
  terrainColors = null,
  bufferMargin = BUFFER_MARGIN,
  minZoom = 0.5,
  maxZoom = 3,
  initialZoom = 1,
  controlsContainer = null
} = {}) {
  if (!container) throw new Error('Container is required for map view');

  const terrainColorOverrides = normalizeTerrainColorOverrides(terrainColors);

  const normalizedBufferMargin = Number.isFinite(bufferMargin)
    ? Math.max(0, Math.trunc(bufferMargin))
    : BUFFER_MARGIN;
  const normalizedMinZoom = Number.isFinite(minZoom) ? Math.max(0.1, minZoom) : 0.5;
  const normalizedMaxZoom = Number.isFinite(maxZoom)
    ? Math.max(normalizedMinZoom, maxZoom)
    : 3;
  const normalizedInitialZoom = Number.isFinite(initialZoom) ? initialZoom : 1;
  const clampedInitialZoom = Math.min(
    normalizedMaxZoom,
    Math.max(normalizedMinZoom, normalizedInitialZoom)
  );

  const applyControlButtonStyle = (
    button,
    { size = 48, fontSize = '18px', variant = 'square', square, padding } = {}
  ) => {
    const dimension = typeof size === 'number' && Number.isFinite(size) ? `${size}px` : `${size}`;
    const isStacked = variant === 'stacked';
    const forceSquare = square ?? !isStacked;
    const resolvedPadding =
      padding !== undefined ? padding : forceSquare ? '0' : variant === 'chip' ? '0 12px' : '0';

    button.style.boxSizing = 'border-box';
    button.style.width = forceSquare ? dimension : isStacked ? 'auto' : dimension;
    button.style.minWidth = dimension;
    button.style.height = forceSquare && !isStacked ? dimension : isStacked ? 'auto' : dimension;
    button.style.minHeight = dimension;
    button.style.flexBasis = forceSquare ? dimension : 'auto';
    button.style.padding = resolvedPadding;
    button.style.fontSize = fontSize;
    button.style.display = 'inline-flex';
    button.style.flexDirection = isStacked ? 'column' : 'row';
    button.style.gap = isStacked ? '2px' : '0';
    button.style.alignItems = 'center';
    button.style.justifyContent = 'center';
    button.style.borderRadius = '12px';
    button.style.border = '1px solid var(--map-control-border, var(--map-border, #ccc))';
    button.style.background = 'var(--map-control-bg, var(--bg-color, #fff))';
    button.style.color = 'var(--map-control-fg, inherit)';
    button.style.lineHeight = forceSquare ? '1' : '1.1';
    button.style.whiteSpace = 'nowrap';
    button.style.cursor = 'pointer';
    button.style.transition = 'background 0.2s ease, transform 0.1s ease';
    button.style.boxShadow = 'var(--map-control-shadow, 0 1px 2px rgba(0, 0, 0, 0.08))';
    button.style.fontWeight = '600';
    button.style.textAlign = 'center';
    button.style.flexShrink = '0';
    button.style.fontVariantNumeric = 'tabular-nums';
  };

  const debugModeEnabled = isDebugModeEnabled();

  const state = {
    map: null,
    buffer: null,
    world: null,
    context: {},
    home: { xStart: 0, yStart: 0 },
    focus: { x: 0, y: 0 },
    viewport: { width: 0, height: 0, xStart: 0, yStart: 0 },
    drag: {
      active: false,
      lastX: 0,
      lastY: 0,
      pendingX: 0,
      pendingY: 0,
      fractionalX: 0,
      fractionalY: 0
    },
    keyboardPan: {
      timer: null,
    },
    resizeHandler: null,
    fetchMap,
    onMapUpdate,
    onTileClick: typeof onTileClick === 'function' ? onTileClick : null,
    navMode: navMode === 'player' ? 'player' : 'viewport',
    onNavigate: typeof onNavigate === 'function' ? onNavigate : null,
    bufferMargin: normalizedBufferMargin,
    bufferPadding: { x: normalizedBufferMargin, y: normalizedBufferMargin },
    expectedBufferPadding: { x: normalizedBufferMargin, y: normalizedBufferMargin },
    zoom: clampedInitialZoom,
    minZoom: normalizedMinZoom,
    maxZoom: normalizedMaxZoom,
    initialZoom: clampedInitialZoom,
    zoomBase: { width: 0, height: 0 },
    zoomDisplayFactor: 1,
    tileBaseSize: DEFAULT_TILE_BASE_SIZE,
    camera: null,
    renderer: null,
    renderScheduled: false,
    markerLayer: null,
    dataLayer: null,
    markerElements: new Map(),
    markerDefs: [],
    spawnSuggestionMarkers: [],
    spawnSuggestionRank: new Map(),
    spawnSuggestionLimit: SPAWN_SUGGESTION_LIMIT,
    useTerrainColors: Boolean(useTerrainColors),
    terrainColorOverrides,
    pendingZoomSync: false,
    developmentTiles: new Map(),
    hasInitializedBaseChunk: false,
    debug: {
      enabled: debugModeEnabled,
      overlay: null,
      fps: 0,
      lastRenderTimestamp: 0,
      pointerTile: null
    }
  };

  const getCurrentZoom = () => (state.camera ? state.camera.zoom : state.zoom);

  function updateSpawnSuggestionMarkers() {
    state.spawnSuggestionRank.clear();
    if (!state.world?.spawnSuggestions || !state.world.spawnSuggestions.length) {
      state.spawnSuggestionMarkers = [];
      syncMarkers();
      return;
    }
    const { width, height } = getWorldDimensions(state);
    if (!width || !height) {
      state.spawnSuggestionMarkers = [];
      syncMarkers();
      return;
    }
    const suggestions = state.world.spawnSuggestions;
    const limit = Math.max(
      1,
      Math.min(state.spawnSuggestionLimit || SPAWN_SUGGESTION_LIMIT, suggestions.length)
    );
    const markers = [];
    for (let i = 0; i < limit; i += 1) {
      const suggestionIndex = suggestions[i];
      const x = suggestionIndex % width;
      const y = Math.floor(suggestionIndex / width);
      state.spawnSuggestionRank.set(suggestionIndex, i);
      markers.push({
        id: `spawn-suggestion-${i}`,
        x,
        y,
        icon: i === 0 ? '★' : '☆',
        className: 'map-marker--suggestion',
        emphasis: i === 0,
        label: `Spawn suggestion #${i + 1}`,
        color: i === 0
          ? 'var(--map-suggestion-primary, #facc15)'
          : 'var(--map-suggestion-secondary, #fde047)',
        index: suggestionIndex
      });
    }
    const normalized = markers
      .map((marker, markerIndex) => normalizeMarker(marker, markerIndex))
      .filter(Boolean);
    state.spawnSuggestionMarkers = normalized;
    syncMarkers();
  }

  function applyWorldArtifact(world) {
    if (state.world === world) {
      return;
    }
    state.world = world || null;
    state.spawnSuggestionRank.clear();
    state.spawnSuggestionMarkers = [];
    if (state.renderer) {
      state.renderer.setWorld(state.world);
    }
    updateSpawnSuggestionMarkers();
  }

  const getVisibleDimensions = () => {
    const cols = Number.isFinite(state.map?.width)
      ? Math.max(0, Math.trunc(state.map.width))
      : getGridWidth(state.map?.tiles, 0);
    const rows = Number.isFinite(state.map?.height)
      ? Math.max(0, Math.trunc(state.map.height))
      : getGridHeight(state.map?.tiles, 0);
    return { cols, rows };
  };

  function ensureViewportDimensions(buffer) {
    const derived = deriveViewportSize(buffer, state.viewport.width, state.viewport.height);
    state.viewport.width = Math.max(1, toInteger(derived.width, DEFAULT_VIEWPORT_SIZE));
    state.viewport.height = Math.max(1, toInteger(derived.height, DEFAULT_VIEWPORT_SIZE));
  }

  function clampViewportWithinBuffer(buffer) {
    if (!buffer) return null;
    const totalWidth = Number.isFinite(buffer.width)
      ? Math.max(0, Math.trunc(buffer.width))
      : getGridBaseWidth(buffer.tiles, 0);
    const totalHeight = Number.isFinite(buffer.height)
      ? Math.max(0, Math.trunc(buffer.height))
      : getGridBaseHeight(buffer.tiles, 0);
    if (!totalWidth || !totalHeight) {
      return null;
    }

    const width = Math.min(
      Math.max(1, state.viewport.width || DEFAULT_VIEWPORT_SIZE),
      totalWidth
    );
    const height = Math.min(
      Math.max(1, state.viewport.height || DEFAULT_VIEWPORT_SIZE),
      totalHeight
    );

    state.viewport.width = width;
    state.viewport.height = height;

    const originX = buffer.xStart ?? 0;
    const originY = buffer.yStart ?? 0;
    const maxOffsetX = Math.max(0, totalWidth - width);
    const maxOffsetY = Math.max(0, totalHeight - height);

    let offsetX = toInteger(state.viewport.xStart, originX) - originX;
    let offsetY = toInteger(state.viewport.yStart, originY) - originY;

    offsetX = Math.max(0, Math.min(maxOffsetX, offsetX));
    offsetY = Math.max(0, Math.min(maxOffsetY, offsetY));

    state.viewport.xStart = originX + offsetX;
    state.viewport.yStart = originY + offsetY;

    return {
      offsetX,
      offsetY,
      originX,
      originY,
      width,
      height
    };
  }

  function updateVisibleFromBuffer() {
    if (!state.buffer?.tiles) return false;
    const clamped = clampViewportWithinBuffer(state.buffer);
    if (!clamped) return false;

    const { offsetX, offsetY, width, height } = clamped;
    const tiles = createSubGridView(state.buffer.tiles, offsetX, offsetY, width, height);
    if (!tiles || tiles.size !== width * height) {
      return false;
    }

    const types = state.buffer.types
      ? createSubGridView(state.buffer.types, offsetX, offsetY, width, height)
      : null;
    const elevations = state.buffer.elevations
      ? createSubGridView(state.buffer.elevations, offsetX, offsetY, width, height)
      : null;

    state.map = {
      ...state.map,
      seed: state.buffer.seed ?? state.map?.seed,
      season: state.buffer.season ?? state.map?.season,
      waterLevel: state.buffer.waterLevel ?? state.map?.waterLevel,
      tiles,
      types,
      elevations,
      layers: state.buffer.layers ?? state.map?.layers ?? null,
      tileData: state.buffer.tileData ?? state.map?.tileData ?? null,
      xStart: state.viewport.xStart,
      yStart: state.viewport.yStart,
      width,
      height,
      viewport: { ...state.viewport },
      world: state.world
    };

    return true;
  }

  function buildUpdatePayload() {
    if (!state.map) return null;
    const payload = {
      seed: state.map.seed,
      season: state.map.season,
      waterLevel: state.map.waterLevel,
      tiles: state.map.tiles,
      types: state.map.types,
      elevations: state.map.elevations,
      xStart: state.map.xStart,
      yStart: state.map.yStart,
      width: state.map.width,
      height: state.map.height,
      viewport: { ...state.viewport },
      world: state.world
    };

    if (state.buffer?.tiles) {
      const bufferWidth = Number.isFinite(state.buffer.width)
        ? Math.max(0, Math.trunc(state.buffer.width))
        : getGridBaseWidth(state.buffer.tiles, 0);
      const bufferHeight = Number.isFinite(state.buffer.height)
        ? Math.max(0, Math.trunc(state.buffer.height))
        : getGridBaseHeight(state.buffer.tiles, 0);
      payload.buffer = {
        seed: state.buffer.seed,
        season: state.buffer.season,
        waterLevel: state.buffer.waterLevel,
        tiles: state.buffer.tiles,
        types: state.buffer.types,
        elevations: state.buffer.elevations,
        xStart: state.buffer.xStart,
        yStart: state.buffer.yStart,
        width: bufferWidth,
        height: bufferHeight
      };
      if (state.buffer.world) {
        payload.buffer.world = state.buffer.world;
      }
    }

    return payload;
  }

  function computeDesiredViewportSize() {
    const zoom = Math.max(0.001, getCurrentZoom());
    const baseWidth = Math.max(
      1,
      Math.trunc(state.zoomBase.width || state.viewport.width || state.map?.width || DEFAULT_VIEWPORT_SIZE)
    );
    const baseHeight = Math.max(
      1,
      Math.trunc(state.zoomBase.height || state.viewport.height || state.map?.height || DEFAULT_VIEWPORT_SIZE)
    );
    const width = Math.max(1, Math.round(baseWidth / zoom));
    const height = Math.max(1, Math.round(baseHeight / zoom));
    return { width, height };
  }

  function updateZoomDisplayFactor() {
    if (!state.map) {
      state.zoomDisplayFactor = 1;
      return;
    }

    const zoom = getCurrentZoom();

    if (Math.abs(zoom - 1) < 0.001) {
      state.zoomDisplayFactor = 1;
      return;
    }

    const desired = computeDesiredViewportSize();
    const actualCols = Number.isFinite(state.map?.width) && state.map.width > 0
      ? Math.trunc(state.map.width)
      : getGridWidth(state.map?.tiles, desired.width);
    const actualRows = Number.isFinite(state.map?.height) && state.map.height > 0
      ? Math.trunc(state.map.height)
      : getGridHeight(state.map?.tiles, desired.height);
    const widthMatch = Math.abs(actualCols - desired.width) <= 1;
    const heightMatch = Math.abs(actualRows - desired.height) <= 1;
    state.zoomDisplayFactor = widthMatch && heightMatch ? 1 : zoom;
  }

  function adjustViewportForZoom({ forceFetch = false } = {}) {
    const zoom = getCurrentZoom();

    if (!state.map) {
      state.zoomDisplayFactor = Math.abs(zoom - 1) < 0.001 ? 1 : zoom;
      return;
    }

    const desired = computeDesiredViewportSize();
    const prevWidth = Math.max(1, state.viewport.width || state.map.width || desired.width);
    const prevHeight = Math.max(1, state.viewport.height || state.map.height || desired.height);
    const nextWidth = Math.max(1, desired.width);
    const nextHeight = Math.max(1, desired.height);
    const widthChanged = nextWidth !== prevWidth;
    const heightChanged = nextHeight !== prevHeight;

    const centerX = state.viewport.xStart + Math.floor(prevWidth / 2);
    const centerY = state.viewport.yStart + Math.floor(prevHeight / 2);

    state.viewport.width = nextWidth;
    state.viewport.height = nextHeight;
    state.home = computeHomeStart(state.focus);

    if (!widthChanged && !heightChanged) {
      if (forceFetch) {
        updateViewportStart(state.viewport.xStart, state.viewport.yStart, { forceFetch: true });
      } else {
        updateZoomDisplayFactor();
        requestFrame(updateTileSizing);
        requestFrame(syncMarkers);
      }
      return;
    }

    const nextXStart = centerX - Math.floor(nextWidth / 2);
    const nextYStart = centerY - Math.floor(nextHeight / 2);
    updateViewportStart(nextXStart, nextYStart);
  }

  function resolveTerrainColor(type) {
    if (!state.useTerrainColors) return null;
    const normalizedType =
      typeof type === 'string' && type ? type.trim().toLowerCase() : 'open';
    const overrides = state.terrainColorOverrides || null;
    if (overrides && overrides[normalizedType]) {
      return overrides[normalizedType];
    }
    return getTileColor(normalizedType);
  }

  function resolveTerrainGradient(type) {
    if (!state.useTerrainColors) return null;
    const normalizedType =
      typeof type === 'string' && type ? type.trim().toLowerCase() : 'open';
    const overrides = state.terrainColorOverrides || null;
    if (overrides && overrides[normalizedType]) {
      return createGradientFromColor(overrides[normalizedType]);
    }
    return getTileGradient(normalizedType);
  }

  const DEVELOPMENT_CLASSNAMES = [
    'map-tile--developed',
    'map-tile--developed-pending',
    'map-tile--developed-complete',
    'map-tile--developed-mixed',
    'map-tile--developed-planned',
    'map-tile--developed-emphasis'
  ];

  function developmentKey(x, y) {
    return `${Math.trunc(x ?? 0)}:${Math.trunc(y ?? 0)}`;
  }

  function getDevelopmentInfo(x, y) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return state.developmentTiles.get(developmentKey(x, y)) || null;
  }

  function normalizeDevelopment(entry, index = 0) {
    if (!entry && entry !== 0) return null;
    const x = Number(entry.x);
    const y = Number(entry.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    const tileX = Math.trunc(x);
    const tileY = Math.trunc(y);
    const rawStatus = typeof entry.status === 'string' ? entry.status.trim().toLowerCase() : '';
    let status = '';
    switch (rawStatus) {
      case 'completed':
      case 'complete':
      case 'built':
        status = 'completed';
        break;
      case 'under-construction':
      case 'construction':
      case 'in-progress':
      case 'building':
        status = 'under-construction';
        break;
      case 'mixed':
        status = 'mixed';
        break;
      case 'planned':
      case 'planning':
      case 'queued':
        status = 'planned';
        break;
      default:
        status = rawStatus || '';
    }
    const structures = Array.isArray(entry.structures)
      ? entry.structures.map(item => String(item || '').trim()).filter(Boolean)
      : [];
    const count = Number.isFinite(entry.count)
      ? Math.max(0, Math.trunc(entry.count))
      : structures.length;
    const label = typeof entry.label === 'string' && entry.label.trim()
      ? entry.label.trim()
      : structures[0] || 'Development';
    const detailSources = [];
    const addDetail = value => {
      if (typeof value === 'string' && value.trim()) {
        detailSources.push(value.trim());
      }
    };
    addDetail(entry.tooltip);
    addDetail(entry.details);
    addDetail(entry.description);
    addDetail(entry.summary);
    addDetail(entry.note);
    if (!detailSources.length && structures.length > 1) {
      detailSources.push(`Structures: ${structures.join(', ')}`);
    }
    const tooltip = detailSources.join(' • ');
    const normalizedStatus = status
      ? status
      : structures.length
        ? 'completed'
        : count > 0
          ? 'planned'
          : 'noted';
    return {
      key: developmentKey(tileX, tileY),
      x: tileX,
      y: tileY,
      status: normalizedStatus,
      label,
      tooltip,
      structures,
      count,
      emphasis: entry.emphasis === true,
      highlight: entry.highlight === true
    };
  }

  function applyDevelopments(entries = []) {
    const normalized = Array.isArray(entries)
      ? entries.map((entry, index) => normalizeDevelopment(entry, index)).filter(Boolean)
      : [];
    const next = new Map();
    normalized.forEach(info => {
      next.set(info.key, info);
    });
    state.developmentTiles = next;
    if (state.renderer) {
      state.renderer.setDevelopments(state.developmentTiles);
    }
    updateTileDataLayer();
    scheduleRender();
  }

  function commitMapUpdate() {
    if (!state.map) return;
    if (!state.hasInitializedBaseChunk && state.map.tiles?.size) {
      state.hasInitializedBaseChunk = true;
    }
    state.context = {
      ...state.context,
      focus: { ...state.focus },
      viewport: { ...state.viewport },
      world: state.world
    };

    if (typeof state.onMapUpdate === 'function') {
      const payload = buildUpdatePayload();
      if (payload) {
        state.onMapUpdate(payload, state.context);
      }
    }

    const actualCols = Number.isFinite(state.map?.width) && state.map.width > 0
      ? Math.trunc(state.map.width)
      : getGridWidth(
          state.map?.tiles,
          state.viewport.width || state.map?.width || 0
        );
    const actualRows = Number.isFinite(state.map?.height) && state.map.height > 0
      ? Math.trunc(state.map.height)
      : getGridHeight(
          state.map?.tiles,
          state.viewport.height || state.map?.height || 0
        );
    if (!state.zoomBase.width || !state.zoomBase.height || Math.abs(state.zoom - 1) < 0.001) {
      state.zoomBase.width = Math.max(1, actualCols);
      state.zoomBase.height = Math.max(1, actualRows);
    }

    updateZoomDisplayFactor();
    updateWrapperSize();
    syncCameraToViewport({ snap: true });
    applyZoomTransform();
    updateTileDataLayer();

    if (state.pendingZoomSync) {
      const needsSync = Math.abs(state.zoomDisplayFactor - 1) >= 0.001;
      state.pendingZoomSync = false;
      if (needsSync) {
        requestFrame(() => setZoom(state.zoom, { force: true }));
      }
    }
  }

  function needsBufferRefresh() {
    if (!state.buffer?.tiles) return true;
    const bufferWidth = Number.isFinite(state.buffer.width)
      ? Math.max(0, Math.trunc(state.buffer.width))
      : getGridBaseWidth(state.buffer.tiles, 0);
    const bufferHeight = Number.isFinite(state.buffer.height)
      ? Math.max(0, Math.trunc(state.buffer.height))
      : getGridBaseHeight(state.buffer.tiles, 0);
    if (!bufferWidth || !bufferHeight) return true;
    const width = state.viewport.width || bufferWidth;
    const height = state.viewport.height || bufferHeight;
    if (bufferWidth < width || bufferHeight < height) return true;

    const originX = state.buffer.xStart ?? 0;
    const originY = state.buffer.yStart ?? 0;
    const offsetX = state.viewport.xStart - originX;
    const offsetY = state.viewport.yStart - originY;
    if (offsetX < 0 || offsetY < 0) return true;

    const padding = state.bufferPadding || state.expectedBufferPadding || { x: 0, y: 0 };
    const fallbackMargin = Math.max(0, state.bufferMargin ?? 0);
    const effectiveMarginX = Math.max(padding.x || 0, fallbackMargin);
    const effectiveMarginY = Math.max(padding.y || 0, fallbackMargin);

    const thresholdX = effectiveMarginX > 0 ? Math.max(1, Math.floor(effectiveMarginX / 2)) : 0;
    const thresholdY = effectiveMarginY > 0 ? Math.max(1, Math.floor(effectiveMarginY / 2)) : 0;

    const rightGap = bufferWidth - (offsetX + width);
    const bottomGap = bufferHeight - (offsetY + height);

    if (offsetX < thresholdX || offsetY < thresholdY) return true;
    if (rightGap < thresholdX || bottomGap < thresholdY) return true;
    return false;
  }

  function fetchBufferedMap(xStart, yStart, options = {}) {
    if (typeof state.fetchMap !== 'function') return;
    const viewportWidth = Math.max(1, state.viewport.width || DEFAULT_VIEWPORT_SIZE);
    const viewportHeight = Math.max(1, state.viewport.height || DEFAULT_VIEWPORT_SIZE);
    const baseMargin = Math.max(0, state.bufferMargin ?? 0);
    const marginX = Math.max(baseMargin, viewportWidth);
    const marginY = Math.max(baseMargin, viewportHeight);
    const width = viewportWidth + marginX * 2;
    const height = viewportHeight + marginY * 2;
    const targetX = toInteger(xStart, 0);
    const targetY = toInteger(yStart, 0);
    const originX = targetX - marginX;
    const originY = targetY - marginY;
    const seed = options.overrideSeed ?? state.map?.seed ?? state.buffer?.seed ?? state.context?.seed;
    const season = options.overrideSeason ?? state.map?.season ?? state.buffer?.season ?? state.context?.season;
    const skipSanityChecks =
      options.skipSanityChecks ?? (state.hasInitializedBaseChunk === true);

    state.expectedBufferPadding = { x: marginX, y: marginY };

    const params = {
      map: state.map,
      context: state.context,
      seed,
      season,
      xStart: originX,
      yStart: originY,
      width,
      height,
      skipSanityChecks,
      viewport: {
        xStart: targetX,
        yStart: targetY,
        width: viewportWidth,
        height: viewportHeight
      }
    };

    const result = state.fetchMap(params);
    if (result && typeof result.then === 'function') {
      result.then(buffer => applyBuffer(buffer, { targetX, targetY }));
    } else {
      applyBuffer(result, { targetX, targetY });
    }
  }

  function applyBuffer(nextMap, { targetX, targetY } = {}) {
    const buffer = extractBufferMap(nextMap);
    if (!buffer) return;

    const normalizedWidth = Number.isFinite(buffer.width)
      ? Math.max(0, Math.trunc(buffer.width))
      : getGridBaseWidth(buffer.tiles, 0);
    const normalizedHeight = Number.isFinite(buffer.height)
      ? Math.max(0, Math.trunc(buffer.height))
      : getGridBaseHeight(buffer.tiles, 0);
    buffer.width = normalizedWidth;
    buffer.height = normalizedHeight;

    state.buffer = buffer;
    if (buffer.world) {
      applyWorldArtifact(buffer.world);
    }
    if (Number.isFinite(targetX)) state.viewport.xStart = toInteger(targetX, buffer.xStart);
    if (Number.isFinite(targetY)) state.viewport.yStart = toInteger(targetY, buffer.yStart);

    ensureViewportDimensions(buffer);

    if (!updateVisibleFromBuffer()) {
      const limitedWidth = Math.min(state.viewport.width, buffer.width);
      const limitedHeight = Math.min(state.viewport.height, buffer.height);
      state.viewport.width = Math.max(1, limitedWidth);
      state.viewport.height = Math.max(1, limitedHeight);
      if (!updateVisibleFromBuffer()) {
        return;
      }
    }

    const viewportWidth = Math.max(1, Math.min(state.viewport.width, buffer.width || normalizedWidth));
    const viewportHeight = Math.max(1, Math.min(state.viewport.height, buffer.height || normalizedHeight));
    state.bufferPadding = computeBufferPadding(
      { width: buffer.width || normalizedWidth, height: buffer.height || normalizedHeight },
      viewportWidth,
      viewportHeight
    );
    state.expectedBufferPadding = { ...state.bufferPadding };

    commitMapUpdate();
  }

  function updateViewportStart(xStart, yStart, options = {}) {
    state.viewport.xStart = toInteger(xStart, state.viewport.xStart);
    state.viewport.yStart = toInteger(yStart, state.viewport.yStart);

    if (options.forceFetch || needsBufferRefresh()) {
      fetchBufferedMap(state.viewport.xStart, state.viewport.yStart, options);
      return;
    }

    if (updateVisibleFromBuffer()) {
      commitMapUpdate();
    } else {
      fetchBufferedMap(state.viewport.xStart, state.viewport.yStart, options);
    }
  }

  const mapWrapper = document.createElement('div');
  mapWrapper.className = `${idPrefix}-wrapper map-wrapper`;
  mapWrapper.style.position = 'relative';
  mapWrapper.style.border = '1px solid var(--map-border, #ccc)';
  mapWrapper.style.background = 'var(--map-bg, #f4f4f4)';
  mapWrapper.style.overflow = 'hidden';
  mapWrapper.style.cursor = allowDrag ? 'grab' : 'default';
  mapWrapper.style.userSelect = 'none';
  mapWrapper.style.touchAction = allowDrag ? 'none' : 'auto';
  mapWrapper.style.boxSizing = 'border-box';
  mapWrapper.style.aspectRatio = 'auto';
  mapWrapper.style.flexShrink = '0';
  mapWrapper.style.margin = '0 auto';
  if (!mapWrapper.hasAttribute('tabindex')) {
    mapWrapper.setAttribute('tabindex', '0');
  }

  const mapCanvas = document.createElement('div');
  mapCanvas.className = `${idPrefix}-canvas map-canvas`;
  mapCanvas.style.position = 'absolute';
  mapCanvas.style.inset = '0';
  mapCanvas.style.display = 'block';
  mapCanvas.style.overflow = 'hidden';
  mapCanvas.style.boxSizing = 'border-box';
  mapWrapper.appendChild(mapCanvas);

  const mapDisplay = document.createElement('canvas');
  mapDisplay.className = `${idPrefix}-display map-display`;
  mapDisplay.style.position = 'absolute';
  mapDisplay.style.inset = '0';
  mapDisplay.style.width = '100%';
  mapDisplay.style.height = '100%';
  mapDisplay.style.display = 'block';
  mapDisplay.style.boxSizing = 'border-box';
  mapDisplay.style.touchAction = 'none';
  mapCanvas.appendChild(mapDisplay);

  if (state.debug.enabled) {
    const debugOverlay = document.createElement('pre');
    debugOverlay.className = `${idPrefix}-debug-overlay map-debug-overlay`;
    Object.assign(debugOverlay.style, {
      position: 'absolute',
      top: '8px',
      left: '8px',
      margin: '0',
      padding: '8px 10px',
      borderRadius: '10px',
      background: 'rgba(15, 23, 42, 0.78)',
      color: '#f8fafc',
      fontFamily:
        'SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      fontSize: '12px',
      lineHeight: '1.4',
      pointerEvents: 'none',
      whiteSpace: 'pre',
      minWidth: '180px',
      zIndex: '20',
      boxShadow: '0 8px 24px rgba(15, 23, 42, 0.45)',
      border: '1px solid rgba(148, 163, 184, 0.35)'
    });
    mapWrapper.appendChild(debugOverlay);
    state.debug.overlay = debugOverlay;
    updateDebugOverlay();
  }

  const mapDataLayer = document.createElement('div');
  mapDataLayer.className = `${idPrefix}-data map-display-data`;
  mapDataLayer.style.display = 'none';
  mapDataLayer.style.visibility = 'hidden';
  mapDataLayer.style.pointerEvents = 'none';
  mapDataLayer.setAttribute('aria-hidden', 'true');
  mapCanvas.appendChild(mapDataLayer);

  state.camera = createCamera({
    viewportWidth: mapWrapper.clientWidth || 0,
    viewportHeight: mapWrapper.clientHeight || 0,
    minZoom: state.minZoom,
    maxZoom: state.maxZoom,
    initialZoom: state.zoom,
    centerTile: { x: state.focus.x, y: state.focus.y }
  });

  state.renderer = createMapRenderer(mapDisplay, {
    camera: state.camera,
    tileBaseSize: state.tileBaseSize,
    useTerrainColors: state.useTerrainColors,
    getTerrainColor: type => resolveTerrainColor(type),
    getTerrainGradient: type => resolveTerrainGradient(type),
    prefetchMargin: state.bufferMargin
  });
  state.renderer.setWorld(state.world);
  state.renderer.setDevelopments(state.developmentTiles);
  state.renderer.setPrefetchMargin(state.bufferMargin);
  state.dataLayer = mapDataLayer;

  const markerLayer = document.createElement('div');
  markerLayer.className = `${idPrefix}-marker-layer map-marker-layer`;
  markerLayer.style.position = 'absolute';
  markerLayer.style.left = '0';
  markerLayer.style.top = '0';
  markerLayer.style.pointerEvents = 'none';
  markerLayer.style.zIndex = '3';
  markerLayer.style.display = 'block';
  markerLayer.style.transformOrigin = 'top left';
  markerLayer.style.width = '100%';
  markerLayer.style.height = '100%';
  markerLayer.style.transform = 'none';
  mapCanvas.appendChild(markerLayer);
  state.markerLayer = markerLayer;
  syncMarkers();

  const resolveTileFromEvent = event => {
    if (!state.renderer || !state.map) return null;
    const rect = mapDisplay.getBoundingClientRect();
    const localX = event.clientX - rect.left;
    const localY = event.clientY - rect.top;
    if (localX < 0 || localY < 0 || localX > rect.width || localY > rect.height) {
      return null;
    }
    return state.renderer.hitTest(localX, localY);
  };

  function updateDebugOverlay(options = {}) {
    if (!state.debug?.enabled || !state.debug.overlay) return;

    const now =
      typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? performance.now()
        : Date.now();

    if (options.fromRender) {
      const previous = state.debug.lastRenderTimestamp;
      if (Number.isFinite(previous) && previous > 0) {
        const delta = now - previous;
        if (delta > 0) {
          const fpsSample = 1000 / delta;
          const smoothing = 0.85;
          state.debug.fps = state.debug.fps
            ? state.debug.fps * smoothing + fpsSample * (1 - smoothing)
            : fpsSample;
        }
      }
      state.debug.lastRenderTimestamp = now;
    }

    const center = state.camera?.centerTile || state.focus || { x: 0, y: 0 };
    const pointer = state.debug.pointerTile;
    const zoom = getCurrentZoom();
    const formatCoord = value =>
      Number.isFinite(value) ? `${Math.round(value * 100) / 100}` : '—';
    const formatZoom = Number.isFinite(zoom) ? `${Math.round(zoom * 100) / 100}×` : '—';
    const fpsText = state.debug.fps ? `${state.debug.fps.toFixed(1)} fps` : 'n/a';

    const chunkCapacity = chunkDataCache?.capacity ?? null;
    const chunkSize = chunkDataCache?.size ?? null;
    const tileCapacity = tileCanvasCache?.capacity ?? null;
    const tileSize = tileCanvasCache?.size ?? null;
    const poolSize = sharedCanvasPool && typeof sharedCanvasPool.size === 'number'
      ? sharedCanvasPool.size
      : null;

    const overlayLines = [
      pointer
        ? `Current tile: (${formatCoord(pointer.x)}, ${formatCoord(pointer.y)})`
        : 'Current tile: —',
      `Center tile: (${formatCoord(center.x)}, ${formatCoord(center.y)})`,
      `Zoom: ${formatZoom}`,
      `Frame rate: ${fpsText}`,
      `Chunk cache: ${
        chunkSize !== null && chunkCapacity !== null ? `${chunkSize}/${chunkCapacity}` : 'n/a'
      }`,
      `Tile canvases: ${
        tileSize !== null && tileCapacity !== null ? `${tileSize}/${tileCapacity}` : 'n/a'
      }${poolSize !== null ? ` (pool ${poolSize})` : ''}`
    ];

    state.debug.overlay.textContent = overlayLines.join('\n');
  }

  mapDisplay.addEventListener('click', event => {
    if (typeof state.onTileClick !== 'function') return;
    const tileInfo = resolveTileFromEvent(event);
    if (!tileInfo) return;
    const detail = {
      x: tileInfo.x,
      y: tileInfo.y,
      col: tileInfo.col,
      row: tileInfo.row,
      terrain: tileInfo.type || null,
      event,
      map: state.map,
      context: { ...state.context }
    };
    state.onTileClick(detail);
  });

  if (state.debug.enabled) {
    mapDisplay.addEventListener('pointermove', event => {
      const tileInfo = resolveTileFromEvent(event);
      state.debug.pointerTile = tileInfo ? { x: tileInfo.x, y: tileInfo.y } : null;
      updateDebugOverlay();
    });
    mapDisplay.addEventListener('pointerleave', () => {
      state.debug.pointerTile = null;
      updateDebugOverlay();
    });
  }

  const tileTooltip = document.createElement('div');
  tileTooltip.className = 'map-tile-tooltip';
  Object.assign(tileTooltip.style, {
    position: 'absolute',
    display: 'none',
    pointerEvents: 'none',
    padding: '6px 10px',
    borderRadius: '10px',
    background: 'rgba(26, 32, 44, 0.85)',
    color: '#fff',
    fontSize: '13px',
    lineHeight: '1.2',
    boxShadow: '0 8px 18px rgba(0, 0, 0, 0.35)',
    transform: 'translate(-50%, calc(-100% - 12px))',
    zIndex: '12',
    whiteSpace: 'pre-line',
    letterSpacing: '0.02em'
  });
  mapWrapper.appendChild(tileTooltip);

  const tooltipState = {
    visible: false,
    tile: null,
    pointerId: null,
    pointerType: null,
    holdTimer: null,
    holdTarget: null,
    holdOriginX: 0,
    holdOriginY: 0
  };

  const hideTooltip = () => {
    tooltipState.visible = false;
    tooltipState.tile = null;
    tooltipState.pointerId = null;
    tooltipState.pointerType = null;
    tileTooltip.style.display = 'none';
  };

  const updateTooltipPosition = (clientX, clientY, tileInfo) => {
    if (!tooltipState.visible) return;
    const rect = mapWrapper.getBoundingClientRect();
    let localX;
    let localY;
    if (Number.isFinite(clientX) && Number.isFinite(clientY)) {
      localX = clientX - rect.left;
      localY = clientY - rect.top;
    } else if (tileInfo && state.camera) {
      const center = state.camera.worldToScreenCenter(tileInfo.x, tileInfo.y, state.tileBaseSize);
      localX = center.x;
      localY = center.y;
    } else {
      localX = rect.width / 2;
      localY = rect.height / 2;
    }
    const clampedX = Math.min(rect.width - 12, Math.max(12, localX));
    const clampedY = Math.min(rect.height - 12, Math.max(12, localY));
    tileTooltip.style.left = `${clampedX}px`;
    tileTooltip.style.top = `${clampedY}px`;
  };

  const describeTile = tileInfo => {
    if (!tileInfo) return 'Unknown terrain';
    const worldIndex = Number.isFinite(tileInfo.index)
      ? Math.trunc(tileInfo.index)
      : getWorldIndex(state, tileInfo.x, tileInfo.y);
    const layers = state.world?.layers || null;
    let biomeCode = Number.isFinite(tileInfo.biomeCode) ? tileInfo.biomeCode : null;
    if (biomeCode === null && worldIndex >= 0 && layers?.biome) {
      biomeCode = layers.biome[worldIndex] ?? null;
    }
    const biomeLabel = biomeCode !== null ? getBiomeName(biomeCode) : null;
    const headerParts = [];
    if (biomeLabel) {
      headerParts.push(biomeLabel);
    } else {
      const type = tileInfo.type || '';
      headerParts.push(legendLabels[type] || type || 'Unknown terrain');
    }
    headerParts.push(`(${tileInfo.x}, ${tileInfo.y})`);
    if (worldIndex >= 0) {
      const rank = state.spawnSuggestionRank.get(worldIndex);
      if (rank !== undefined) {
        headerParts.push(`Spawn suggestion #${rank + 1}`);
      }
    }

    const stats = [];
    if (layers && worldIndex >= 0) {
      stats.push(`Elev ${formatPercent(readWorldLayerValue(layers.elevation, worldIndex, 0), 0)}`);
      stats.push(`Temp ${formatPercent(readWorldLayerValue(layers.temperature, worldIndex, 0), 0)}`);
      stats.push(`Moist ${formatPercent(readWorldLayerValue(layers.moisture, worldIndex, 0), 0)}`);
      stats.push(`Ore ${formatPercent(readWorldLayerValue(layers.ore, worldIndex, 0), 0)}`);
      stats.push(`Stone ${formatPercent(readWorldLayerValue(layers.stone, worldIndex, 0), 0)}`);
      stats.push(`Water ${formatPercent(readWorldLayerValue(layers.water, worldIndex, 0), 0)}`);
      stats.push(`Fertility ${formatPercent(readWorldLayerValue(layers.fertility, worldIndex, 0), 0)}`);
    }

    let developmentDetail = tileInfo.development?.tooltip || tileInfo.development?.structures?.join(', ');
    if (!developmentDetail) {
      const info = getDevelopmentInfo(tileInfo.x, tileInfo.y);
      const detail = info?.tooltip || (info?.structures?.length ? info.structures.join(', ') : '');
      if (detail) {
        developmentDetail = detail;
      }
    }

    const lines = [headerParts.join(' • ')];
    if (stats.length) {
      lines.push(stats.join(' · '));
    }
    if (developmentDetail) {
      lines.push(`Development: ${developmentDetail}`);
    }
    return lines.join('\n');
  };

  const showTooltip = (tileInfo, event = null) => {
    if (!tileInfo) return;
    tileTooltip.textContent = describeTile(tileInfo);
    tileTooltip.style.display = 'block';
    tooltipState.visible = true;
    tooltipState.tile = tileInfo;
    tooltipState.pointerId = event?.pointerId ?? null;
    tooltipState.pointerType = event?.pointerType ?? null;
    updateTooltipPosition(event?.clientX, event?.clientY, tileInfo);
  };

  const clearHoldTimer = () => {
    if (tooltipState.holdTimer) {
      clearTimeout(tooltipState.holdTimer);
      tooltipState.holdTimer = null;
    }
    tooltipState.holdTarget = null;
    tooltipState.pointerId = null;
    tooltipState.pointerType = null;
  };

  const scheduleHoldTooltip = (event, tileInfo) => {
    clearHoldTimer();
    tooltipState.holdTarget = tileInfo;
    tooltipState.pointerId = event.pointerId;
    tooltipState.pointerType = event.pointerType;
    tooltipState.holdOriginX = event.clientX;
    tooltipState.holdOriginY = event.clientY;
    tooltipState.holdTimer = setTimeout(() => {
      tooltipState.holdTimer = null;
      showTooltip(tileInfo, event);
    }, 450);
  };

  const handlePointerOver = event => {
    const tileInfo = resolveTileFromEvent(event);
    if (!tileInfo) return;
    if (event.pointerType === 'mouse') {
      showTooltip(tileInfo, event);
    }
  };

  const handlePointerMove = event => {
    const tileInfo = resolveTileFromEvent(event);
    if (tooltipState.holdTimer && tooltipState.pointerId === event.pointerId) {
      const dx = event.clientX - tooltipState.holdOriginX;
      const dy = event.clientY - tooltipState.holdOriginY;
      if (Math.hypot(dx, dy) > 12) {
        clearHoldTimer();
      }
    }
    if (tooltipState.visible && tooltipState.pointerId === event.pointerId) {
      updateTooltipPosition(event.clientX, event.clientY, tooltipState.tile);
    } else if (event.pointerType === 'mouse' && tileInfo) {
      showTooltip(tileInfo, event);
    }
  };

  const handlePointerOut = event => {
    if (event.pointerType === 'mouse') {
      hideTooltip();
    }
  };

  const handlePointerDown = event => {
    const tileInfo = resolveTileFromEvent(event);
    if (!tileInfo) return;
    if (event.pointerType === 'mouse') {
      hideTooltip();
      return;
    }
    scheduleHoldTooltip(event, tileInfo);
  };

  const handlePointerUp = event => {
    if (tooltipState.holdTimer && tooltipState.pointerId === event.pointerId) {
      clearHoldTimer();
    }
    if (tooltipState.visible && tooltipState.pointerId === event.pointerId && event.pointerType !== 'mouse') {
      hideTooltip();
    }
  };

  const handlePointerCancel = event => {
    if (tooltipState.holdTimer && tooltipState.pointerId === event.pointerId) {
      clearHoldTimer();
    }
    if (tooltipState.pointerId === event.pointerId) {
      hideTooltip();
    }
  };

  mapDisplay.addEventListener('pointerover', handlePointerOver);
  mapDisplay.addEventListener('pointermove', handlePointerMove);
  mapDisplay.addEventListener('pointerout', handlePointerOut);
  mapDisplay.addEventListener('pointerdown', handlePointerDown);
  mapDisplay.addEventListener('pointerup', handlePointerUp);
  mapDisplay.addEventListener('pointercancel', handlePointerCancel);
  mapWrapper.addEventListener('mouseleave', hideTooltip);

  const iconPreloader = document.createElement('div');
  iconPreloader.setAttribute('aria-hidden', 'true');
  iconPreloader.style.position = 'absolute';
  iconPreloader.style.opacity = '0';
  iconPreloader.style.pointerEvents = 'none';
  iconPreloader.style.fontSize = '1px';
  iconPreloader.style.lineHeight = '1';
  iconPreloader.style.whiteSpace = 'nowrap';
  iconPreloader.style.height = '0';
  iconPreloader.style.overflow = 'hidden';
  iconPreloader.textContent = Object.values(TERRAIN_SYMBOLS).join('');
  mapWrapper.appendChild(iconPreloader);

  const layoutRoot = document.createElement('div');
  layoutRoot.className = `${idPrefix}-layout map-layout`;
  layoutRoot.style.display = 'flex';
  layoutRoot.style.flexDirection = 'column';
  layoutRoot.style.alignItems = 'stretch';
  layoutRoot.style.flexWrap = 'nowrap';
  layoutRoot.style.gap = '16px';
  layoutRoot.style.width = '100%';
  layoutRoot.style.maxWidth = '100%';
  layoutRoot.style.height = '100%';
  layoutRoot.style.minHeight = '100%';

  const mapContainer = document.createElement('div');
  mapContainer.className = `${idPrefix}-map-container map-container`;
  mapContainer.style.display = 'flex';
  mapContainer.style.flexDirection = 'column';
  mapContainer.style.alignItems = 'flex-start';
  mapContainer.style.gap = '12px';
  mapContainer.style.width = '100%';
  mapContainer.style.maxWidth = '100%';
  mapContainer.style.flex = '1 1 auto';
  mapContainer.style.minHeight = '100%';

  const mapPrimaryStack = document.createElement('div');
  mapPrimaryStack.className = `${idPrefix}-primary map-primary-stack`;
  mapPrimaryStack.style.display = 'flex';
  mapPrimaryStack.style.flexDirection = 'column';
  mapPrimaryStack.style.alignItems = 'center';
  mapPrimaryStack.style.gap = '8px';
  mapPrimaryStack.style.width = '100%';
  mapPrimaryStack.style.maxWidth = '100%';
  mapPrimaryStack.style.flex = '1 1 auto';
  mapPrimaryStack.style.minWidth = '0';
  mapPrimaryStack.style.minHeight = '100%';

  const mapStage = document.createElement('div');
  mapStage.className = `${idPrefix}-stage map-stage`;
  mapStage.style.position = 'relative';
  mapStage.style.display = 'flex';
  mapStage.style.flexDirection = 'column';
  mapStage.style.alignItems = 'center';
  mapStage.style.width = '100%';
  mapStage.style.maxWidth = '100%';
  mapStage.style.flex = '1 1 auto';
  mapStage.style.minHeight = '100%';

  mapStage.appendChild(mapWrapper);
  mapPrimaryStack.appendChild(mapStage);
  mapContainer.appendChild(mapPrimaryStack);

  const sideStack = document.createElement('div');
  sideStack.className = `${idPrefix}-control-stack map-control-stack`;
  sideStack.style.display = 'flex';
  sideStack.style.flexDirection = 'column';
  sideStack.style.alignItems = 'stretch';
  sideStack.style.gap = '12px';

  layoutRoot.appendChild(mapContainer);
  container.appendChild(layoutRoot);

  const controls = document.createElement('div');
  let navGrid = null;
  let navOverlay = null;
  let navToggleButton = null;
  let navPanel = null;
  let navPanelVisible = false;
  let controlColumn = null;
  let controlDetailsSection = null;
  let zoomControls = null;
  if (showControls) {
    controls.className = `${idPrefix}-controls map-controls`;
    controls.style.display = 'flex';
    controls.style.flexDirection = 'column';
    controls.style.alignItems = 'flex-start';
    controls.style.gap = '8px';
    controls.style.justifyContent = 'flex-start';
    controls.style.alignSelf = 'flex-start';

    controlColumn = document.createElement('div');
    controlColumn.style.display = 'flex';
    controlColumn.style.flexDirection = 'column';
    controlColumn.style.alignItems = 'stretch';
    controlColumn.style.gap = '10px';
    controls.appendChild(controlColumn);

    const controlColumnWidth = 'calc(3 * 48px + 2 * 6px)';

    navGrid = document.createElement('div');
    navGrid.className = `${idPrefix}-nav map-nav-grid`;
    navGrid.style.display = 'grid';
    navGrid.style.gridTemplateColumns = 'repeat(3, 48px)';
    navGrid.style.gridAutoRows = '48px';
    navGrid.style.gap = '6px';
    navGrid.style.width = controlColumnWidth;

    navPanel = document.createElement('div');
    navPanel.className = `${idPrefix}-nav-panel map-nav-panel`;
    navPanel.setAttribute('role', 'group');
    navPanel.setAttribute('aria-label', 'Map navigation controls');
    navPanel.hidden = true;
    navPanel.setAttribute('aria-hidden', 'true');
    navPanel.appendChild(navGrid);

    const navPanelId = `${idPrefix}-nav-panel`;
    navPanel.id = navPanelId;

    navToggleButton = document.createElement('button');
    navToggleButton.type = 'button';
    navToggleButton.className = 'map-nav-toggle';
    navToggleButton.setAttribute('aria-controls', navPanelId);
    navToggleButton.setAttribute('aria-expanded', 'false');
    navToggleButton.setAttribute('aria-label', 'Toggle navigation controls');
    const navToggleIcon = document.createElement('span');
    navToggleIcon.className = 'map-nav-toggle__icon';
    navToggleIcon.textContent = '🧭';
    navToggleButton.appendChild(navToggleIcon);

    const updateNavPanelVisibility = (open = false) => {
      const nextOpen = Boolean(open);
      navPanelVisible = nextOpen;
      navPanel.hidden = !nextOpen;
      navPanel.setAttribute('aria-hidden', nextOpen ? 'false' : 'true');
      navToggleButton.setAttribute('aria-expanded', nextOpen ? 'true' : 'false');
      navToggleButton.classList.toggle('is-active', nextOpen);
      if (nextOpen) {
        requestFrame(() => {
          const firstButton = navGrid.querySelector('button');
          if (firstButton) {
            firstButton.focus();
          }
        });
      } else if (document.activeElement && navPanel.contains(document.activeElement)) {
        navToggleButton.focus();
      }
    };

    navToggleButton.addEventListener('click', () => {
      updateNavPanelVisibility(!navPanelVisible);
    });

    navPanel.addEventListener('keydown', event => {
      if (!event || typeof event.key !== 'string') return;
      if (event.key === 'Escape') {
        event.preventDefault();
        updateNavPanelVisibility(false);
      }
    });

    navOverlay = document.createElement('div');
    navOverlay.className = `${idPrefix}-nav-overlay map-nav-overlay`;
    navOverlay.style.display = 'flex';
    navOverlay.style.flexDirection = 'column';
    navOverlay.style.alignItems = 'stretch';
    navOverlay.style.gap = '10px';
    navOverlay.style.width = controlColumnWidth;
    navOverlay.style.alignSelf = 'center';
    navOverlay.appendChild(navToggleButton);
    navOverlay.appendChild(navPanel);
    controlColumn.appendChild(navOverlay);

    controlDetailsSection = document.createElement('div');
    controlDetailsSection.className = `${idPrefix}-control-details map-control-details`;
    controlDetailsSection.style.display = 'flex';
    controlDetailsSection.style.flexDirection = 'column';
    controlDetailsSection.style.gap = '12px';
    controlDetailsSection.style.width = controlColumnWidth;
    controlDetailsSection.style.alignSelf = 'center';
    controlDetailsSection.style.boxSizing = 'border-box';
    controlColumn.appendChild(controlDetailsSection);

    zoomControls = createZoomControls({
      onZoomIn: () => {
        zoomBy(1);
      },
      onZoomOut: () => {
        zoomBy(-1);
      },
      onZoomReset: () => {
        resetZoom();
      },
      styleButton: (button, style) => {
        applyControlButtonStyle(button, style);
      }
    });
    zoomControls.element.classList.add(`${idPrefix}-zoom`);
    zoomControls.element.style.alignSelf = 'center';
    const zoomHost = controlsContainer && typeof controlsContainer.appendChild === 'function'
      ? controlsContainer
      : mapPrimaryStack;
    zoomHost.appendChild(zoomControls.element);

    updateZoomControls();
  }

  const actionHandlers = {
    build: actions.build || null,
    craft: actions.craft || null,
    gather: actions.gather || null
  };

  const actionButtons = new Map();
  let actionPanel = null;
  let actionModal = null;
  let actionModalSurface = null;
  let actionModalTitle = null;
  let actionModalDescription = null;
  let actionModalList = null;
  let actionModalEmpty = null;
  let activeAction = null;

  const defaultActionTitles = {
    build: 'Build Projects',
    craft: 'Crafting Recipes',
    gather: 'Gather Resources'
  };

  const defaultActionDescriptions = {
    build: 'Select a structure to plan and raise for the settlement.',
    craft: 'Queue up tools and supplies for your artisans to produce.',
    gather: 'Send your people to comb the surrounding area for useful resources.'
  };

  const jobSelectorConfig = jobSelector && typeof jobSelector === 'object' ? jobSelector : {};
  let jobSelectButton = null;
  let jobSelectWrapper = null;
  let jobOptionsPopup = null;
  let jobOptionsList = null;
  let jobOptionsOpen = false;
  const jobOptionButtons = new Map();
  let jobOptionsPointerDownHandler = null;
  let jobOptionsDocumentKeydownHandler = null;
  let jobSummaryContainer = null;
  let jobMetaLine = null;
  let jobDescriptionLine = null;
  let jobEmptyNotice = null;
  let jobInfoButton = null;
  let jobInfoTooltip = null;
  let jobTooltipHideTimer = null;
  let jobTooltipPressTimer = null;
  let jobTooltipVisible = false;

  const jobSelectorState = {
    options: [],
    selectedId: null,
    laborers: null
  };

  function singularizeJobLabel(label) {
    if (typeof label !== 'string') return '';
    const trimmed = label.trim();
    if (!trimmed) return '';
    if (trimmed.length > 1 && /s$/i.test(trimmed) && !/ss$/i.test(trimmed)) {
      return trimmed.replace(/s$/i, '');
    }
    return trimmed;
  }

  function normalizeJobOption(option = {}) {
    const idValue = typeof option.id === 'string' && option.id.trim() ? option.id.trim() : null;
    if (!idValue) return null;
    const rawLabel = typeof option.label === 'string' && option.label.trim() ? option.label.trim() : idValue;
    const displayLabel = singularizeJobLabel(rawLabel);
    const assigned = Number.isFinite(option.assigned) ? Math.max(0, Math.trunc(option.assigned)) : 0;
    const capacity = Number.isFinite(option.capacity) ? Math.max(0, Math.trunc(option.capacity)) : null;
    const description = option.description || '';
    const workdayHours = Number.isFinite(option.workdayHours)
      ? Math.max(1, Math.trunc(option.workdayHours))
      : null;
    return { id: idValue, label: rawLabel, displayLabel, assigned, capacity, description, workdayHours };
  }

  function hasJobTooltipContent() {
    if (!jobSummaryContainer) return false;
    return jobSummaryContainer.dataset.hasContent === 'true';
  }

  function updateJobTooltipVisibility(visible) {
    if (!jobInfoTooltip) return;
    jobTooltipVisible = Boolean(visible && hasJobTooltipContent());
    if (jobTooltipVisible) {
      jobInfoTooltip.style.opacity = '1';
      jobInfoTooltip.style.visibility = 'visible';
      jobInfoTooltip.style.transform = 'translateY(0)';
      jobInfoTooltip.style.pointerEvents = 'auto';
      if (jobInfoButton) {
        jobInfoButton.setAttribute('aria-expanded', 'true');
      }
    } else {
      jobInfoTooltip.style.opacity = '0';
      jobInfoTooltip.style.visibility = 'hidden';
      jobInfoTooltip.style.transform = 'translateY(-4px)';
      jobInfoTooltip.style.pointerEvents = 'none';
      if (jobInfoButton) {
        jobInfoButton.setAttribute('aria-expanded', 'false');
      }
    }
  }

  function scheduleJobTooltipHide(delay = 140) {
    clearTimeout(jobTooltipHideTimer);
    if (!hasJobTooltipContent()) {
      updateJobTooltipVisibility(false);
      return;
    }
    jobTooltipHideTimer = setTimeout(() => {
      updateJobTooltipVisibility(false);
    }, Math.max(0, delay));
  }

  function cancelJobTooltipTimers() {
    clearTimeout(jobTooltipHideTimer);
    clearTimeout(jobTooltipPressTimer);
    jobTooltipHideTimer = null;
    jobTooltipPressTimer = null;
  }

  function formatJobOptionLabel(option) {
    if (!option) return '';
    if (typeof option.displayLabel === 'string' && option.displayLabel) {
      return option.displayLabel;
    }
    return option.label;
  }

  function updateJobSelectButtonLabel() {
    if (!jobSelectButton) return;
    const selected = jobSelectorState.options.find(option => option.id === jobSelectorState.selectedId) || null;
    if (selected) {
      jobSelectButton.textContent = formatJobOptionLabel(selected);
      jobSelectButton.dataset.placeholder = 'false';
    } else if (!jobSelectorState.options.length) {
      jobSelectButton.textContent = jobSelectorConfig.emptyOptionLabel || 'No jobs available';
      jobSelectButton.dataset.placeholder = 'true';
    } else {
      const first = jobSelectorState.options[0];
      jobSelectButton.textContent = formatJobOptionLabel(first);
      jobSelectButton.dataset.placeholder = 'false';
    }
  }

  function updateJobOptionSelection() {
    const currentId = jobSelectorState.selectedId;
    jobOptionButtons.forEach((button, id) => {
      const isSelected = id === currentId;
      button.dataset.selected = isSelected ? 'true' : 'false';
      button.setAttribute('aria-selected', isSelected ? 'true' : 'false');
      button.setAttribute('tabindex', isSelected ? '0' : '-1');
      if (isSelected) {
        button.style.background = 'var(--map-select-selected, linear-gradient(135deg, rgba(40, 72, 140, 0.92), rgba(28, 52, 108, 0.88)))';
        button.style.boxShadow = 'inset 0 0 0 1px rgba(150, 182, 246, 0.35)';
        button.style.opacity = '1';
      } else {
        button.style.background = 'transparent';
        button.style.boxShadow = 'none';
        button.style.opacity = '0.9';
      }
    });
  }

  function ensureJobOptionsHandlers() {
    if (!jobOptionsPointerDownHandler) {
      jobOptionsPointerDownHandler = event => {
        if (!jobOptionsOpen) return;
        if (!jobOptionsPopup || !jobSelectWrapper) return;
        if (jobOptionsPopup.contains(event.target) || jobSelectWrapper.contains(event.target)) {
          return;
        }
        setJobOptionsOpen(false);
      };
    }
    if (!jobOptionsDocumentKeydownHandler) {
      jobOptionsDocumentKeydownHandler = event => {
        if (!jobOptionsOpen) return;
        if (event.key === 'Escape') {
          event.preventDefault();
          setJobOptionsOpen(false, { focusButton: true });
        }
      };
    }
  }

  function setJobOptionsOpen(open, { focusButton = false } = {}) {
    if (!jobSelectButton || !jobOptionsPopup) return;
    if (!jobSelectorState.options.length) {
      open = false;
    }
    const nextState = Boolean(open);
    if (jobOptionsOpen === nextState) {
      if (!nextState && focusButton) {
        requestAnimationFrame(() => {
          jobSelectButton.focus({ preventScroll: true });
        });
      }
      return;
    }
    jobOptionsOpen = nextState;
    jobSelectButton.setAttribute('aria-expanded', jobOptionsOpen ? 'true' : 'false');
    jobOptionsPopup.setAttribute('aria-hidden', jobOptionsOpen ? 'false' : 'true');
    if (jobOptionsOpen) {
      ensureJobOptionsHandlers();
      jobSelectButton.dataset.open = 'true';
      jobSelectButton.style.boxShadow = '0 0 0 2px rgba(154, 196, 255, 0.55), 0 8px 18px rgba(0, 0, 0, 0.4)';
      jobOptionsPopup.style.display = 'flex';
      jobOptionsPopup.style.opacity = '1';
      jobOptionsPopup.style.pointerEvents = 'auto';
      document.addEventListener('pointerdown', jobOptionsPointerDownHandler, true);
      document.addEventListener('keydown', jobOptionsDocumentKeydownHandler, true);
      const selectedButton = jobOptionButtons.get(jobSelectorState.selectedId);
      const fallbackButton = selectedButton || jobOptionsList?.querySelector('button[data-option-id]');
      if (fallbackButton) {
        requestAnimationFrame(() => {
          fallbackButton.focus({ preventScroll: true });
        });
      }
    } else {
      jobSelectButton.dataset.open = 'false';
      jobSelectButton.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.35)';
      jobOptionsPopup.style.display = 'none';
      jobOptionsPopup.style.opacity = '0';
      jobOptionsPopup.style.pointerEvents = 'none';
      document.removeEventListener('pointerdown', jobOptionsPointerDownHandler, true);
      document.removeEventListener('keydown', jobOptionsDocumentKeydownHandler, true);
      if (focusButton) {
        requestAnimationFrame(() => {
          jobSelectButton.focus({ preventScroll: true });
        });
      }
    }
  }

  function getJobOptionButtons() {
    if (!jobOptionsList) return [];
    return Array.from(jobOptionsList.querySelectorAll('button[data-option-id]'));
  }

  function focusJobOptionByIndex(index) {
    const buttons = getJobOptionButtons();
    if (!buttons.length) return;
    const clampedIndex = Math.min(Math.max(index, 0), buttons.length - 1);
    const target = buttons[clampedIndex];
    if (target) {
      target.focus({ preventScroll: true });
    }
  }

  function focusAdjacentJobOption(offset) {
    const buttons = getJobOptionButtons();
    if (!buttons.length) return;
    const activeElement = typeof document !== 'undefined' ? document.activeElement : null;
    let index = buttons.indexOf(activeElement);
    if (index === -1) {
      const selectedButton = jobOptionButtons.get(jobSelectorState.selectedId);
      if (selectedButton) {
        index = buttons.indexOf(selectedButton);
      }
    }
    if (index === -1) {
      index = 0;
    }
    const nextIndex = (index + offset + buttons.length) % buttons.length;
    focusJobOptionByIndex(nextIndex);
  }

  function renderJobSummary() {
    if (!jobSummaryContainer) return;
    jobSummaryContainer.dataset.hasContent = 'false';
    updateJobTooltipVisibility(false);
    const selected = jobSelectorState.options.find(option => option.id === jobSelectorState.selectedId);
    if (!selected) {
      if (jobInfoButton) {
        jobInfoButton.style.display = 'none';
        jobInfoButton.disabled = true;
      }
      if (jobMetaLine) {
        jobMetaLine.textContent = '';
        jobMetaLine.style.display = 'none';
      }
      if (jobDescriptionLine) {
        jobDescriptionLine.textContent = '';
        jobDescriptionLine.style.display = 'none';
      }
      if (jobEmptyNotice) {
        jobEmptyNotice.textContent = jobSelectorConfig.emptyMessage || 'No jobs are available right now.';
        jobEmptyNotice.style.display = jobSelectorState.options.length ? 'none' : 'block';
      }
      return;
    }

    if (jobInfoButton) {
      jobInfoButton.style.display = 'inline-flex';
    }
    if (jobEmptyNotice) {
      jobEmptyNotice.style.display = 'none';
    }

    if (jobMetaLine) {
      const metaParts = [];
      if (Number.isFinite(selected.capacity)) {
        metaParts.push(`Assigned ${selected.assigned}/${selected.capacity}`);
      } else {
        metaParts.push(`Assigned ${selected.assigned}`);
      }
      if (Number.isFinite(selected.workdayHours)) {
        metaParts.push(`${selected.workdayHours}h`);
      }
      if (Number.isFinite(jobSelectorState.laborers)) {
        metaParts.push(`${jobSelectorState.laborers} laborers free`);
      }
      jobMetaLine.textContent = metaParts.join(' · ');
      jobMetaLine.style.display = metaParts.length ? 'block' : 'none';
    }

    if (jobDescriptionLine) {
      if (selected.description) {
        jobDescriptionLine.textContent = selected.description;
        jobDescriptionLine.style.display = 'block';
      } else if (jobSelectorConfig.defaultDescription) {
        jobDescriptionLine.textContent = jobSelectorConfig.defaultDescription;
        jobDescriptionLine.style.display = 'block';
      } else {
        jobDescriptionLine.textContent = '';
        jobDescriptionLine.style.display = 'none';
      }
    }

    const hasContent = Boolean(jobMetaLine?.textContent || jobDescriptionLine?.textContent);
    jobSummaryContainer.dataset.hasContent = hasContent ? 'true' : 'false';
    if (jobInfoButton) {
      jobInfoButton.disabled = !hasContent;
      jobInfoButton.style.display = hasContent ? 'inline-flex' : 'none';
      if (!hasContent) {
        updateJobTooltipVisibility(false);
      }
    }
  }

  function applyJobSelection(jobId, { fromUser = false } = {}) {
    if (!jobSelectorState.options.length) {
      jobSelectorState.selectedId = null;
      updateJobSelectButtonLabel();
      updateJobOptionSelection();
      renderJobSummary();
      return;
    }

    const selected = jobSelectorState.options.find(option => option.id === jobId)
      || jobSelectorState.options[0]
      || null;
    jobSelectorState.selectedId = selected ? selected.id : null;
    updateJobSelectButtonLabel();
    updateJobOptionSelection();
    if (fromUser) {
      setJobOptionsOpen(false, { focusButton: true });
    }
    renderJobSummary();
    if (fromUser && typeof jobSelectorConfig.onSelect === 'function') {
      try {
        jobSelectorConfig.onSelect(jobSelectorState.selectedId, {
          options: jobSelectorState.options.slice()
        });
      } catch (error) {
        console.warn('Job selector onSelect failed', error);
      }
    }
  }

  function refreshJobSelectorUI() {
    if (!jobSelectButton || !jobOptionsList || !jobOptionsPopup) return;
    setJobOptionsOpen(false);
    jobOptionButtons.clear();
    jobOptionsList.innerHTML = '';

    if (!jobSelectorState.options.length) {
      jobSelectButton.disabled = true;
      jobSelectButton.textContent = jobSelectorConfig.emptyOptionLabel || 'No jobs available';
      jobSelectButton.dataset.placeholder = 'true';
      if (jobEmptyNotice) {
        jobEmptyNotice.textContent = jobSelectorConfig.emptyMessage || 'No jobs are available right now.';
        jobEmptyNotice.style.display = 'block';
      }
      return;
    }

    jobSelectButton.disabled = false;

    jobSelectorState.options.forEach(option => {
      const optionItem = document.createElement('li');
      optionItem.style.listStyle = 'none';
      optionItem.style.margin = '0';
      optionItem.style.padding = '0';

      const optionButton = document.createElement('button');
      optionButton.type = 'button';
      optionButton.dataset.optionId = option.id;
      optionButton.textContent = formatJobOptionLabel(option);
      optionButton.setAttribute('role', 'option');
      optionButton.setAttribute('aria-selected', 'false');
      optionButton.style.width = '100%';
      optionButton.style.border = 'none';
      optionButton.style.background = 'transparent';
      optionButton.style.color = 'inherit';
      optionButton.style.padding = '10px 16px';
      optionButton.style.fontWeight = '600';
      optionButton.style.fontSize = '15px';
      optionButton.style.letterSpacing = '0.03em';
      optionButton.style.textTransform = 'uppercase';
      optionButton.style.textAlign = 'left';
      optionButton.style.cursor = 'pointer';
      optionButton.style.transition = 'background 0.12s ease, box-shadow 0.12s ease, opacity 0.12s ease';
      optionButton.style.opacity = '0.9';
      optionButton.style.borderRadius = '0';

      optionButton.addEventListener('click', () => {
        applyJobSelection(option.id, { fromUser: true });
      });

      optionButton.addEventListener('keydown', event => {
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          focusAdjacentJobOption(1);
        } else if (event.key === 'ArrowUp') {
          event.preventDefault();
          focusAdjacentJobOption(-1);
        } else if (event.key === 'Home') {
          event.preventDefault();
          focusJobOptionByIndex(0);
        } else if (event.key === 'End') {
          event.preventDefault();
          const buttons = getJobOptionButtons();
          focusJobOptionByIndex(Math.max(0, buttons.length - 1));
        } else if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          applyJobSelection(option.id, { fromUser: true });
        } else if (event.key === 'Tab') {
          setJobOptionsOpen(false);
        }
      });

      optionButton.addEventListener('mouseenter', () => {
        if (optionButton.dataset.selected !== 'true') {
          optionButton.style.background = 'var(--map-select-hover, rgba(42, 70, 128, 0.82))';
          optionButton.style.boxShadow = 'inset 0 0 0 1px rgba(146, 176, 238, 0.18)';
          optionButton.style.opacity = '1';
        }
      });

      optionButton.addEventListener('mouseleave', () => {
        if (optionButton.dataset.selected !== 'true') {
          optionButton.style.background = 'transparent';
          optionButton.style.boxShadow = 'none';
          optionButton.style.opacity = '0.9';
        }
      });

      optionButton.addEventListener('focus', () => {
        if (optionButton.dataset.selected !== 'true') {
          optionButton.style.background = 'var(--map-select-hover, rgba(42, 70, 128, 0.82))';
          optionButton.style.boxShadow = 'inset 0 0 0 1px rgba(146, 176, 238, 0.22)';
          optionButton.style.opacity = '1';
        }
      });

      optionButton.addEventListener('blur', () => {
        if (optionButton.dataset.selected !== 'true') {
          optionButton.style.background = 'transparent';
          optionButton.style.boxShadow = 'none';
          optionButton.style.opacity = '0.9';
        }
      });

      optionItem.appendChild(optionButton);
      jobOptionsList.appendChild(optionItem);
      jobOptionButtons.set(option.id, optionButton);
    });

    if (!jobSelectorState.options.some(option => option.id === jobSelectorState.selectedId)) {
      jobSelectorState.selectedId = jobSelectorState.options[0]?.id || null;
    }

    updateJobSelectButtonLabel();
    updateJobOptionSelection();

    if (jobEmptyNotice) {
      jobEmptyNotice.style.display = 'none';
    }

    renderJobSummary();
  }

  function applyJobOptions(options = [], { selectedId = null, laborers = null } = {}) {
    jobSelectorState.options = Array.isArray(options)
      ? options.map(normalizeJobOption).filter(Boolean)
      : [];
    jobSelectorState.laborers = Number.isFinite(laborers)
      ? Math.max(0, Math.trunc(laborers))
      : null;

    if (selectedId && jobSelectorState.options.some(option => option.id === selectedId)) {
      jobSelectorState.selectedId = selectedId;
    } else if (!jobSelectorState.options.some(option => option.id === jobSelectorState.selectedId)) {
      jobSelectorState.selectedId = jobSelectorState.options[0]?.id || null;
    }

    refreshJobSelectorUI();
  }

  const updateActionButtonVisual = (button, active) => {
    if (!button) return;
    if (active) {
      button.style.background = 'var(--action-button-bg-active, linear-gradient(135deg, rgba(45, 108, 223, 0.95), rgba(88, 173, 255, 0.95)))';
      button.style.color = 'var(--action-button-text-active, #fff)';
      button.style.boxShadow = 'var(--action-button-shadow-active, 0 6px 16px rgba(45, 108, 223, 0.35))';
    } else {
      button.style.background = 'var(--action-button-bg, linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(235, 235, 235, 0.92)))';
      button.style.color = 'var(--action-button-text, inherit)';
      button.style.boxShadow = 'var(--action-button-shadow, 0 2px 6px rgba(0, 0, 0, 0.08))';
    }
  };

  const setActiveButton = key => {
    actionButtons.forEach((button, id) => {
      const isActive = key === id;
      button.dataset.active = isActive ? 'true' : 'false';
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      updateActionButtonVisual(button, isActive);
    });
  };

  const handleActionModalKeydown = event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeActionModal();
    }
  };

  const closeActionModal = () => {
    if (!actionModal) {
      activeAction = null;
      setActiveButton(null);
      return;
    }
    actionModal.style.display = 'none';
    actionModal.setAttribute('aria-hidden', 'true');
    document.removeEventListener('keydown', handleActionModalKeydown);
    activeAction = null;
    setActiveButton(null);
  };

  const ensureActionModal = () => {
    if (actionModal) return actionModal;

    actionModal = document.createElement('div');
    actionModal.id = `${idPrefix}-action-modal`;
    actionModal.setAttribute('role', 'dialog');
    actionModal.setAttribute('aria-modal', 'true');
    actionModal.setAttribute('aria-hidden', 'true');
    actionModal.setAttribute('aria-labelledby', `${idPrefix}-action-modal-title`);
    Object.assign(actionModal.style, {
      position: 'fixed',
      inset: '0',
      display: 'none',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      background: 'rgba(0, 0, 0, 0.55)',
      zIndex: '2200'
    });

    actionModal.addEventListener('click', event => {
      if (event.target === actionModal) {
        closeActionModal();
      }
    });

    actionModalSurface = document.createElement('div');
    actionModalSurface.tabIndex = -1;
    Object.assign(actionModalSurface.style, {
      background: 'var(--menu-bg)',
      color: 'var(--text-color)',
      borderRadius: '16px',
      padding: '20px',
      width: 'min(520px, 92vw)',
      maxHeight: 'min(600px, 90vh)',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 24px 48px rgba(0, 0, 0, 0.35)'
    });

    const header = document.createElement('div');
    Object.assign(header.style, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px'
    });

    actionModalTitle = document.createElement('h3');
    actionModalTitle.id = `${idPrefix}-action-modal-title`;
    actionModalTitle.style.margin = '0';
    header.appendChild(actionModalTitle);

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', () => {
      closeActionModal();
    });
    header.appendChild(closeBtn);

    actionModalSurface.appendChild(header);

    const body = document.createElement('div');
    Object.assign(body.style, {
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      marginTop: '14px',
      overflowY: 'auto'
    });

    actionModalDescription = document.createElement('p');
    actionModalDescription.style.margin = '0';
    actionModalDescription.style.color = 'var(--text-color)';
    actionModalDescription.style.opacity = '0.82';
    body.appendChild(actionModalDescription);

    actionModalList = document.createElement('div');
    Object.assign(actionModalList.style, {
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    });
    body.appendChild(actionModalList);

    actionModalEmpty = document.createElement('p');
    actionModalEmpty.style.margin = '0';
    actionModalEmpty.style.display = 'none';
    actionModalEmpty.style.opacity = '0.75';
    body.appendChild(actionModalEmpty);

    actionModalSurface.appendChild(body);
    actionModal.appendChild(actionModalSurface);
    document.body.appendChild(actionModal);
    return actionModal;
  };

  const createModalOption = (item, handler) => {
    const option = document.createElement('button');
    option.type = 'button';
    option.className = 'map-action-option';
    option.disabled = Boolean(item.disabled);
    Object.assign(option.style, {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'stretch',
      gap: '6px',
      padding: '14px 16px',
      borderRadius: '14px',
      border: '1px solid var(--map-border, #ccc)',
      background: 'var(--action-option-bg, rgba(255, 255, 255, 0.95))',
      color: 'var(--text-color)',
      textAlign: 'left',
      cursor: option.disabled ? 'not-allowed' : 'pointer',
      transition: 'transform 0.18s ease, box-shadow 0.2s ease, border-color 0.2s ease',
      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)'
    });

    if (!option.disabled) {
      option.addEventListener('mouseenter', () => {
        option.style.boxShadow = '0 8px 18px rgba(0, 0, 0, 0.16)';
        option.style.transform = 'translateY(-1px)';
      });
      option.addEventListener('mouseleave', () => {
        option.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.1)';
        option.style.transform = 'translateY(0)';
      });
    } else {
      option.style.opacity = '0.65';
    }

    const title = document.createElement('span');
    title.style.fontWeight = '600';
    title.style.fontSize = '16px';
    title.textContent = item.name || item.id || 'Option';
    option.appendChild(title);

    if (item.description) {
      const desc = document.createElement('span');
      desc.style.fontSize = '13px';
      desc.style.opacity = '0.8';
      desc.textContent = item.description;
      option.appendChild(desc);
    }

    if (item.disabled && item.disabledReason) {
      const note = document.createElement('span');
      note.style.fontSize = '12px';
      note.style.color = 'rgba(177, 52, 52, 0.85)';
      note.textContent = item.disabledReason;
      option.appendChild(note);
    } else if (item.actionLabel) {
      const hint = document.createElement('span');
      hint.style.fontSize = '12px';
      hint.style.opacity = '0.7';
      hint.textContent = item.actionLabel;
      option.appendChild(hint);
    }

    option.addEventListener('click', () => {
      if (option.disabled) return;
      const result = typeof handler?.onSelect === 'function' ? handler.onSelect(item) : null;
      if (result !== false) {
        closeActionModal();
      }
    });

    return option;
  };

  const renderModalOptions = (items, handler) => {
    actionModalList.innerHTML = '';
    items.forEach(item => {
      actionModalList.appendChild(createModalOption(item, handler));
    });
    actionModalList.style.display = 'flex';
  };

  const openActionModal = key => {
    const handler = actionHandlers[key];
    if (!handler) {
      closeActionModal();
      return;
    }

    ensureActionModal();

    const title = handler.title || defaultActionTitles[key] || 'Actions';
    actionModalTitle.textContent = title;

    const description = handler.description || defaultActionDescriptions[key] || '';
    if (description) {
      actionModalDescription.textContent = description;
      actionModalDescription.style.display = 'block';
    } else {
      actionModalDescription.textContent = '';
      actionModalDescription.style.display = 'none';
    }

    actionModalList.innerHTML = '';
    actionModalEmpty.textContent = '';
    actionModalEmpty.style.display = 'none';
    actionModalList.style.display = 'none';

    if (key === 'gather' && typeof handler.onExecute === 'function') {
      const gatherItem = {
        id: 'gather-now',
        name: handler.primaryLabel || 'Begin gathering run',
        description: handler.actionHint || 'Send your settlers to search the immediate area for forage and firewood.'
      };
      renderModalOptions([gatherItem], {
        onSelect: () => {
          handler.onExecute();
        }
      });
    } else if (typeof handler.getItems === 'function') {
      const items = handler.getItems() || [];
      if (!items.length) {
        actionModalEmpty.textContent = handler.emptyMessage || 'Nothing is available right now.';
        actionModalEmpty.style.display = 'block';
      } else {
        renderModalOptions(items, handler);
      }
    } else {
      actionModalEmpty.textContent = handler.emptyMessage || 'No actions are currently available.';
      actionModalEmpty.style.display = 'block';
    }

    actionModal.style.display = 'flex';
    actionModal.setAttribute('aria-hidden', 'false');
    document.addEventListener('keydown', handleActionModalKeydown);
    activeAction = key;
    setActiveButton(key);

    if (actionModalSurface) {
      if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
        window.requestAnimationFrame(() => actionModalSurface.focus());
      } else {
        setTimeout(() => actionModalSurface.focus(), 0);
      }
    }
  };

  const handleActionButton = key => {
    if (activeAction === key) {
      closeActionModal();
      return;
    }
    openActionModal(key);
  };

  const createActionButton = (key, labelText) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `map-action-button map-action-${key}`;
    button.textContent = labelText;
    button.setAttribute('aria-pressed', 'false');
    Object.assign(button.style, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '12px 18px',
      borderRadius: '14px',
      border: '1px solid var(--map-border, #ccc)',
      fontWeight: '600',
      fontSize: '15px',
      letterSpacing: '0.03em',
      textTransform: 'uppercase',
      cursor: 'pointer',
      transition: 'transform 0.15s ease, box-shadow 0.2s ease, background 0.2s ease',
      minWidth: '0',
      width: '100%',
      alignSelf: 'stretch',
      background: 'var(--action-button-bg, linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(235, 235, 235, 0.92)))',
      color: 'var(--action-button-text, inherit)',
      boxShadow: 'var(--action-button-shadow, 0 2px 6px rgba(0, 0, 0, 0.08))'
    });
    updateActionButtonVisual(button, false);
    button.addEventListener('mouseenter', () => {
      if (button.dataset.active === 'true') return;
      button.style.boxShadow = 'var(--action-button-shadow-hover, 0 6px 16px rgba(0, 0, 0, 0.12))';
    });
    button.addEventListener('mouseleave', () => {
      const isActive = button.dataset.active === 'true';
      updateActionButtonVisual(button, isActive);
    });
    button.addEventListener('focus', () => {
      if (button.dataset.active === 'true') return;
      button.style.boxShadow = '0 6px 16px rgba(45, 108, 223, 0.28)';
    });
    button.addEventListener('blur', () => {
      const isActive = button.dataset.active === 'true';
      updateActionButtonVisual(button, isActive);
    });
    button.addEventListener('click', () => handleActionButton(key));
    actionButtons.set(key, button);
    return button;
  };

  if (showLegend) {
    actionPanel = document.createElement('div');
    actionPanel.className = `${idPrefix}-action-panel map-action-panel`;
    actionPanel.style.display = 'flex';
    actionPanel.style.flexDirection = 'column';
    actionPanel.style.alignItems = 'stretch';
    actionPanel.style.gap = '12px';
    actionPanel.style.padding = '12px';
    actionPanel.style.borderRadius = '16px';
    actionPanel.style.border = '1px solid var(--map-border, #ccc)';
    actionPanel.style.background =
      'var(--action-panel-bg, linear-gradient(135deg, rgba(250, 250, 255, 0.94), rgba(232, 236, 252, 0.9)))';
    actionPanel.style.boxShadow = '0 18px 42px rgba(4, 10, 28, 0.25)';
    actionPanel.style.alignSelf = 'flex-start';

    if (jobSelectorConfig.title) {
      const panelTitle = document.createElement('h4');
      panelTitle.textContent = jobSelectorConfig.title;
      panelTitle.style.margin = '0';
      panelTitle.style.fontSize = '18px';
      panelTitle.style.letterSpacing = '0.04em';
      actionPanel.appendChild(panelTitle);
    }

    const jobHost = controlDetailsSection || actionPanel;
    const jobSection = document.createElement('div');
    jobSection.className = `${idPrefix}-job-selector map-job-selector`;
    Object.assign(jobSection.style, {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      padding: '12px 14px',
      borderRadius: '14px',
      border: '1px solid var(--map-border, rgba(104, 132, 194, 0.75))',
      background: 'var(--map-control-surface, linear-gradient(135deg, rgba(16, 28, 62, 0.95), rgba(12, 22, 46, 0.92)))',
      boxShadow: '0 10px 24px rgba(0, 0, 0, 0.35)',
      color: 'var(--map-control-text, #f4f7ff)',
      width: '100%',
      boxSizing: 'border-box'
    });
    jobHost.appendChild(jobSection);

    const jobLabelRow = document.createElement('div');
    Object.assign(jobLabelRow.style, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '8px',
      position: 'relative'
    });
    jobSection.appendChild(jobLabelRow);

    const jobLabel = document.createElement('label');
    jobLabel.textContent = jobSelectorConfig.label || 'Jobs';
    jobLabel.id = `${idPrefix}-job-label`;
    jobLabel.htmlFor = `${idPrefix}-job-select`;
    jobLabel.style.fontSize = '15px';
    jobLabel.style.fontWeight = '600';
    jobLabel.style.letterSpacing = '0.04em';
    jobLabel.style.textTransform = 'uppercase';
    jobLabel.style.color = 'inherit';
    jobLabelRow.appendChild(jobLabel);

    jobInfoButton = document.createElement('button');
    jobInfoButton.type = 'button';
    jobInfoButton.textContent = 'i';
    jobInfoButton.setAttribute('aria-label', `${jobSelectorConfig.label || 'Job'} details`);
    jobInfoButton.setAttribute('aria-haspopup', 'true');
    jobInfoButton.setAttribute('aria-expanded', 'false');
    Object.assign(jobInfoButton.style, {
      width: '22px',
      height: '22px',
      display: 'none',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '50%',
      border: '1px solid var(--map-border, rgba(126, 152, 212, 0.75))',
      background: 'transparent',
      color: 'inherit',
      fontWeight: '700',
      fontSize: '13px',
      cursor: 'pointer',
      lineHeight: '1',
      padding: '0'
    });
    jobLabelRow.appendChild(jobInfoButton);

    jobInfoTooltip = document.createElement('div');
    jobInfoTooltip.id = `${idPrefix}-job-tooltip`;
    jobInfoTooltip.setAttribute('role', 'tooltip');
    Object.assign(jobInfoTooltip.style, {
      position: 'absolute',
      right: '0',
      top: 'calc(100% + 8px)',
      maxWidth: '260px',
      minWidth: '220px',
      padding: '12px 14px',
      borderRadius: '12px',
      border: '1px solid var(--map-border, rgba(126, 152, 212, 0.85))',
      background: 'var(--map-tooltip-bg, rgba(10, 18, 38, 0.96))',
      boxShadow: '0 12px 28px rgba(0, 0, 0, 0.45)',
      color: 'inherit',
      opacity: '0',
      visibility: 'hidden',
      transform: 'translateY(-4px)',
      transition: 'opacity 0.12s ease, transform 0.12s ease',
      pointerEvents: 'none',
      zIndex: '30'
    });
    jobLabelRow.appendChild(jobInfoTooltip);

    jobInfoButton.setAttribute('aria-controls', jobInfoTooltip.id);

    jobSelectWrapper = document.createElement('div');
    jobSelectWrapper.style.position = 'relative';
    jobSelectWrapper.style.display = 'flex';
    jobSelectWrapper.style.alignItems = 'center';
    jobSelectWrapper.style.width = '100%';
    jobSection.appendChild(jobSelectWrapper);

    jobSelectButton = document.createElement('button');
    jobSelectButton.type = 'button';
    jobSelectButton.id = `${idPrefix}-job-select`;
    jobSelectButton.textContent = jobSelectorConfig.placeholderLabel || jobSelectorConfig.label || 'Select';
    jobSelectButton.dataset.placeholder = 'true';
    jobSelectButton.dataset.open = 'false';
    jobSelectButton.disabled = true;
    jobSelectButton.setAttribute('aria-haspopup', 'listbox');
    jobSelectButton.setAttribute('aria-expanded', 'false');
    jobSelectButton.setAttribute('aria-labelledby', `${jobLabel.id} ${jobSelectButton.id}`);
    jobSelectButton.setAttribute('aria-label', jobSelectorConfig.ariaLabel || jobSelectorConfig.label || 'Jobs');
    Object.assign(jobSelectButton.style, {
      width: '100%',
      borderRadius: '12px',
      border: '1px solid var(--map-border, rgba(126, 152, 212, 0.8))',
      padding: '12px 42px 12px 16px',
      fontWeight: '600',
      fontSize: '15px',
      letterSpacing: '0.03em',
      textTransform: 'uppercase',
      background: 'var(--map-select-bg, linear-gradient(135deg, rgba(20, 38, 78, 0.98), rgba(16, 28, 56, 0.95)))',
      color: 'var(--map-select-text, #f5f8ff)',
      boxShadow: '0 6px 16px rgba(0, 0, 0, 0.35)',
      cursor: 'pointer',
      textAlign: 'left',
      lineHeight: '1.2',
      transition: 'box-shadow 0.12s ease, transform 0.12s ease',
      outline: 'none'
    });
    jobSelectWrapper.appendChild(jobSelectButton);

    const caret = document.createElement('span');
    caret.textContent = '▾';
    caret.setAttribute('aria-hidden', 'true');
    Object.assign(caret.style, {
      position: 'absolute',
      right: '16px',
      top: '50%',
      transform: 'translateY(-50%)',
      pointerEvents: 'none',
      fontSize: '14px',
      color: 'var(--map-select-caret, #d8e2ff)',
      opacity: '0.85'
    });
    jobSelectWrapper.appendChild(caret);

    jobOptionsPopup = document.createElement('div');
    jobOptionsPopup.setAttribute('aria-hidden', 'true');
    Object.assign(jobOptionsPopup.style, {
      position: 'absolute',
      left: '0',
      right: '0',
      top: 'calc(100% + 8px)',
      borderRadius: '14px',
      border: '1px solid var(--map-border, rgba(126, 152, 212, 0.9))',
      background:
        'var(--map-select-popup-bg, linear-gradient(135deg, rgba(18, 32, 66, 0.94), rgba(8, 20, 40, 0.9)))',
      boxShadow: '0 18px 42px rgba(4, 10, 26, 0.55)',
      padding: '8px 0',
      display: 'none',
      flexDirection: 'column',
      gap: '0',
      zIndex: '40',
      maxHeight: '280px',
      overflowY: 'auto'
    });
    jobSelectWrapper.appendChild(jobOptionsPopup);

    jobOptionsList = document.createElement('ul');
    jobOptionsList.id = `${idPrefix}-job-options`;
    jobOptionsList.setAttribute('role', 'listbox');
    jobOptionsList.setAttribute('aria-labelledby', jobLabel.id);
    Object.assign(jobOptionsList.style, {
      display: 'flex',
      flexDirection: 'column',
      margin: '0',
      padding: '0',
      gap: '0',
      listStyle: 'none'
    });
    jobOptionsPopup.appendChild(jobOptionsList);
    jobSelectButton.setAttribute('aria-controls', jobOptionsList.id);

    jobSelectButton.addEventListener('click', () => {
      setJobOptionsOpen(!jobOptionsOpen);
    });

    jobSelectButton.addEventListener('keydown', event => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        if (!jobOptionsOpen) {
          setJobOptionsOpen(true);
        } else {
          focusAdjacentJobOption(1);
        }
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        if (!jobOptionsOpen) {
          setJobOptionsOpen(true);
        } else {
          focusAdjacentJobOption(-1);
        }
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        setJobOptionsOpen(!jobOptionsOpen);
      } else if (event.key === 'Escape' && jobOptionsOpen) {
        event.preventDefault();
        setJobOptionsOpen(false, { focusButton: true });
      }
    });

    jobSelectButton.addEventListener('focus', () => {
      jobSelectButton.style.boxShadow = '0 0 0 2px rgba(154, 196, 255, 0.55), 0 6px 16px rgba(0, 0, 0, 0.35)';
    });

    jobSelectButton.addEventListener('blur', () => {
      if (!jobOptionsOpen) {
        jobSelectButton.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.35)';
      }
    });

    jobSummaryContainer = document.createElement('div');
    jobSummaryContainer.dataset.hasContent = 'false';
    Object.assign(jobSummaryContainer.style, {
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      fontSize: '13px',
      opacity: '0.92'
    });
    jobInfoTooltip.appendChild(jobSummaryContainer);

    jobMetaLine = document.createElement('span');
    jobMetaLine.style.color = 'inherit';
    jobMetaLine.style.display = 'none';
    jobSummaryContainer.appendChild(jobMetaLine);

    jobDescriptionLine = document.createElement('span');
    jobDescriptionLine.style.opacity = '0.78';
    jobDescriptionLine.style.lineHeight = '1.35';
    jobDescriptionLine.style.display = 'none';
    jobSummaryContainer.appendChild(jobDescriptionLine);

    jobEmptyNotice = document.createElement('span');
    jobEmptyNotice.style.fontSize = '13px';
    jobEmptyNotice.style.opacity = '0.8';
    jobEmptyNotice.style.display = 'none';
    jobSection.appendChild(jobEmptyNotice);

    const showJobTooltip = () => {
      cancelJobTooltipTimers();
      updateJobTooltipVisibility(true);
    };

    const hideJobTooltip = delay => {
      scheduleJobTooltipHide(typeof delay === 'number' ? delay : undefined);
    };

    jobInfoButton.addEventListener('mouseenter', () => {
      if (!hasJobTooltipContent()) return;
      showJobTooltip();
    });

    jobInfoButton.addEventListener('mouseleave', () => {
      hideJobTooltip(120);
    });

    jobInfoButton.addEventListener('focus', () => {
      if (!hasJobTooltipContent()) return;
      showJobTooltip();
    });

    jobInfoButton.addEventListener('blur', () => {
      hideJobTooltip(100);
    });

    jobInfoButton.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (!hasJobTooltipContent()) return;
        updateJobTooltipVisibility(!jobTooltipVisible);
      }
    });

    jobInfoButton.addEventListener('pointerdown', event => {
      if (event.pointerType === 'touch' || event.pointerType === 'pen') {
        cancelJobTooltipTimers();
        jobTooltipPressTimer = setTimeout(() => {
          if (hasJobTooltipContent()) {
            updateJobTooltipVisibility(true);
          }
        }, 420);
      }
    });

    jobInfoButton.addEventListener('pointerup', event => {
      if (event.pointerType === 'touch' || event.pointerType === 'pen') {
        cancelJobTooltipTimers();
        hideJobTooltip(200);
      }
    });

    jobInfoButton.addEventListener('pointerleave', event => {
      if (event.pointerType === 'touch' || event.pointerType === 'pen') {
        cancelJobTooltipTimers();
        hideJobTooltip(200);
      }
    });

    if (jobSelectorState.options.length) {
      refreshJobSelectorUI();
    } else {
      applyJobOptions(Array.isArray(jobSelectorConfig.options) ? jobSelectorConfig.options : [], {
        selectedId: jobSelectorConfig.initialId || null,
        laborers: jobSelectorConfig.laborers
      });
    }
  }

  function isLandscapeOrientation() {
    if (typeof window === 'undefined') return true;
    if (typeof window.matchMedia === 'function') {
      const portraitQuery = window.matchMedia('(orientation: portrait)');
      if (portraitQuery && typeof portraitQuery.matches === 'boolean') {
        return !portraitQuery.matches;
      }
    }
    return window.innerWidth >= window.innerHeight;
  }

  function applyResponsiveLayout() {
    const isLandscape = isLandscapeOrientation();
    const hasControls = showControls && controls;
    const hasActions = Boolean(actionPanel);
    layoutRoot.style.flexDirection = 'column';
    layoutRoot.style.alignItems = 'stretch';
    layoutRoot.style.flexWrap = 'nowrap';

    if (mapPrimaryStack.parentElement !== mapContainer) {
      mapContainer.insertBefore(mapPrimaryStack, mapContainer.firstChild);
    }

    mapPrimaryStack.style.alignSelf = isLandscape && hasControls ? 'flex-start' : 'stretch';
    mapPrimaryStack.style.width = '100%';
    mapPrimaryStack.style.maxWidth = '100%';

    if (isLandscape && hasControls) {
      mapContainer.style.flexDirection = 'row';
      mapContainer.style.flexWrap = 'nowrap';
      mapContainer.style.gap = '16px';
      mapContainer.style.justifyContent = 'flex-start';
      mapContainer.style.alignItems = 'flex-start';
      if (!sideStack.parentElement) {
        mapContainer.appendChild(sideStack);
      }
      sideStack.style.alignItems = 'flex-start';
      sideStack.style.justifyContent = 'flex-start';
      if (controls.parentElement !== sideStack) {
        if (controls.parentElement) {
          controls.parentElement.removeChild(controls);
        }
        sideStack.appendChild(controls);
      }
      controls.style.margin = '0';
      controls.style.alignItems = 'flex-start';
      controls.style.alignSelf = 'flex-start';
      controls.style.justifyContent = 'flex-start';
    } else {
      mapContainer.style.flexDirection = 'column';
      mapContainer.style.flexWrap = 'nowrap';
      mapContainer.style.gap = '12px';
      mapContainer.style.justifyContent = 'flex-start';
      mapContainer.style.alignItems = 'flex-start';
      if (sideStack.parentElement) {
        sideStack.parentElement.removeChild(sideStack);
      }
      if (hasControls) {
        if (controls.parentElement && controls.parentElement !== mapContainer) {
          controls.parentElement.removeChild(controls);
        }
        if (controls.parentElement !== mapContainer) {
          mapContainer.appendChild(controls);
        }
        controls.style.margin = '16px 0 0';
        controls.style.alignItems = 'flex-start';
        controls.style.alignSelf = 'flex-start';
        controls.style.justifyContent = 'flex-start';
      } else if (controls?.parentElement) {
        controls.parentElement.removeChild(controls);
      }
    }

    if (!hasControls && sideStack.parentElement) {
      sideStack.parentElement.removeChild(sideStack);
    }

    if (hasActions && actionPanel) {
      if (actionPanel.parentElement && actionPanel.parentElement !== layoutRoot) {
        actionPanel.parentElement.removeChild(actionPanel);
      }
      layoutRoot.appendChild(actionPanel);
      actionPanel.style.alignSelf = 'stretch';
    }

    requestFrame(updateTileSizing);
    requestFrame(syncLayoutMetrics);
  }

  function syncLayoutMetrics() {
    if (typeof document === 'undefined') return;
    if (!layoutRoot?.isConnected) return;
    const rect = typeof layoutRoot.getBoundingClientRect === 'function'
      ? layoutRoot.getBoundingClientRect()
      : null;
    const width = rect?.width ? Math.round(rect.width) : 0;
    if (!width) return;
    document.documentElement.style.setProperty('--map-layout-width', `${width}px`);
  }

  function normalizeFocusCoords(coords = {}) {
    const x = Number.isFinite(coords.x) ? coords.x : 0;
    const y = Number.isFinite(coords.y) ? coords.y : 0;
    return { x, y };
  }

  function computeHomeStart(coords = {}) {
    const visible = getVisibleDimensions();
    const cols = state.viewport.width || visible.cols || DEFAULT_VIEWPORT_SIZE;
    const rows = state.viewport.height || visible.rows || DEFAULT_VIEWPORT_SIZE;
    if (!cols || !rows) {
      return { xStart: state.map?.xStart || 0, yStart: state.map?.yStart || 0 };
    }
    const focus = normalizeFocusCoords(coords);
    const halfCols = Math.floor(cols / 2);
    const halfRows = Math.floor(rows / 2);
    return {
      xStart: Math.round(focus.x) - halfCols,
      yStart: Math.round(focus.y) - halfRows
    };
  }

  function normalizeMarker(marker = {}, index = 0) {
    const x = Number.isFinite(marker.x) ? Math.trunc(marker.x) : null;
    const y = Number.isFinite(marker.y) ? Math.trunc(marker.y) : null;
    if (x === null || y === null) return null;
    const id = marker.id || `marker-${index}`;
    const icon = marker.icon === undefined || marker.icon === null ? '' : String(marker.icon);
    const className = marker.className || '';
    const emphasis = Boolean(marker.emphasis);
    const label = marker.label || '';
    const color = marker.color || '';
    const worldIndex = Number.isFinite(marker.index) ? Math.trunc(marker.index) : null;
    return { id, x, y, icon, className, emphasis, label, color, index: worldIndex };
  }

  function syncMarkers() {
    if (!state.markerLayer) return;
    if (!state.map?.tiles || !state.map.tiles.size) {
      state.markerElements.forEach(element => {
        if (element) element.style.display = 'none';
      });
      return;
    }

    const width = Number.isFinite(state.map.width) && state.map.width > 0
      ? Math.trunc(state.map.width)
      : getGridWidth(state.map.tiles, 0);
    const height = Number.isFinite(state.map.height) && state.map.height > 0
      ? Math.trunc(state.map.height)
      : getGridHeight(state.map.tiles, 0);
    if (!width || !height || !state.camera) {
      state.markerElements.forEach(element => {
        if (element) element.style.display = 'none';
      });
      return;
    }

    const activeIds = new Set();
    const combinedMarkers = state.markerDefs.concat(state.spawnSuggestionMarkers || []);
    combinedMarkers.forEach(marker => {
      const col = marker.x - state.map.xStart;
      const row = marker.y - state.map.yStart;
      if (!Number.isFinite(col) || !Number.isFinite(row)) return;
      if (col < 0 || row < 0 || col >= width || row >= height) {
        const existing = state.markerElements.get(marker.id);
        if (existing) existing.style.display = 'none';
        return;
      }

      let element = state.markerElements.get(marker.id);
      if (!element) {
        element = document.createElement('span');
        element.className = 'map-marker';
        element.style.position = 'absolute';
        element.style.transform = 'translate(-50%, -50%)';
        element.style.pointerEvents = 'none';
        element.style.lineHeight = '1';
        element.style.textShadow = '0 0 4px rgba(0, 0, 0, 0.35)';
        state.markerLayer.appendChild(element);
        state.markerElements.set(marker.id, element);
      }

      element.textContent = marker.icon;
      element.style.fontSize = marker.emphasis ? '1.6em' : '1.4em';
      if (marker.color) {
        element.style.color = marker.color;
      } else {
        element.style.color = '';
      }
      if (marker.label) {
        element.title = marker.label;
        element.setAttribute('aria-label', marker.label);
      } else {
        element.removeAttribute('title');
        element.removeAttribute('aria-label');
      }

      const classNames = ['map-marker'];
      if (marker.className) classNames.push(marker.className);
      if (marker.emphasis) classNames.push('map-marker--emphasis');
      element.className = classNames.join(' ');

      const center = state.camera.worldToScreenCenter(marker.x, marker.y, state.tileBaseSize);
      const withinBounds =
        Number.isFinite(center.x) &&
        Number.isFinite(center.y) &&
        center.x >= 0 &&
        center.y >= 0 &&
        center.x <= state.camera.viewportWidth &&
        center.y <= state.camera.viewportHeight;
      if (!withinBounds) {
        element.style.display = 'none';
        return;
      }

      element.style.left = `${center.x}px`;
      element.style.top = `${center.y}px`;
      element.style.display = 'block';
      activeIds.add(marker.id);
    });

    state.markerElements.forEach((element, id) => {
      if (!activeIds.has(id) && element) {
        element.style.display = 'none';
      }
    });
  }

  function applyMarkers(markers = []) {
    const normalized = Array.isArray(markers)
      ? markers
          .map((marker, index) => normalizeMarker(marker, index))
          .filter(Boolean)
      : [];
    state.markerDefs = normalized;
    syncMarkers();
  }

  function updateZoomControls() {
    if (!zoomControls) return;
    const baselineZoom = Number.isFinite(state.initialZoom) ? state.initialZoom : 1;
    const zoom = getCurrentZoom();
    zoomControls.update({
      zoom,
      minZoom: state.minZoom,
      maxZoom: state.maxZoom,
      baselineZoom,
      camera: state.camera
    });
  }

  function applyZoomTransform() {
    const scale = Number.isFinite(state.zoomDisplayFactor) ? state.zoomDisplayFactor : 1;
    const zoom = getCurrentZoom();
    if (state.renderer) {
      const rendererScale = state.camera ? zoom : scale || 1;
      state.renderer.setScale(rendererScale);
    }
    scheduleRender();
    updateZoomControls();
  }

  function setZoom(nextZoom, options = {}) {
    let clamped = nextZoom;
    if (state.camera) {
      const previous = state.camera.zoom;
      clamped = state.camera.setZoom(nextZoom, options.pivot === 'viewport' ? 'viewport' : 'centerTile');
      if (!options.force && Math.abs(clamped - previous) < 0.001) {
        state.zoom = clamped;
        updateZoomDisplayFactor();
        applyZoomTransform();
        return;
      }
      state.zoom = clamped;
    } else {
      clamped = Math.min(state.maxZoom, Math.max(state.minZoom, nextZoom));
      if (!options.force && Math.abs(clamped - state.zoom) < 0.001) {
        updateZoomDisplayFactor();
        applyZoomTransform();
        return;
      }
      state.zoom = clamped;
    }
    adjustViewportForZoom({ forceFetch: Boolean(options.force) });
    updateZoomDisplayFactor();
    applyZoomTransform();
  }

  const ZOOM_IN_FACTOR = 1.25;
  const ZOOM_OUT_FACTOR = 0.8;

  function zoomBy(direction) {
    if (!Number.isFinite(direction) || direction === 0) return;
    const currentZoom = getCurrentZoom();
    const multiplier = direction > 0 ? ZOOM_IN_FACTOR : ZOOM_OUT_FACTOR;
    const nextZoom = clampNumber(currentZoom * multiplier, state.minZoom, state.maxZoom);
    setZoom(nextZoom);
  }

  function resetZoom() {
    setZoom(state.initialZoom || 1);
  }

  function updateTileSizing() {
    if (!state.renderer) return;

    const pixelWidth = Number.isFinite(state.camera?.viewportWidth)
      ? state.camera.viewportWidth
      : mapWrapper?.clientWidth || state.renderer.canvas?.clientWidth || 0;
    const pixelHeight = Number.isFinite(state.camera?.viewportHeight)
      ? state.camera.viewportHeight
      : mapWrapper?.clientHeight || state.renderer.canvas?.clientHeight || 0;

    const fallbackCols = Number.isFinite(state.viewport.width) && state.viewport.width > 0
      ? state.viewport.width
      : Number.isFinite(state.map?.width) && state.map.width > 0
        ? state.map.width
        : getGridWidth(state.map?.tiles, 0);
    const fallbackRows = Number.isFinite(state.viewport.height) && state.viewport.height > 0
      ? state.viewport.height
      : Number.isFinite(state.map?.height) && state.map.height > 0
        ? state.map.height
        : getGridHeight(state.map?.tiles, 0);

    const baselineCols = Math.max(
      1,
      Math.trunc(
        Number.isFinite(state.zoomBase.width) && state.zoomBase.width > 0
          ? state.zoomBase.width
          : Number.isFinite(fallbackCols) && fallbackCols > 0
            ? fallbackCols
            : 0,
      ),
    );
    const baselineRows = Math.max(
      1,
      Math.trunc(
        Number.isFinite(state.zoomBase.height) && state.zoomBase.height > 0
          ? state.zoomBase.height
          : Number.isFinite(fallbackRows) && fallbackRows > 0
            ? fallbackRows
            : 0,
      ),
    );

    let resolvedBase = Number.isFinite(state.tileBaseSize) && state.tileBaseSize > 0
      ? state.tileBaseSize
      : DEFAULT_TILE_BASE_SIZE;

    if (pixelWidth > 0 && pixelHeight > 0 && baselineCols > 0 && baselineRows > 0) {
      const tileWidth = pixelWidth / baselineCols;
      const tileHeight = pixelHeight / baselineRows;
      const candidate = Math.max(2, Math.min(tileWidth, tileHeight));
      if (Number.isFinite(candidate) && candidate > 0) {
        resolvedBase = candidate;
      }
    }

    state.tileBaseSize = resolvedBase;
    state.renderer.setTileBaseSize(resolvedBase);
    state.renderer.setUseTerrainColors(state.useTerrainColors);

    const zoom = getCurrentZoom();
    const rendererScale = state.camera ? zoom : state.zoomDisplayFactor || 1;
    state.renderer.setScale(rendererScale);
    scheduleRender();
  }

  function readNumericStyle(element, property) {
    if (!element || typeof window === 'undefined' || !window.getComputedStyle) {
      return 0;
    }
    try {
      const value = window.getComputedStyle(element).getPropertyValue(property);
      if (!value) return 0;
      const parsed = parseFloat(value);
      return Number.isFinite(parsed) ? parsed : 0;
    } catch (_error) {
      return 0;
    }
  }

  function updateWrapperSize() {
    if (!mapWrapper) return;

    mapWrapper.style.width = '100%';
    mapWrapper.style.height = '100%';
    mapWrapper.style.minWidth = '100%';
    mapWrapper.style.minHeight = '100%';

    const wrapperRect = typeof mapWrapper.getBoundingClientRect === 'function'
      ? mapWrapper.getBoundingClientRect()
      : null;
    const containerRect = typeof container?.getBoundingClientRect === 'function'
      ? container.getBoundingClientRect()
      : null;

    let width = Number.isFinite(wrapperRect?.width) && wrapperRect.width > 0
      ? wrapperRect.width
      : mapWrapper.clientWidth || 0;
    if (!(width > 0)) {
      width = Number.isFinite(containerRect?.width) && containerRect.width > 0
        ? containerRect.width
        : container?.clientWidth || 0;
    }

    let height = Number.isFinite(wrapperRect?.height) && wrapperRect.height > 0
      ? wrapperRect.height
      : mapWrapper.clientHeight || 0;
    if (!(height > 0)) {
      height = Number.isFinite(containerRect?.height) && containerRect.height > 0
        ? containerRect.height
        : container?.clientHeight || 0;
    }
    if (!(height > 0)) {
      const fallbackSquare = Number.isFinite(width) && width > 0 ? width : 0;
      if (fallbackSquare > 0) {
        height = fallbackSquare;
      }
    }
    if (!(height > 0)) {
      height = readNumericStyle(container, 'min-height') || readNumericStyle(mapWrapper, 'min-height');
    }
    if (!(height > 0)) {
      height = DEFAULT_VIEWPORT_SIZE;
    }

    const pixelWidth = Math.max(0, Math.round(width));
    const pixelHeight = Math.max(0, Math.round(height));

    if (state.renderer) {
      state.renderer.resize(pixelWidth, pixelHeight);
    }
    if (state.camera) {
      state.camera.setViewportSize(pixelWidth, pixelHeight);
      syncCameraToViewport();
    }

    updateTileSizing();

    requestFrame(() => {
      syncLayoutMetrics();
      syncMarkers();
    });
  }

  function centerMap(options = {}) {
    state.home = computeHomeStart(state.focus);
    updateViewportStart(state.home.xStart, state.home.yStart, options);
  }

  function setFocus(coords = {}, options = {}) {
    state.focus = normalizeFocusCoords(coords);
    state.context = { ...state.context, focus: { ...state.focus } };
    state.home = computeHomeStart(state.focus);
    if (options.recenter !== false) {
      centerMap(options);
    }
  }

  function syncCameraToViewport({ snap = false } = {}) {
    if (!state.camera) return;
    const width = Number.isFinite(state.viewport.width)
      ? state.viewport.width
      : Number.isFinite(state.map?.width) && state.map.width > 0
        ? state.map.width
        : getGridWidth(state.map?.tiles, 0);
    const height = Number.isFinite(state.viewport.height)
      ? state.viewport.height
      : Number.isFinite(state.map?.height) && state.map.height > 0
        ? state.map.height
        : getGridHeight(state.map?.tiles, 0);
    if (!width || !height) return;
    const centerX = state.viewport.xStart + width / 2;
    const centerY = state.viewport.yStart + height / 2;
    state.camera.setCenterTile({ x: centerX, y: centerY }, { snap });
  }

  function alignViewportToCamera(options = {}) {
    if (!state.camera) return;
    const center = options.center || null;
    const forceFetch = options.forceFetch === true;
    const width = Number.isFinite(state.viewport.width)
      ? state.viewport.width
      : Number.isFinite(state.map?.width) && state.map.width > 0
        ? state.map.width
        : getGridWidth(state.map?.tiles, 0);
    const height = Number.isFinite(state.viewport.height)
      ? state.viewport.height
      : Number.isFinite(state.map?.height) && state.map.height > 0
        ? state.map.height
        : getGridHeight(state.map?.tiles, 0);
    if (!width || !height) return;
    const centerTile = center || state.camera.centerTile;
    const nextXStart = Math.round(centerTile.x - width / 2);
    const nextYStart = Math.round(centerTile.y - height / 2);
    const currentX = Number.isFinite(state.viewport.xStart) ? state.viewport.xStart : state.map?.xStart || 0;
    const currentY = Number.isFinite(state.viewport.yStart) ? state.viewport.yStart : state.map?.yStart || 0;
    if (nextXStart === currentX && nextYStart === currentY) {
      return;
    }
    updateViewportStart(nextXStart, nextYStart, { forceFetch });
  }

  function cancelKeyboardSnap() {
    if (state.keyboardPan?.timer) {
      clearTimeout(state.keyboardPan.timer);
      state.keyboardPan.timer = null;
    }
  }

  function scheduleKeyboardSnap() {
    cancelKeyboardSnap();
    state.keyboardPan.timer = setTimeout(() => {
      state.keyboardPan.timer = null;
      commitCameraSnap();
    }, KEYBOARD_SNAP_DELAY);
  }

  function commitCameraSnap(options = {}) {
    if (!state.camera) return null;
    cancelKeyboardSnap();
    let completed = false;
    const result = state.camera.commitSnap({
      animate: options.animate !== false,
      duration: options.duration,
      onUpdate: () => {
        scheduleRender();
      },
      onComplete: center => {
        completed = true;
        scheduleRender();
        alignViewportToCamera({ center, forceFetch: Boolean(options.forceFetch) });
      }
    });
    if (!completed && !result?.changed) {
      alignViewportToCamera({ forceFetch: Boolean(options.forceFetch) });
    }
    return result;
  }

  function applyDevelopmentData(tile, worldX, worldY) {
    if (!tile) return;
    DEVELOPMENT_CLASSNAMES.forEach(className => tile.classList.remove(className));
    delete tile.dataset.development;
    delete tile.dataset.developmentLabel;
    delete tile.dataset.developmentStatus;
    delete tile.dataset.developmentDetails;
    delete tile.dataset.developmentCount;

    const info = getDevelopmentInfo(worldX, worldY);
    if (!info) return;
    tile.classList.add('map-tile--developed');
    if (info.status === 'under-construction') {
      tile.classList.add('map-tile--developed-pending');
    } else if (info.status === 'completed') {
      tile.classList.add('map-tile--developed-complete');
    } else if (info.status === 'planned') {
      tile.classList.add('map-tile--developed-planned');
    } else {
      tile.classList.add('map-tile--developed-mixed');
    }
    if (info.emphasis || info.highlight) {
      tile.classList.add('map-tile--developed-emphasis');
    }
    tile.dataset.development = 'true';
    if (info.label) tile.dataset.developmentLabel = info.label;
    if (info.status) tile.dataset.developmentStatus = info.status;
    const detailText = info.tooltip || (info.structures?.length ? info.structures.join(', ') : '');
    if (detailText) tile.dataset.developmentDetails = detailText;
    if (Number.isFinite(info.count) && info.count > 0) {
      tile.dataset.developmentCount = `${info.count}`;
    }
  }

  function updateTileDataLayer() {
    const layer = state.dataLayer;
    if (!layer) return;
    const tileView = state.map?.tiles;
    if (!tileView || !tileView.size) {
      layer.replaceChildren();
      return;
    }

    const cols = Number.isFinite(state.map?.width) && state.map.width > 0
      ? Math.trunc(state.map.width)
      : getGridWidth(tileView, 0);
    const rows = Number.isFinite(state.map?.height) && state.map.height > 0
      ? Math.trunc(state.map.height)
      : getGridHeight(tileView, 0);
    if (!rows || !cols) {
      layer.replaceChildren();
      return;
    }

    const required = rows * cols;
    if (layer.children.length !== required) {
      const fragment = document.createDocumentFragment();
      for (let i = 0; i < required; i++) {
        const tile = document.createElement('span');
        tile.className = 'map-tile';
        const symbol = document.createElement('span');
        symbol.className = 'map-tile-symbol';
        tile.appendChild(symbol);
        fragment.appendChild(tile);
      }
      layer.replaceChildren(fragment);
    }

    const tiles = layer.children;
    let index = 0;
    for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
      for (let colIndex = 0; colIndex < cols; colIndex++) {
        const tileNode = tiles[index++];
        if (!(tileNode instanceof HTMLElement)) continue;
        const tile = tileNode;
        let symbolEl = tile.firstElementChild;
        if (!(symbolEl instanceof HTMLElement)) {
          symbolEl = document.createElement('span');
          symbolEl.className = 'map-tile-symbol';
          tile.appendChild(symbolEl);
        }

        const worldX = state.map.xStart + colIndex;
        const worldY = state.map.yStart + rowIndex;
        tile.dataset.col = `${colIndex}`;
        tile.dataset.row = `${rowIndex}`;
        tile.dataset.worldX = `${worldX}`;
        tile.dataset.worldY = `${worldY}`;

        const type = state.map.types?.get
          ? state.map.types.get(colIndex, rowIndex)
          : state.map.types?.[rowIndex]?.[colIndex] ?? null;
        const worldIndex = getWorldIndex(state, worldX, worldY);
        const biomeLayer = state.world?.layers?.biome || null;
        const biomeCode = biomeLayer && worldIndex >= 0 ? biomeLayer[worldIndex] ?? null : null;
        const biomeName = biomeCode !== null ? getBiomeName(biomeCode) : null;
        const biomeId = biomeCode !== null ? getBiomeId(biomeCode) : null;
        if (biomeId) {
          tile.dataset.terrain = biomeId;
          tile.dataset.biome = biomeId;
        } else if (type) {
          tile.dataset.terrain = type;
          delete tile.dataset.biome;
        } else {
          delete tile.dataset.terrain;
          delete tile.dataset.biome;
        }

        const fallbackSymbol = tileView.get(colIndex, rowIndex) ?? '';
        const fillColor = biomeCode !== null ? getBiomeCssColor(biomeCode) : resolveTerrainColor(type);
        const labelText = biomeName || legendLabels[type] || fallbackSymbol || type || '';
        if (symbolEl) {
          symbolEl.textContent = labelText;
          symbolEl.style.backgroundColor = fillColor || 'transparent';
          symbolEl.style.borderRadius = fillColor ? '6px' : '';
          symbolEl.style.boxShadow = fillColor ? 'inset 0 0 0 1px rgba(0, 0, 0, 0.18)' : '';
        }

        if (fillColor) {
          tile.classList.add('map-tile--fill');
        } else {
          tile.classList.remove('map-tile--fill');
        }

        applyDevelopmentData(tile, worldX, worldY);
      }
    }
  }

  function scheduleRender() {
    if (!state.renderer || state.renderScheduled) return;
    state.renderScheduled = true;
    requestFrame(() => {
      state.renderScheduled = false;
      render();
    });
  }

  function render() {
    if (!state.renderer) return;
    if (!state.map?.tiles || !state.map.tiles.size) {
      state.renderer.setWorld(state.world);
      state.renderer.setMap(null);
      state.renderer.render();
      syncMarkers();
      updateTileDataLayer();
      updateDebugOverlay({ fromRender: true });
      return;
    }
    state.renderer.setWorld(state.world);
    state.renderer.setMap({ ...state.map });
    state.renderer.render();
    updateTileDataLayer();
    syncMarkers();
    updateDebugOverlay({ fromRender: true });
  }

  function getViewportStepLimits() {
    const width = Number.isFinite(state.viewport.width)
      ? state.viewport.width
      : getGridWidth(state.map?.tiles, 0);
    const height = Number.isFinite(state.viewport.height)
      ? state.viewport.height
      : getGridHeight(state.map?.tiles, 0);
    return {
      maxX: Math.max(0, Math.trunc(width) - 1),
      maxY: Math.max(0, Math.trunc(height) - 1)
    };
  }

  function getPanStepSize() {
    const cols = state.viewport.width || getGridWidth(state.map?.tiles, 0);
    const rows = state.viewport.height || getGridHeight(state.map?.tiles, 0);
    if (!cols || !rows) {
      return null;
    }
    return {
      stepX: Math.max(1, Math.floor(cols * 0.5)),
      stepY: Math.max(1, Math.floor(rows * 0.5))
    };
  }

  function moveViewportBySteps(dx, dy, options = {}) {
    if (!dx && !dy) return;
    const steps = getPanStepSize();
    if (!steps) return;
    const deltaX = steps.stepX * dx;
    const deltaY = steps.stepY * dy;
    if (!deltaX && !deltaY) return;
    if (state.camera) {
      shiftViewport(deltaX, deltaY, options);
      return;
    }
    shiftViewport(deltaX, deltaY, options);
  }

  function shiftViewport(dxTiles, dyTiles, options = {}) {
    if (!dxTiles && !dyTiles) return;
    const { maxX, maxY } = getViewportStepLimits();
    const clampedX = clampNumber(dxTiles, -maxX, maxX);
    const clampedY = clampNumber(dyTiles, -maxY, maxY);
    if (!clampedX && !clampedY) return;
    if (state.camera) {
      state.camera.panBy(clampedX, clampedY);
      const desiredCenter = state.camera.centerTile;
      alignViewportToCamera({ center: desiredCenter, forceFetch: options.forceFetch });
      const snappedCenter = state.camera.centerTile;
      const offsetX = desiredCenter.x - snappedCenter.x;
      const offsetY = desiredCenter.y - snappedCenter.y;
      if ((Math.abs(offsetX) > 1e-6 || Math.abs(offsetY) > 1e-6) && state.camera) {
        state.camera.panBy(offsetX, offsetY);
      }
      scheduleRender();
      if (options.deferCommit) {
        scheduleKeyboardSnap();
      } else if (options.commit !== false) {
        commitCameraSnap({ animate: options.animate !== false, forceFetch: options.forceFetch });
      }
      return;
    }
    const baseX = Number.isFinite(state.viewport.xStart) ? state.viewport.xStart : state.map?.xStart || 0;
    const baseY = Number.isFinite(state.viewport.yStart) ? state.viewport.yStart : state.map?.yStart || 0;
    const nextX = baseX + clampedX;
    const nextY = baseY + clampedY;
    updateViewportStart(nextX, nextY, options);
  }

  function pan(dx, dy) {
    moveViewportBySteps(dx, dy);
  }

  function attachNavButtons() {
    if (!showControls || !navGrid) return;
    const verb = state.navMode === 'player' ? 'Travel' : 'Pan';
    const recenterLabel = state.navMode === 'player' ? 'Center on explorer' : 'Recenter map';
    const navButtons = [
      { label: '↖', dx: -1, dy: -1, aria: `${verb} northwest` },
      { label: '↑', dx: 0, dy: -1, aria: `${verb} north` },
      { label: '↗', dx: 1, dy: -1, aria: `${verb} northeast` },
      { label: '←', dx: -1, dy: 0, aria: `${verb} west` },
      { label: '⌂', recenter: true, aria: recenterLabel },
      { label: '→', dx: 1, dy: 0, aria: `${verb} east` },
      { label: '↙', dx: -1, dy: 1, aria: `${verb} southwest` },
      { label: '↓', dx: 0, dy: 1, aria: `${verb} south` },
      { label: '↘', dx: 1, dy: 1, aria: `${verb} southeast` }
    ];
    navButtons.forEach(config => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = config.label;
      btn.setAttribute('aria-label', config.aria);
      applyControlButtonStyle(btn, { variant: 'chip', fontSize: '22px' });
      btn.addEventListener('click', () => {
        if (config.recenter) {
          if (state.navMode === 'player' && typeof state.onNavigate === 'function') {
            state.onNavigate({ dx: 0, dy: 0, recenter: true });
          } else {
            centerMap();
          }
        } else if (state.navMode === 'player' && typeof state.onNavigate === 'function') {
          state.onNavigate({ dx: config.dx ?? 0, dy: config.dy ?? 0, recenter: false });
        } else {
          pan(config.dx, config.dy);
        }
      });
      navGrid.appendChild(btn);
    });
  }

  function handleWrapperKeyDown(event) {
    if (!event || typeof event.key !== 'string') return;
    const movement = ARROW_KEY_MOVES[event.key];
    if (!movement) return;
    if (state.navMode === 'player' && typeof state.onNavigate === 'function') {
      event.preventDefault();
      state.onNavigate({ dx: movement.dx, dy: movement.dy, recenter: false });
      return;
    }
    event.preventDefault();
    moveViewportBySteps(movement.dx, movement.dy, { deferCommit: true });
  }

  function handleDragStart(clientX, clientY) {
    if (!allowDrag) return;
    clearHoldTimer();
    hideTooltip();
    state.drag.active = true;
    state.drag.lastX = clientX;
    state.drag.lastY = clientY;
    state.drag.pendingX = 0;
    state.drag.pendingY = 0;
    state.drag.fractionalX = 0;
    state.drag.fractionalY = 0;
    cancelKeyboardSnap();
    mapWrapper.style.cursor = 'grabbing';
  }

  function updateDrag(clientX, clientY) {
    if (!state.drag.active) return;
    const dx = clientX - state.drag.lastX;
    const dy = clientY - state.drag.lastY;
    state.drag.lastX = clientX;
    state.drag.lastY = clientY;
    state.drag.pendingX -= dx;
    state.drag.pendingY -= dy;
    const cols = Number.isFinite(state.map?.width) && state.map.width > 0
      ? Math.trunc(state.map.width)
      : state.viewport.width || getGridWidth(state.map?.tiles, 0);
    const rows = Number.isFinite(state.map?.height) && state.map.height > 0
      ? Math.trunc(state.map.height)
      : state.viewport.height || getGridHeight(state.map?.tiles, 0);
    if (!cols || !rows) return;
    const rectSource = state.dataLayer || mapCanvas;
    const rect = rectSource.getBoundingClientRect();
    const tileWidth = rect.width / cols;
    const tileHeight = rect.height / rows;
    if (!tileWidth || !tileHeight) return;
    if (state.camera) {
      let renderNeeded = false;
      const tilesX = Math.trunc(state.drag.pendingX / tileWidth);
      const tilesY = Math.trunc(state.drag.pendingY / tileHeight);
      if (tilesX || tilesY) {
        const { maxX, maxY } = getViewportStepLimits();
        const limitedTilesX = clampNumber(tilesX, -maxX, maxX);
        const limitedTilesY = clampNumber(tilesY, -maxY, maxY);
        if (limitedTilesX || limitedTilesY) {
          state.drag.pendingX -= limitedTilesX * tileWidth;
          state.drag.pendingY -= limitedTilesY * tileHeight;
          shiftViewport(limitedTilesX, limitedTilesY, { commit: false });
          renderNeeded = true;
        } else {
          state.drag.pendingX = Math.sign(state.drag.pendingX) * Math.min(Math.abs(state.drag.pendingX), tileWidth);
          state.drag.pendingY = Math.sign(state.drag.pendingY) * Math.min(Math.abs(state.drag.pendingY), tileHeight);
        }
      }
      const residualTilesX = tileWidth ? state.drag.pendingX / tileWidth : 0;
      const residualTilesY = tileHeight ? state.drag.pendingY / tileHeight : 0;
      const fractionalDeltaX = residualTilesX - state.drag.fractionalX;
      const fractionalDeltaY = residualTilesY - state.drag.fractionalY;
      if (fractionalDeltaX || fractionalDeltaY) {
        state.camera.panBy(fractionalDeltaX, fractionalDeltaY);
        renderNeeded = true;
      }
      if (renderNeeded) {
        scheduleRender();
      }
      state.drag.fractionalX = residualTilesX;
      state.drag.fractionalY = residualTilesY;
      return;
    }
    const tilesX = Math.trunc(state.drag.pendingX / tileWidth);
    const tilesY = Math.trunc(state.drag.pendingY / tileHeight);
    if (!tilesX && !tilesY) return;
    const { maxX, maxY } = getViewportStepLimits();
    const limitedTilesX = clampNumber(tilesX, -maxX, maxX);
    const limitedTilesY = clampNumber(tilesY, -maxY, maxY);
    if (!limitedTilesX && !limitedTilesY) return;
    state.drag.pendingX -= limitedTilesX * tileWidth;
    state.drag.pendingY -= limitedTilesY * tileHeight;
    shiftViewport(limitedTilesX, limitedTilesY);
  }

  function endDrag() {
    if (!state.drag.active) return;
    state.drag.active = false;
    mapWrapper.style.cursor = allowDrag ? 'grab' : 'default';
    state.drag.pendingX = 0;
    state.drag.pendingY = 0;
    state.drag.fractionalX = 0;
    state.drag.fractionalY = 0;
    if (state.camera) {
      commitCameraSnap();
    }
  }

  function attachDragHandlers() {
    if (!allowDrag) return null;
    const handleMouseMove = event => {
      if (!state.drag.active) return;
      event.preventDefault();
      updateDrag(event.clientX, event.clientY);
    };
    const handleTouchMove = event => {
      if (!state.drag.active || !event.touches?.length) return;
      const touch = event.touches[0];
      updateDrag(touch.clientX, touch.clientY);
      event.preventDefault();
    };
    mapWrapper.addEventListener('mousedown', event => {
      event.preventDefault();
      handleDragStart(event.clientX, event.clientY);
    });
    mapWrapper.addEventListener('touchstart', event => {
      if (!event.touches?.length) return;
      const touch = event.touches[0];
      handleDragStart(touch.clientX, touch.clientY);
      event.preventDefault();
    }, { passive: false });
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', endDrag);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', endDrag);
    window.addEventListener('touchcancel', endDrag);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', endDrag);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', endDrag);
      window.removeEventListener('touchcancel', endDrag);
    };
  }

  mapWrapper.addEventListener('keydown', handleWrapperKeyDown);

  const detachGlobalDrag = attachDragHandlers();
  applyZoomTransform();
  attachNavButtons();
  applyResponsiveLayout();

  if (typeof window !== 'undefined') {
    state.resizeHandler = () => {
      updateWrapperSize();
      applyResponsiveLayout();
    };
    window.addEventListener('resize', state.resizeHandler);
  }

  return {
    setMap(map, context = {}) {
      state.hasInitializedBaseChunk = false;
      state.context = { ...state.context, ...context };

      const focusCandidate =
        context?.focus ??
        context?.center ??
        context?.current ??
        context?.currentCoords ??
        context?.homeCoords ??
        state.focus;
      state.focus = normalizeFocusCoords(focusCandidate);

      if (!map) {
        state.map = null;
        state.buffer = null;
        applyWorldArtifact(null);
        state.context = { ...state.context, focus: { ...state.focus } };
        state.zoomBase = { width: 0, height: 0 };
        state.zoomDisplayFactor = 1;
        state.zoom = 1;
        state.pendingZoomSync = false;
        applyDevelopments([]);
        if (state.camera) {
          state.camera.setCenterTile({ x: state.focus.x, y: state.focus.y }, { snap: true });
        }
        setZoom(1, { force: true });
        if (state.renderer) {
          state.renderer.setMap(null);
          state.renderer.setScale(1);
        }
        scheduleRender();
        applyZoomTransform();
        updateTileDataLayer();
        return;
      }

      const buffer = extractBufferMap(map);
      if (buffer?.tiles?.size) {
        state.hasInitializedBaseChunk = true;
      }
      state.buffer = buffer;
      if (buffer?.world) {
        applyWorldArtifact(buffer.world);
      } else if (map.world) {
        applyWorldArtifact(map.world);
      }
      ensureViewportDimensions(buffer);

      const incomingViewport = map.viewport ?? buffer?.viewport ?? null;
      if (incomingViewport) {
        state.viewport.width = Math.max(1, toInteger(incomingViewport.width, state.viewport.width));
        state.viewport.height = Math.max(1, toInteger(incomingViewport.height, state.viewport.height));
        state.viewport.xStart = toInteger(incomingViewport.xStart, buffer?.xStart ?? state.viewport.xStart ?? 0);
        state.viewport.yStart = toInteger(incomingViewport.yStart, buffer?.yStart ?? state.viewport.yStart ?? 0);
      } else if (buffer) {
        state.viewport.xStart = toInteger(map.xStart ?? buffer.xStart, buffer.xStart);
        state.viewport.yStart = toInteger(map.yStart ?? buffer.yStart, buffer.yStart);
      } else {
        state.viewport.xStart = toInteger(map.xStart, state.viewport.xStart ?? 0);
        state.viewport.yStart = toInteger(map.yStart, state.viewport.yStart ?? 0);
      }

      ensureViewportDimensions(buffer);

      state.map = {
        seed: map.seed ?? buffer?.seed ?? state.map?.seed,
        season: map.season ?? buffer?.season ?? state.map?.season,
        waterLevel: map.waterLevel ?? buffer?.waterLevel ?? state.map?.waterLevel,
        tiles: [],
        types: null,
        elevations: null,
        xStart: state.viewport.xStart,
        yStart: state.viewport.yStart,
        width: state.viewport.width,
        height: state.viewport.height
      };

      if (!state.zoomBase.width || !state.zoomBase.height) {
        state.zoomBase.width = Math.max(1, state.viewport.width || state.map?.width || DEFAULT_VIEWPORT_SIZE);
        state.zoomBase.height = Math.max(1, state.viewport.height || state.map?.height || DEFAULT_VIEWPORT_SIZE);
      }

      state.pendingZoomSync = Math.abs(state.zoom - 1) > 0.001;

      state.context = {
        ...state.context,
        focus: { ...state.focus },
        seed: state.map.seed,
        season: state.map.season
      };

      state.home = computeHomeStart(state.focus);

      const detectedDevelopments = identifyDevelopmentTiles(map);
      applyDevelopments(detectedDevelopments);

      if (!Number.isFinite(state.viewport.xStart) || !Number.isFinite(state.viewport.yStart)) {
        state.viewport.xStart = state.home.xStart;
        state.viewport.yStart = state.home.yStart;
      }

      syncCameraToViewport({ snap: true });

      if (buffer) {
        if (!updateVisibleFromBuffer()) {
          updateViewportStart(state.viewport.xStart, state.viewport.yStart, { forceFetch: true });
          return;
        }

        const needsRecentering =
          state.viewport.xStart !== state.home.xStart || state.viewport.yStart !== state.home.yStart;

        if (needsRecentering) {
          updateViewportStart(state.home.xStart, state.home.yStart);
        } else {
          commitMapUpdate();
        }
        return;
      }

      scheduleRender();
      updateViewportStart(state.viewport.xStart, state.viewport.yStart, { forceFetch: true });
    },
    refresh() {
      updateWrapperSize();
      updateTileSizing();
      applyResponsiveLayout();
    },
    setTerrainColors(nextColors = null, options = {}) {
      const { forceRefresh = false } = options || {};
      if (nextColors === false) {
        state.terrainColorOverrides = null;
      } else if (nextColors && typeof nextColors === 'object') {
        state.terrainColorOverrides = normalizeTerrainColorOverrides(nextColors);
      }
      const hasMapTiles = Array.isArray(state.map?.tiles) && state.map.tiles.length > 0;
      if (forceRefresh) {
        resolveTilePalette({ forceRefresh: true });
        if (isDebugModeEnabled()) {
          console.assert(
            hasMapTiles,
            'setTerrainColors: forceRefresh requested without available tile data'
          );
        }
      }
      if (state.useTerrainColors && (hasMapTiles || forceRefresh)) {
        updateTileDataLayer();
        scheduleRender();
      }
    },
    setJobOptions(options = [], context = {}) {
      applyJobOptions(options, context);
    },
    getSelectedJob() {
      return jobSelectorState.selectedId;
    },
    center: centerMap,
    setFocus,
    setMarkers: applyMarkers,
    setDevelopments: applyDevelopments,
    destroy() {
      cancelKeyboardSnap();
      if (typeof window !== 'undefined') {
        if (state.resizeHandler) {
          window.removeEventListener('resize', state.resizeHandler);
        }
        if (detachGlobalDrag) detachGlobalDrag();
      }
      state.markerElements.forEach(element => {
        if (element?.parentElement) {
          element.parentElement.removeChild(element);
        }
      });
      state.markerElements.clear();
      state.markerDefs = [];
      state.markerLayer = null;
      state.spawnSuggestionMarkers = [];
      state.spawnSuggestionRank.clear();
      state.world = null;
      if (layoutRoot.parentElement) {
        layoutRoot.parentElement.removeChild(layoutRoot);
      }
      setJobOptionsOpen(false);
      state.developmentTiles = new Map();
      jobOptionButtons.clear();
      closeActionModal();
      if (actionModal?.parentElement) {
        actionModal.parentElement.removeChild(actionModal);
      }
      actionModal = null;
      actionModalSurface = null;
      actionModalTitle = null;
      actionModalDescription = null;
      actionModalList = null;
      actionModalEmpty = null;
      jobSelectButton = null;
      jobOptionsPopup = null;
      jobOptionsList = null;
      jobSelectWrapper = null;
      if (typeof document !== 'undefined') {
        document.documentElement.style.removeProperty('--map-layout-width');
      }
      mapWrapper.removeEventListener('keydown', handleWrapperKeyDown);
    },
    elements: {
      layout: layoutRoot,
      mapContainer,
      wrapper: mapWrapper,
      stage: mapStage,
      display: mapDataLayer,
      canvas: mapDisplay,
      markers: markerLayer,
      controls,
      nav: navGrid,
      controlDetails: controlDetailsSection,
      actionPanel,
      actionButtons,
      jobSelect: jobSelectButton,
      zoom: zoomControls ? zoomControls.element : null,
      navOverlay
    }
  };
}

export default createMapView;
