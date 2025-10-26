// @ts-nocheck
import { DEFAULT_MAP_WIDTH, TERRAIN_SYMBOLS, getTerrainColors } from './map.js';

const LEGEND_DEFAULTS = {
  water: 'Water',
  ocean: 'Ocean',
  lake: 'Lake',
  river: 'River',
  marsh: 'Marsh',
  open: 'Open Land',
  forest: 'Forest',
  ore: 'Ore Deposits',
  stone: 'Stone Outcrop'
};

const BUFFER_MARGIN = 12;
const DEFAULT_VIEWPORT_SIZE = DEFAULT_MAP_WIDTH;
const MAX_TILE_SIZE_RETRIES = 8;

function computeViewportDimensions(cols = 0, rows = 0, availableWidth = null) {
  const MIN_SIZE = 220;

  if (typeof window === 'undefined') {
    const fallback = Math.max(MIN_SIZE, 320);
    return { width: fallback, height: fallback };
  }

  const widthAllowance = Math.max(
    MIN_SIZE,
    Number.isFinite(availableWidth) && availableWidth > 0 ? availableWidth : window.innerWidth - 80
  );
  const heightAllowance = Math.max(MIN_SIZE, window.innerHeight - 260);

  const widthDrivenSide = Math.max(MIN_SIZE, Math.round(widthAllowance));
  const viewportLimitedSide = Math.max(
    MIN_SIZE,
    Math.min(widthDrivenSide, Math.round(heightAllowance))
  );

  const finalSide = Math.max(MIN_SIZE, viewportLimitedSide);

  return { width: finalSide, height: finalSide };
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

function getMatrixDimensions(matrix = []) {
  const rows = Array.isArray(matrix) ? matrix.length : 0;
  const cols = rows ? matrix[0]?.length || 0 : 0;
  return { cols, rows };
}

function sliceMatrix(matrix = [], offsetX = 0, offsetY = 0, width = 0, height = 0) {
  if (!Array.isArray(matrix) || !matrix.length || width <= 0 || height <= 0) {
    return [];
  }
  const result = [];
  for (let row = 0; row < height; row++) {
    const source = matrix[offsetY + row];
    if (!Array.isArray(source)) break;
    result.push(source.slice(offsetX, offsetX + width));
  }
  return result;
}

function extractBufferMap(mapLike) {
  if (!mapLike) return null;
  const candidate = mapLike.buffer?.tiles?.length ? mapLike.buffer : mapLike;
  if (!candidate?.tiles?.length) return null;
  const { cols, rows } = getMatrixDimensions(candidate.tiles);
  const normalizedTypes = candidate.types?.length ? candidate.types : null;
  const normalizedElevations = candidate.elevations?.length ? candidate.elevations : null;
  return {
    ...candidate,
    tiles: candidate.tiles,
    types: normalizedTypes,
    elevations: normalizedElevations,
    width: candidate.width ?? cols,
    height: candidate.height ?? rows,
    xStart: toInteger(candidate.xStart, 0),
    yStart: toInteger(candidate.yStart, 0)
  };
}

function deriveViewportSize(buffer, fallbackWidth = 0, fallbackHeight = 0) {
  if (fallbackWidth && fallbackHeight) {
    return { width: fallbackWidth, height: fallbackHeight };
  }
  const { cols, rows } = getMatrixDimensions(buffer?.tiles);
  if (cols || rows) {
    const target = Math.max(cols, rows);
    return { width: target, height: target };
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
  initialZoom = 1
} = {}) {
  if (!container) throw new Error('Container is required for map view');

  const baseTerrainColors = getTerrainColors();
  const terrainColorOverrides =
    terrainColors && typeof terrainColors === 'object' ? { ...terrainColors } : null;
  const normalizedTerrainColors = terrainColorOverrides
    ? { ...baseTerrainColors, ...terrainColorOverrides }
    : { ...baseTerrainColors };

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
    { size = 48, fontSize = '18px', variant = 'square' } = {}
  ) => {
    const dimension = typeof size === 'number' && Number.isFinite(size) ? `${size}px` : `${size}`;
    button.style.width = dimension;
    button.style.height = dimension;
    button.style.padding = '0';
    button.style.fontSize = fontSize;
    button.style.display = 'inline-flex';
    button.style.alignItems = 'center';
    button.style.justifyContent = 'center';
    button.style.borderRadius = '12px';
    button.style.border = '1px solid var(--map-border, #ccc)';
    button.style.background = 'var(--bg-color, #fff)';
    button.style.color = 'inherit';
    button.style.lineHeight = '1';
    button.style.cursor = 'pointer';
    button.style.transition = 'background 0.2s ease, transform 0.1s ease';
    button.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.08)';
  };

  const state = {
    map: null,
    buffer: null,
    context: {},
    home: { xStart: 0, yStart: 0 },
    focus: { x: 0, y: 0 },
    viewport: { width: 0, height: 0, xStart: 0, yStart: 0 },
    drag: {
      active: false,
      lastX: 0,
      lastY: 0,
      pendingX: 0,
      pendingY: 0
    },
    resizeHandler: null,
    fetchMap,
    onMapUpdate,
    onTileClick: typeof onTileClick === 'function' ? onTileClick : null,
    navMode: navMode === 'player' ? 'player' : 'viewport',
    onNavigate: typeof onNavigate === 'function' ? onNavigate : null,
    bufferMargin: normalizedBufferMargin,
    zoom: clampedInitialZoom,
    minZoom: normalizedMinZoom,
    maxZoom: normalizedMaxZoom,
    initialZoom: clampedInitialZoom,
    zoomBase: { width: 0, height: 0 },
    zoomDisplayFactor: 1,
    sizeRetryCount: 0,
    markerLayer: null,
    markerElements: new Map(),
    markerDefs: [],
    useTerrainColors: Boolean(useTerrainColors),
    terrainColorOverrides,
    terrainColors: normalizedTerrainColors,
    pendingZoomSync: false
  };

  const getVisibleDimensions = () => {
    const rows = state.map?.tiles?.length || 0;
    const cols = rows ? state.map.tiles[0]?.length || 0 : 0;
    return { cols, rows };
  };

  function ensureViewportDimensions(buffer) {
    const derived = deriveViewportSize(buffer, state.viewport.width, state.viewport.height);
    state.viewport.width = Math.max(1, toInteger(derived.width, DEFAULT_VIEWPORT_SIZE));
    state.viewport.height = Math.max(1, toInteger(derived.height, DEFAULT_VIEWPORT_SIZE));
  }

  function clampViewportWithinBuffer(buffer) {
    if (!buffer?.tiles?.length) return null;
    const dims = getMatrixDimensions(buffer.tiles);
    if (!dims.cols || !dims.rows) return null;

    const width = Math.min(Math.max(1, state.viewport.width || DEFAULT_VIEWPORT_SIZE), dims.cols);
    const height = Math.min(Math.max(1, state.viewport.height || DEFAULT_VIEWPORT_SIZE), dims.rows);

    state.viewport.width = width;
    state.viewport.height = height;

    const originX = buffer.xStart ?? 0;
    const originY = buffer.yStart ?? 0;
    const maxOffsetX = Math.max(0, dims.cols - width);
    const maxOffsetY = Math.max(0, dims.rows - height);

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
    if (!state.buffer?.tiles?.length) return false;
    const clamped = clampViewportWithinBuffer(state.buffer);
    if (!clamped) return false;

    const { offsetX, offsetY, width, height } = clamped;
    const tiles = sliceMatrix(state.buffer.tiles, offsetX, offsetY, width, height);
    if (!tiles.length) return false;

    const types = state.buffer.types?.length
      ? sliceMatrix(state.buffer.types, offsetX, offsetY, width, height)
      : null;
    const elevations = state.buffer.elevations?.length
      ? sliceMatrix(state.buffer.elevations, offsetX, offsetY, width, height)
      : null;

    state.map = {
      ...state.map,
      seed: state.buffer.seed ?? state.map?.seed,
      season: state.buffer.season ?? state.map?.season,
      waterLevel: state.buffer.waterLevel ?? state.map?.waterLevel,
      tiles,
      types,
      elevations,
      xStart: state.viewport.xStart,
      yStart: state.viewport.yStart,
      width,
      height,
      viewport: { ...state.viewport }
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
      viewport: { ...state.viewport }
    };

    if (state.buffer?.tiles?.length) {
      const dims = getMatrixDimensions(state.buffer.tiles);
      payload.buffer = {
        seed: state.buffer.seed,
        season: state.buffer.season,
        waterLevel: state.buffer.waterLevel,
        tiles: state.buffer.tiles,
        types: state.buffer.types,
        elevations: state.buffer.elevations,
        xStart: state.buffer.xStart,
        yStart: state.buffer.yStart,
        width: state.buffer.width ?? dims.cols,
        height: state.buffer.height ?? dims.rows
      };
    }

    return payload;
  }

  function computeDesiredViewportSize() {
    const baseWidth = Math.max(
      1,
      Math.trunc(state.zoomBase.width || state.viewport.width || state.map?.width || DEFAULT_VIEWPORT_SIZE)
    );
    const baseHeight = Math.max(
      1,
      Math.trunc(state.zoomBase.height || state.viewport.height || state.map?.height || DEFAULT_VIEWPORT_SIZE)
    );
    const width = Math.max(1, Math.round(baseWidth / state.zoom));
    const height = Math.max(1, Math.round(baseHeight / state.zoom));
    return { width, height };
  }

  function updateZoomDisplayFactor() {
    if (!state.map) {
      state.zoomDisplayFactor = 1;
      return;
    }

    if (Math.abs(state.zoom - 1) < 0.001) {
      state.zoomDisplayFactor = 1;
      return;
    }

    const desired = computeDesiredViewportSize();
    const actualCols = state.map.tiles?.[0]?.length || state.map.width || desired.width;
    const actualRows = state.map.tiles?.length || state.map.height || desired.height;
    const widthMatch = Math.abs(actualCols - desired.width) <= 1;
    const heightMatch = Math.abs(actualRows - desired.height) <= 1;
    state.zoomDisplayFactor = widthMatch && heightMatch ? 1 : state.zoom;
  }

  function adjustViewportForZoom({ forceFetch = false } = {}) {
    if (!state.map) {
      state.zoomDisplayFactor = Math.abs(state.zoom - 1) < 0.001 ? 1 : state.zoom;
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

  function getTerrainColor(type) {
    if (!state.useTerrainColors || !type) return null;
    return state.terrainColors?.[type] || null;
  }

  function applyTileAppearance(tile, type, symbol) {
    if (!tile) return;
    const symbolEl = tile.firstElementChild;
    if (!symbolEl) {
      tile.textContent = symbol ?? '';
      return;
    }

    const fillColor = getTerrainColor(type);
    const defaultSymbol = type ? TERRAIN_SYMBOLS?.[type] : null;
    if (fillColor) {
      tile.classList.add('map-tile--fill');
      symbolEl.style.backgroundColor = fillColor;
      symbolEl.style.borderRadius = '6px';
      symbolEl.style.boxSizing = 'border-box';
      symbolEl.style.width = '100%';
      symbolEl.style.height = '100%';
      symbolEl.style.boxShadow = 'inset 0 0 0 1px rgba(0, 0, 0, 0.18)';
      symbolEl.textContent = symbol && symbol !== defaultSymbol ? symbol : '';
    } else {
      tile.classList.remove('map-tile--fill');
      symbolEl.style.backgroundColor = 'transparent';
      symbolEl.style.borderRadius = '0';
      symbolEl.style.boxShadow = 'none';
      symbolEl.textContent = symbol ?? '';
    }
  }

  function commitMapUpdate() {
    if (!state.map) return;
    state.context = {
      ...state.context,
      focus: { ...state.focus },
      viewport: { ...state.viewport }
    };

    if (typeof state.onMapUpdate === 'function') {
      const payload = buildUpdatePayload();
      if (payload) {
        state.onMapUpdate(payload, state.context);
      }
    }

    const actualCols = state.map.tiles?.[0]?.length || state.viewport.width || state.map.width || 0;
    const actualRows = state.map.tiles?.length || state.viewport.height || state.map.height || 0;
    if (!state.zoomBase.width || !state.zoomBase.height || Math.abs(state.zoom - 1) < 0.001) {
      state.zoomBase.width = Math.max(1, actualCols);
      state.zoomBase.height = Math.max(1, actualRows);
    }

    updateZoomDisplayFactor();
    render();
    applyZoomTransform();

    if (state.pendingZoomSync) {
      const needsSync = Math.abs(state.zoomDisplayFactor - 1) >= 0.001;
      state.pendingZoomSync = false;
      if (needsSync) {
        requestFrame(() => setZoom(state.zoom, { force: true }));
      }
    }
  }

  function needsBufferRefresh() {
    if (!state.buffer?.tiles?.length) return true;
    const dims = getMatrixDimensions(state.buffer.tiles);
    const width = state.viewport.width || dims.cols;
    const height = state.viewport.height || dims.rows;
    if (dims.cols < width || dims.rows < height) return true;

    const originX = state.buffer.xStart ?? 0;
    const originY = state.buffer.yStart ?? 0;
    const offsetX = state.viewport.xStart - originX;
    const offsetY = state.viewport.yStart - originY;
    const margin = Math.max(0, state.bufferMargin ?? BUFFER_MARGIN);

    if (offsetX < margin || offsetY < margin) return true;
    if (offsetX + width > dims.cols - margin) return true;
    if (offsetY + height > dims.rows - margin) return true;
    return false;
  }

  function fetchBufferedMap(xStart, yStart, options = {}) {
    if (typeof state.fetchMap !== 'function') return;
    const margin = Math.max(0, state.bufferMargin ?? BUFFER_MARGIN);
    const viewportWidth = Math.max(1, state.viewport.width || DEFAULT_VIEWPORT_SIZE);
    const viewportHeight = Math.max(1, state.viewport.height || DEFAULT_VIEWPORT_SIZE);
    const width = viewportWidth + margin * 2;
    const height = viewportHeight + margin * 2;
    const targetX = toInteger(xStart, 0);
    const targetY = toInteger(yStart, 0);
    const originX = targetX - margin;
    const originY = targetY - margin;
    const seed = options.overrideSeed ?? state.map?.seed ?? state.buffer?.seed ?? state.context?.seed;
    const season = options.overrideSeason ?? state.map?.season ?? state.buffer?.season ?? state.context?.season;

    const params = {
      map: state.map,
      context: state.context,
      seed,
      season,
      xStart: originX,
      yStart: originY,
      width,
      height,
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

    const dims = getMatrixDimensions(buffer.tiles);
    buffer.width = buffer.width ?? dims.cols;
    buffer.height = buffer.height ?? dims.rows;

    state.buffer = buffer;
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
  mapWrapper.style.aspectRatio = '1 / 1';
  mapWrapper.style.flexShrink = '0';

  const mapCanvas = document.createElement('div');
  mapCanvas.className = `${idPrefix}-canvas map-canvas`;
  mapCanvas.style.position = 'absolute';
  mapCanvas.style.inset = '0';
  mapCanvas.style.display = 'flex';
  mapCanvas.style.alignItems = 'flex-start';
  mapCanvas.style.justifyContent = 'flex-start';
  mapCanvas.style.boxSizing = 'border-box';
  mapWrapper.appendChild(mapCanvas);

  const mapDisplay = document.createElement('div');
  mapDisplay.className = `${idPrefix}-display map-display`;
  mapDisplay.style.display = 'grid';
  mapDisplay.style.gridTemplateColumns = 'none';
  mapDisplay.style.gridAutoRows = 'var(--tile-size, 24px)';
  mapDisplay.style.alignItems = 'center';
  mapDisplay.style.justifyItems = 'center';
  mapDisplay.style.fontFamily = '"Apple Color Emoji", "Noto Color Emoji", "Segoe UI Emoji", sans-serif';
  mapDisplay.style.lineHeight = '1';
  mapDisplay.style.margin = '0';
  mapDisplay.style.padding = '0';
  mapDisplay.style.position = 'relative';
  mapDisplay.style.transform = 'scale(1)';
  mapDisplay.style.transformOrigin = 'center center';
  mapDisplay.style.boxSizing = 'border-box';
  mapDisplay.style.setProperty('--tile-size', '24px');
  mapCanvas.appendChild(mapDisplay);

  const markerLayer = document.createElement('div');
  markerLayer.className = `${idPrefix}-marker-layer map-marker-layer`;
  markerLayer.style.position = 'absolute';
  markerLayer.style.inset = '0';
  markerLayer.style.pointerEvents = 'none';
  markerLayer.style.zIndex = '3';
  markerLayer.style.display = 'block';
  markerLayer.style.transformOrigin = 'center center';
  mapCanvas.appendChild(markerLayer);
  state.markerLayer = markerLayer;
  syncMarkers();

  mapDisplay.addEventListener('click', event => {
    if (typeof state.onTileClick !== 'function') return;
    const target = event.target instanceof Element ? event.target.closest('.map-tile') : null;
    if (!target || !mapDisplay.contains(target)) return;
    const worldX = Number(target.dataset.worldX);
    const worldY = Number(target.dataset.worldY);
    if (!Number.isFinite(worldX) || !Number.isFinite(worldY)) return;
    const colIndex = Number(target.dataset.col);
    const rowIndex = Number(target.dataset.row);
    const detail = {
      x: worldX,
      y: worldY,
      col: Number.isFinite(colIndex) ? colIndex : null,
      row: Number.isFinite(rowIndex) ? rowIndex : null,
      terrain: target.dataset.terrain || null,
      element: target,
      event,
      map: state.map,
      context: { ...state.context }
    };
    state.onTileClick(detail);
  });

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
    whiteSpace: 'nowrap',
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

  const updateTooltipPosition = (clientX, clientY, tile) => {
    if (!tooltipState.visible) return;
    const rect = mapWrapper.getBoundingClientRect();
    let localX;
    let localY;
    if (Number.isFinite(clientX) && Number.isFinite(clientY)) {
      localX = clientX - rect.left;
      localY = clientY - rect.top;
    } else if (tile) {
      const tileRect = tile.getBoundingClientRect();
      localX = tileRect.left - rect.left + tileRect.width / 2;
      localY = tileRect.top - rect.top + tileRect.height / 2;
    } else {
      localX = rect.width / 2;
      localY = rect.height / 2;
    }
    const clampedX = Math.min(rect.width - 12, Math.max(12, localX));
    const clampedY = Math.min(rect.height - 12, Math.max(12, localY));
    tileTooltip.style.left = `${clampedX}px`;
    tileTooltip.style.top = `${clampedY}px`;
  };

  const describeTile = tile => {
    if (!tile) return 'Unknown terrain';
    const type = tile.dataset.terrain || '';
    const label = legendLabels[type] || type || 'Unknown terrain';
    const symbolEl = tile.querySelector('.map-tile-symbol');
    const symbol = symbolEl?.textContent?.trim() || tile.textContent?.trim() || '';
    const worldX = Number.isFinite(Number(tile.dataset.worldX)) ? Number(tile.dataset.worldX) : null;
    const worldY = Number.isFinite(Number(tile.dataset.worldY)) ? Number(tile.dataset.worldY) : null;
    const coordText = worldX !== null && worldY !== null ? ` (${worldX}, ${worldY})` : '';
    return `${symbol ? `${symbol} ` : ''}${label}${coordText}`;
  };

  const showTooltip = (tile, event = null) => {
    if (!tile) return;
    tileTooltip.textContent = describeTile(tile);
    tileTooltip.style.display = 'block';
    tooltipState.visible = true;
    tooltipState.tile = tile;
    tooltipState.pointerId = event?.pointerId ?? null;
    tooltipState.pointerType = event?.pointerType ?? null;
    updateTooltipPosition(event?.clientX, event?.clientY, tile);
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

  const scheduleHoldTooltip = (event, tile) => {
    clearHoldTimer();
    tooltipState.holdTarget = tile;
    tooltipState.pointerId = event.pointerId;
    tooltipState.pointerType = event.pointerType;
    tooltipState.holdOriginX = event.clientX;
    tooltipState.holdOriginY = event.clientY;
    tooltipState.holdTimer = setTimeout(() => {
      tooltipState.holdTimer = null;
      showTooltip(tile, event);
    }, 450);
  };

  const handlePointerOver = event => {
    const tile = event.target instanceof Element ? event.target.closest('.map-tile') : null;
    if (!tile) return;
    if (event.pointerType === 'mouse') {
      showTooltip(tile, event);
    }
  };

  const handlePointerMove = event => {
    const tile = event.target instanceof Element ? event.target.closest('.map-tile') : null;
    if (tooltipState.holdTimer && tooltipState.pointerId === event.pointerId) {
      const dx = event.clientX - tooltipState.holdOriginX;
      const dy = event.clientY - tooltipState.holdOriginY;
      if (Math.hypot(dx, dy) > 12) {
        clearHoldTimer();
      }
    }
    if (tooltipState.visible && tooltipState.pointerId === event.pointerId) {
      updateTooltipPosition(event.clientX, event.clientY, tooltipState.tile);
    } else if (event.pointerType === 'mouse' && tile) {
      showTooltip(tile, event);
    }
  };

  const handlePointerOut = event => {
    if (event.pointerType === 'mouse') {
      const relatedTile = event.relatedTarget instanceof Element ? event.relatedTarget.closest('.map-tile') : null;
      if (!relatedTile) {
        hideTooltip();
      }
    }
  };

  const handlePointerDown = event => {
    const tile = event.target instanceof Element ? event.target.closest('.map-tile') : null;
    if (!tile) return;
    if (event.pointerType === 'mouse') {
      hideTooltip();
      return;
    }
    scheduleHoldTooltip(event, tile);
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
  iconPreloader.textContent = `${Object.values(TERRAIN_SYMBOLS).join('')}🚩`;
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

  const mapContainer = document.createElement('div');
  mapContainer.className = `${idPrefix}-map-container map-container`;
  mapContainer.style.display = 'flex';
  mapContainer.style.flexDirection = 'column';
  mapContainer.style.alignItems = 'flex-start';
  mapContainer.style.gap = '12px';
  mapContainer.style.width = '100%';
  mapContainer.style.maxWidth = '100%';

  const sideStack = document.createElement('div');
  sideStack.className = `${idPrefix}-control-stack map-control-stack`;
  sideStack.style.display = 'flex';
  sideStack.style.flexDirection = 'column';
  sideStack.style.alignItems = 'stretch';
  sideStack.style.gap = '12px';

  mapContainer.appendChild(mapWrapper);
  layoutRoot.appendChild(mapContainer);
  container.appendChild(layoutRoot);

  const controls = document.createElement('div');
  let navGrid = null;
  let controlColumn = null;
  let controlDetailsSection = null;
  let zoomControls = null;
  let zoomOutButton = null;
  let zoomInButton = null;
  let zoomResetButton = null;
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

    const navGridWidth = 'calc(3 * 48px + 2 * 6px)';

    navGrid = document.createElement('div');
    navGrid.className = `${idPrefix}-nav map-nav-grid`;
    navGrid.style.display = 'grid';
    navGrid.style.gridTemplateColumns = 'repeat(3, 48px)';
    navGrid.style.gridAutoRows = '48px';
    navGrid.style.gap = '6px';
    navGrid.style.width = navGridWidth;
    controlColumn.appendChild(navGrid);

    controlDetailsSection = document.createElement('div');
    controlDetailsSection.className = `${idPrefix}-control-details map-control-details`;
    controlDetailsSection.style.display = 'flex';
    controlDetailsSection.style.flexDirection = 'column';
    controlDetailsSection.style.gap = '12px';
    controlDetailsSection.style.width = navGridWidth;
    controlDetailsSection.style.alignSelf = 'center';
    controlDetailsSection.style.boxSizing = 'border-box';
    controlColumn.appendChild(controlDetailsSection);

    zoomControls = document.createElement('div');
    zoomControls.className = `${idPrefix}-zoom map-zoom-controls`;
    zoomControls.style.display = 'grid';
    zoomControls.style.gridTemplateColumns = 'repeat(3, 48px)';
    zoomControls.style.gridAutoRows = '48px';
    zoomControls.style.gap = '6px';
    zoomControls.style.justifyContent = 'center';
    zoomControls.style.alignItems = 'center';
    zoomControls.style.justifyItems = 'center';
    zoomControls.style.alignContent = 'center';
    controlColumn.appendChild(zoomControls);

    const createZoomButton = (label, aria, fontSize) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.setAttribute('aria-label', aria);
      applyControlButtonStyle(button, { fontSize, variant: 'square' });
      return button;
    };

    zoomOutButton = createZoomButton('−', 'Zoom out', '20px');

    zoomResetButton = createZoomButton('100%', 'Reset zoom to 100%', '16px');

    zoomInButton = createZoomButton('+', 'Zoom in', '20px');

    zoomControls.appendChild(zoomOutButton);
    zoomControls.appendChild(zoomResetButton);
    zoomControls.appendChild(zoomInButton);

    zoomOutButton.addEventListener('click', () => {
      zoomBy(-0.1);
    });
    zoomInButton.addEventListener('click', () => {
      zoomBy(0.1);
    });
    zoomResetButton.addEventListener('click', () => {
      resetZoom();
    });

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
    actionPanel.style.background = 'var(--action-panel-bg, rgba(250, 250, 255, 0.96))';
    actionPanel.style.backdropFilter = 'blur(4px)';
    actionPanel.style.boxShadow = '0 12px 28px rgba(0, 0, 0, 0.18)';
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
      background: 'var(--map-select-popup-bg, linear-gradient(135deg, rgba(16, 30, 64, 0.98), rgba(10, 22, 46, 0.94)))',
      boxShadow: '0 18px 36px rgba(0, 0, 0, 0.48)',
      padding: '8px 0',
      display: 'none',
      flexDirection: 'column',
      gap: '0',
      zIndex: '40',
      maxHeight: '280px',
      overflowY: 'auto',
      backdropFilter: 'blur(6px)',
      WebkitBackdropFilter: 'blur(6px)'
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

    if (isLandscape && hasControls) {
      mapContainer.style.flexDirection = 'row';
      mapContainer.style.flexWrap = 'nowrap';
      mapContainer.style.gap = '16px';
      mapContainer.style.justifyContent = 'flex-start';
      mapContainer.style.alignItems = 'stretch';
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
        controls.style.margin = '8px 0 0';
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
    const icon = marker.icon || '📍';
    const className = marker.className || '';
    const emphasis = Boolean(marker.emphasis);
    const label = marker.label || '';
    return { id, x, y, icon, className, emphasis, label };
  }

  function syncMarkers() {
    if (!state.markerLayer) return;
    if (!state.map?.tiles?.length) {
      state.markerElements.forEach(element => {
        if (element) element.style.display = 'none';
      });
      return;
    }

    const width = state.map.width || 0;
    const height = state.map.height || 0;
    if (!width || !height) {
      state.markerElements.forEach(element => {
        if (element) element.style.display = 'none';
      });
      return;
    }

    const activeIds = new Set();
    state.markerDefs.forEach(marker => {
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

      const left = ((col + 0.5) / width) * 100;
      const top = ((row + 0.5) / height) * 100;
      element.style.left = `${left}%`;
      element.style.top = `${top}%`;
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
    if (!zoomResetButton) return;
    const currentPercent = Math.round(state.zoom * 100);
    const baselinePercent = Math.round((state.initialZoom || 1) * 100);
    zoomResetButton.textContent = `${currentPercent}%`;
    zoomResetButton.setAttribute(
      'aria-label',
      `Reset zoom to ${baselinePercent}% (current ${currentPercent}%)`
    );
    if (zoomOutButton) {
      zoomOutButton.disabled = state.zoom <= state.minZoom + 0.001;
    }
    if (zoomInButton) {
      zoomInButton.disabled = state.zoom >= state.maxZoom - 0.001;
    }
  }

  function applyZoomTransform() {
    const scale = Number.isFinite(state.zoomDisplayFactor) ? state.zoomDisplayFactor : 1;
    mapDisplay.style.transform = `scale(${scale})`;
    if (state.markerLayer) {
      state.markerLayer.style.transform = `scale(${scale})`;
    }
    updateZoomControls();
  }

  function setZoom(nextZoom, options = {}) {
    const clamped = Math.min(state.maxZoom, Math.max(state.minZoom, nextZoom));
    if (!options.force && Math.abs(clamped - state.zoom) < 0.001) {
      updateZoomDisplayFactor();
      applyZoomTransform();
      return;
    }
    state.zoom = clamped;
    adjustViewportForZoom({ forceFetch: Boolean(options.force) });
    updateZoomDisplayFactor();
    applyZoomTransform();
    requestFrame(updateTileSizing);
  }

  function zoomBy(delta) {
    setZoom(state.zoom + delta);
  }

  function resetZoom() {
    setZoom(state.initialZoom || 1);
  }

  function ensureTileElements(cols, rows) {
    if (!cols || !rows) {
      mapDisplay.replaceChildren();
      mapDisplay.style.gridTemplateColumns = 'none';
      return;
    }

    const required = cols * rows;
    const current = mapDisplay.children.length;
    if (current !== required) {
      const fragment = document.createDocumentFragment();
      for (let i = 0; i < required; i++) {
        const tile = document.createElement('span');
        tile.className = 'map-tile';
        tile.style.display = 'flex';
        tile.style.alignItems = 'center';
        tile.style.justifyContent = 'center';
        tile.style.width = '100%';
        tile.style.height = '100%';
        tile.style.fontSize = '1em';
        tile.style.lineHeight = '1';
        tile.style.position = 'relative';
        const terrainSymbol = document.createElement('span');
        terrainSymbol.className = 'map-tile-symbol';
        terrainSymbol.style.display = 'inline-flex';
        terrainSymbol.style.alignItems = 'center';
        terrainSymbol.style.justifyContent = 'center';
        terrainSymbol.style.width = '100%';
        terrainSymbol.style.height = '100%';
        terrainSymbol.style.pointerEvents = 'none';
        terrainSymbol.style.boxSizing = 'border-box';
        tile.appendChild(terrainSymbol);
        fragment.appendChild(tile);
      }
      mapDisplay.replaceChildren(fragment);
    }

    mapDisplay.style.gridTemplateColumns = `repeat(${cols}, var(--tile-size))`;
    mapDisplay.style.gridAutoRows = 'var(--tile-size)';
  }

  function updateTileSizing() {
    if (!state.map) return;
    const rows = state.map.tiles?.length || 0;
    const cols = rows ? state.map.tiles[0].length : 0;
    if (!rows || !cols) return;
    const rect = typeof mapWrapper?.getBoundingClientRect === 'function'
      ? mapWrapper.getBoundingClientRect()
      : null;
    const availableWidth = Math.max(0, rect?.width || mapWrapper.clientWidth);
    const availableHeight = Math.max(0, rect?.height || mapWrapper.clientHeight);
    if (!availableWidth || !availableHeight) {
      if (state.sizeRetryCount < MAX_TILE_SIZE_RETRIES) {
        state.sizeRetryCount += 1;
        requestFrame(updateTileSizing);
      }
      return;
    }
    state.sizeRetryCount = 0;
    const sizeForWidth = availableWidth / cols;
    const sizeForHeight = availableHeight / rows;
    const targetSize = Math.min(sizeForWidth, sizeForHeight);
    if (!Number.isFinite(targetSize) || targetSize <= 0) return;
    const widthPx = cols * targetSize;
    const heightPx = rows * targetSize;
    const iconSize = Math.max(2, targetSize * 0.92);
    mapDisplay.style.setProperty('--tile-size', `${targetSize}px`);
    mapDisplay.style.fontSize = `${iconSize}px`;
    mapDisplay.style.lineHeight = '1';
    mapDisplay.style.width = `${widthPx}px`;
    mapDisplay.style.height = `${heightPx}px`;
    mapDisplay.style.minWidth = `${widthPx}px`;
    mapDisplay.style.minHeight = `${heightPx}px`;
  }

  function updateWrapperSize() {
    if (!state.map) return;
    const cols = state.map.tiles?.[0]?.length || 0;
    const rows = state.map.tiles?.length || 0;
    let widthContext = null;
    if (typeof layoutRoot?.getBoundingClientRect === 'function') {
      const rect = layoutRoot.getBoundingClientRect();
      widthContext = rect?.width || null;
    }
    if (sideStack.parentElement === mapContainer && typeof sideStack.getBoundingClientRect === 'function') {
      const sideRect = sideStack.getBoundingClientRect();
      const stackWidth = sideRect?.width || 0;
      widthContext = Math.max(0, (widthContext || 0) - stackWidth - 16);
    }
    if (!widthContext && typeof container?.getBoundingClientRect === 'function') {
      const rect = container.getBoundingClientRect();
      widthContext = rect?.width || null;
    }
    const { width, height } = computeViewportDimensions(cols, rows, widthContext);
    mapWrapper.style.width = `${width}px`;
    mapWrapper.style.height = `${height}px`;

    requestFrame(() => {
      state.sizeRetryCount = 0;
      updateTileSizing();
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

  function render() {
    if (!state.map?.tiles?.length) {
      mapDisplay.replaceChildren();
      mapDisplay.style.gridTemplateColumns = 'none';
      updateWrapperSize();
      syncMarkers();
      return;
    }
    const rows = state.map.tiles.length;
    const cols = state.map.tiles[0].length;
    ensureTileElements(cols, rows);
    const tiles = mapDisplay.children;
    let index = 0;
    state.map.tiles.forEach((row, rowIndex) => {
      row.forEach((symbol, colIndex) => {
        const tile = tiles[index++];
        const worldX = state.map.xStart + colIndex;
        const worldY = state.map.yStart + rowIndex;
        tile.dataset.col = `${colIndex}`;
        tile.dataset.row = `${rowIndex}`;
        tile.dataset.worldX = `${worldX}`;
        tile.dataset.worldY = `${worldY}`;
        const type = state.map.types?.[rowIndex]?.[colIndex];
        if (type) {
          tile.dataset.terrain = type;
        } else {
          delete tile.dataset.terrain;
        }
        applyTileAppearance(tile, type, symbol);
      });
    });
    updateWrapperSize();
    syncMarkers();
    requestFrame(updateTileSizing);
    requestFrame(syncMarkers);
  }

  function shiftViewport(dxTiles, dyTiles) {
    if (!dxTiles && !dyTiles) return;
    const baseX = Number.isFinite(state.viewport.xStart) ? state.viewport.xStart : state.map?.xStart || 0;
    const baseY = Number.isFinite(state.viewport.yStart) ? state.viewport.yStart : state.map?.yStart || 0;
    const nextX = baseX + dxTiles;
    const nextY = baseY + dyTiles;
    updateViewportStart(nextX, nextY);
  }

  function pan(dx, dy) {
    const cols = state.viewport.width || state.map?.tiles?.[0]?.length || 0;
    const rows = state.viewport.height || state.map?.tiles?.length || 0;
    if (!cols || !rows) return;
    const stepX = Math.max(1, Math.round(cols * 0.6)) * dx;
    const stepY = Math.max(1, Math.round(rows * 0.6)) * dy;
    shiftViewport(stepX, stepY);
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
      { label: '🎯', recenter: true, aria: recenterLabel },
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

  function handleDragStart(clientX, clientY) {
    if (!allowDrag) return;
    clearHoldTimer();
    hideTooltip();
    state.drag.active = true;
    state.drag.lastX = clientX;
    state.drag.lastY = clientY;
    state.drag.pendingX = 0;
    state.drag.pendingY = 0;
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
    const cols = state.map?.tiles?.[0]?.length || 0;
    const rows = state.map?.tiles?.length || 0;
    if (!cols || !rows) return;
    const rect = mapDisplay.getBoundingClientRect();
    const tileWidth = cols ? rect.width / cols : 0;
    const tileHeight = rows ? rect.height / rows : 0;
    if (!tileWidth || !tileHeight) return;
    const tilesX = Math.trunc(state.drag.pendingX / tileWidth);
    const tilesY = Math.trunc(state.drag.pendingY / tileHeight);
    if (!tilesX && !tilesY) return;
    state.drag.pendingX -= tilesX * tileWidth;
    state.drag.pendingY -= tilesY * tileHeight;
    shiftViewport(tilesX, tilesY);
  }

  function endDrag() {
    if (!state.drag.active) return;
    state.drag.active = false;
    mapWrapper.style.cursor = allowDrag ? 'grab' : 'default';
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
        state.context = { ...state.context, focus: { ...state.focus } };
        state.zoomBase = { width: 0, height: 0 };
        state.zoomDisplayFactor = 1;
        state.zoom = 1;
        state.pendingZoomSync = false;
        render();
        applyZoomTransform();
        return;
      }

      const buffer = extractBufferMap(map);
      state.buffer = buffer;
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

      if (!Number.isFinite(state.viewport.xStart) || !Number.isFinite(state.viewport.yStart)) {
        state.viewport.xStart = state.home.xStart;
        state.viewport.yStart = state.home.yStart;
      }

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

      render();
      updateViewportStart(state.viewport.xStart, state.viewport.yStart, { forceFetch: true });
    },
    refresh() {
      updateWrapperSize();
      updateTileSizing();
      applyResponsiveLayout();
    },
    setTerrainColors(nextColors = null, options = {}) {
      const { forceRefresh = false } = options || {};
      if (nextColors && typeof nextColors === 'object') {
        state.terrainColorOverrides = { ...nextColors };
      } else if (nextColors === false) {
        state.terrainColorOverrides = null;
      }
      const basePalette = getTerrainColors({ forceRefresh });
      const overrides = state.terrainColorOverrides;
      state.terrainColors = overrides ? { ...basePalette, ...overrides } : { ...basePalette };
      if (state.useTerrainColors && state.map?.tiles?.length) {
        render();
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
    destroy() {
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
      if (layoutRoot.parentElement) {
        layoutRoot.parentElement.removeChild(layoutRoot);
      }
      setJobOptionsOpen(false);
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
    },
    elements: {
      layout: layoutRoot,
      mapContainer,
      wrapper: mapWrapper,
      display: mapDisplay,
      markers: markerLayer,
      controls,
      nav: navGrid,
      controlDetails: controlDetailsSection,
      actionPanel,
      actionButtons,
      jobSelect: jobSelectButton
    }
  };
}

export default createMapView;
