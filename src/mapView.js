import { DEFAULT_MAP_WIDTH, TERRAIN_SYMBOLS } from './map.js';

const LEGEND_DEFAULTS = {
  water: 'Water',
  open: 'Open Land',
  forest: 'Forest',
  ore: 'Ore Deposits'
};

const BUFFER_MARGIN = 12;
const DEFAULT_VIEWPORT_SIZE = DEFAULT_MAP_WIDTH;

function summarizeTerrain(types = []) {
  const counts = { water: 0, open: 0, forest: 0, ore: 0 };
  types.forEach(row => {
    row.forEach(type => {
      if (type in counts) counts[type] += 1;
    });
  });
  return counts;
}

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
  onMapUpdate = null
} = {}) {
  if (!container) throw new Error('Container is required for map view');

  const applyControlButtonStyle = (
    button,
    { size = 48, fontSize = '18px', variant = 'square' } = {}
  ) => {
    const dimension = typeof size === 'number' && Number.isFinite(size) ? `${size}px` : `${size}`;
    const isChip = variant === 'chip';
    button.style.width = dimension;
    button.style.height = dimension;
    button.style.padding = '0';
    button.style.fontSize = fontSize;
    button.style.display = 'inline-flex';
    button.style.alignItems = 'center';
    button.style.justifyContent = 'center';
    button.style.borderRadius = isChip ? '999px' : '12px';
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
    bufferMargin: BUFFER_MARGIN,
    zoom: 1,
    minZoom: 0.5,
    maxZoom: 3
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

    render();
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
  layoutRoot.style.alignItems = 'flex-start';
  layoutRoot.style.flexWrap = 'nowrap';
  layoutRoot.style.gap = '16px';

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
  let zoomControls = null;
  let zoomOutButton = null;
  let zoomInButton = null;
  let zoomResetButton = null;
  if (showControls) {
    controls.className = `${idPrefix}-controls map-controls`;
    controls.style.display = 'flex';
    controls.style.flexDirection = 'column';
    controls.style.alignItems = 'center';
    controls.style.gap = '8px';
    controls.style.justifyContent = 'center';
    controls.style.alignSelf = 'flex-start';

    navGrid = document.createElement('div');
    navGrid.className = `${idPrefix}-nav map-nav-grid`;
    navGrid.style.display = 'grid';
    navGrid.style.gridTemplateColumns = 'repeat(3, 48px)';
    navGrid.style.gridAutoRows = '48px';
    navGrid.style.gap = '6px';
    controls.appendChild(navGrid);

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
    controls.appendChild(zoomControls);

    zoomOutButton.addEventListener('click', () => {
      zoomBy(-0.2);
    });
    zoomInButton.addEventListener('click', () => {
      zoomBy(0.2);
    });
    zoomResetButton.addEventListener('click', () => {
      resetZoom();
    });

    updateZoomControls();
  }

  let legendList = null;
  let legendTitle = null;
  let legendContainer = null;
  if (showLegend) {
    legendContainer = document.createElement('div');
    legendContainer.className = `${idPrefix}-legend-container map-legend-container`;
    legendContainer.style.display = 'flex';
    legendContainer.style.flexDirection = 'column';
    legendContainer.style.alignItems = 'flex-start';
    legendContainer.style.gap = '8px';
    legendContainer.style.alignSelf = 'flex-start';

    legendTitle = document.createElement('h4');
    legendTitle.textContent = 'Legend';
    legendContainer.appendChild(legendTitle);

    legendList = document.createElement('ul');
    legendList.className = `${idPrefix}-legend`;
    legendContainer.appendChild(legendList);
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
    const hasLegend = Boolean(legendContainer);
    const hasSideContent = hasControls || hasLegend;

    layoutRoot.style.flexWrap = hasSideContent ? 'nowrap' : 'wrap';

    if (isLandscape && hasSideContent) {
      mapContainer.style.flexDirection = 'row';
      mapContainer.style.flexWrap = 'nowrap';
      mapContainer.style.gap = '16px';
      mapContainer.style.justifyContent = 'flex-start';
      if (!sideStack.parentElement) {
        mapContainer.appendChild(sideStack);
      }
      if (hasControls) {
        controls.style.margin = '0';
        controls.style.alignItems = 'center';
        controls.style.alignSelf = 'flex-start';
        controls.style.justifyContent = 'center';
        sideStack.appendChild(controls);
      }
      if (hasLegend) {
        sideStack.appendChild(legendContainer);
      }
    } else {
      mapContainer.style.flexDirection = 'column';
      mapContainer.style.flexWrap = 'nowrap';
      mapContainer.style.gap = '12px';
      mapContainer.style.justifyContent = 'flex-start';
      if (sideStack.parentElement) {
        sideStack.parentElement.removeChild(sideStack);
      }
      if (hasControls) {
        controls.style.margin = '8px 0 0';
        controls.style.alignItems = 'flex-start';
        controls.style.alignSelf = 'flex-start';
        controls.style.justifyContent = 'flex-start';
        mapContainer.appendChild(controls);
      }
      if (hasLegend) {
        layoutRoot.appendChild(legendContainer);
      }
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

  function updateLegend(counts = {}) {
    if (!legendList) return;
    legendList.innerHTML = '';
    Object.entries(TERRAIN_SYMBOLS).forEach(([type, symbol]) => {
      const li = document.createElement('li');
      const label = legendLabels[type] || type;
      li.textContent = `${symbol} – ${label}`;
      const amount = counts[type];
      if (Number.isFinite(amount)) {
        li.title = `${amount} tile${amount === 1 ? '' : 's'}`;
      }
      legendList.appendChild(li);
    });
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

  function updateZoomControls() {
    if (!zoomResetButton) return;
    zoomResetButton.textContent = `${Math.round(state.zoom * 100)}%`;
    zoomResetButton.setAttribute('aria-label', `Reset zoom to 100% (current ${Math.round(state.zoom * 100)}%)`);
    if (zoomOutButton) {
      zoomOutButton.disabled = state.zoom <= state.minZoom + 0.001;
    }
    if (zoomInButton) {
      zoomInButton.disabled = state.zoom >= state.maxZoom - 0.001;
    }
  }

  function applyZoomTransform() {
    mapDisplay.style.transform = `scale(${state.zoom})`;
    updateZoomControls();
  }

  function setZoom(nextZoom) {
    const clamped = Math.min(state.maxZoom, Math.max(state.minZoom, nextZoom));
    if (Math.abs(clamped - state.zoom) < 0.001) {
      updateZoomControls();
      return;
    }
    state.zoom = clamped;
    applyZoomTransform();
    requestFrame(updateTileSizing);
  }

  function zoomBy(delta) {
    setZoom(state.zoom + delta);
  }

  function resetZoom() {
    setZoom(1);
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
    const availableWidth = Math.max(0, mapWrapper.clientWidth);
    const availableHeight = Math.max(0, mapWrapper.clientHeight);
    if (!availableWidth || !availableHeight) return;
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
      updateTileSizing();
      syncLayoutMetrics();
    });
  }

  function centerMap(options = {}) {
    updateViewportStart(state.home.xStart, state.home.yStart, options);
  }

  function render() {
    if (!state.map?.tiles?.length) {
      mapDisplay.replaceChildren();
      mapDisplay.style.gridTemplateColumns = 'none';
      updateLegend(summarizeTerrain());
      updateWrapperSize();
      return;
    }
    const rows = state.map.tiles.length;
    const cols = state.map.tiles[0].length;
    ensureTileElements(cols, rows);
    const tiles = mapDisplay.children;
    let index = 0;
    state.map.tiles.forEach(row => {
      row.forEach(symbol => {
        tiles[index++].textContent = symbol;
      });
    });
    updateLegend(summarizeTerrain(state.map.types));
    updateWrapperSize();
    requestFrame(updateTileSizing);
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
    const navButtons = [
      { label: '↖', dx: -1, dy: -1, aria: 'Pan northwest' },
      { label: '↑', dx: 0, dy: -1, aria: 'Pan north' },
      { label: '↗', dx: 1, dy: -1, aria: 'Pan northeast' },
      { label: '←', dx: -1, dy: 0, aria: 'Pan west' },
      { label: '🎯', recenter: true, aria: 'Recenter map' },
      { label: '→', dx: 1, dy: 0, aria: 'Pan east' },
      { label: '↙', dx: -1, dy: 1, aria: 'Pan southwest' },
      { label: '↓', dx: 0, dy: 1, aria: 'Pan south' },
      { label: '↘', dx: 1, dy: 1, aria: 'Pan southeast' }
    ];
    navButtons.forEach(config => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = config.label;
      btn.setAttribute('aria-label', config.aria);
      applyControlButtonStyle(btn, { variant: 'chip', fontSize: '22px' });
      btn.addEventListener('click', () => {
        if (config.recenter) {
          centerMap();
        } else {
          pan(config.dx, config.dy);
        }
      });
      navGrid.appendChild(btn);
    });
  }

  function handleDragStart(clientX, clientY) {
    if (!allowDrag) return;
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
        render();
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
    center: centerMap,
    destroy() {
      if (typeof window !== 'undefined') {
        if (state.resizeHandler) {
          window.removeEventListener('resize', state.resizeHandler);
        }
        if (detachGlobalDrag) detachGlobalDrag();
      }
      if (layoutRoot.parentElement) {
        layoutRoot.parentElement.removeChild(layoutRoot);
      }
      if (typeof document !== 'undefined') {
        document.documentElement.style.removeProperty('--map-layout-width');
      }
    },
    elements: {
      layout: layoutRoot,
      mapContainer,
      wrapper: mapWrapper,
      display: mapDisplay,
      controls,
      legendList,
      legendContainer
    }
  };
}

export default createMapView;
