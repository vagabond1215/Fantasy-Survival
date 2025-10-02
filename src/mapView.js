import { TERRAIN_SYMBOLS } from './map.js';

const LEGEND_DEFAULTS = {
  water: 'Water',
  open: 'Open Land',
  forest: 'Forest',
  ore: 'Ore Deposits'
};

function summarizeTerrain(types = []) {
  const counts = { water: 0, open: 0, forest: 0, ore: 0 };
  types.forEach(row => {
    row.forEach(type => {
      if (type in counts) counts[type] += 1;
    });
  });
  return counts;
}

function computeViewportDimensions(cols = 0, rows = 0) {
  const MIN_SIZE = 220;
  const hasDimensions = cols > 0 && rows > 0;

  if (typeof window === 'undefined') {
    const base = 320;
    const size = Math.max(MIN_SIZE, base);
    return { width: size, height: size };
  }

  const widthAllowance = Math.max(MIN_SIZE, window.innerWidth - 80);
  const heightAllowance = Math.max(MIN_SIZE, window.innerHeight - 260);
  const limit = Math.min(widthAllowance, heightAllowance);

  if (!hasDimensions) {
    const size = Math.max(MIN_SIZE, limit);
    return { width: size, height: size };
  }

  const tileWidthLimit = widthAllowance / cols;
  const tileHeightLimit = heightAllowance / rows;
  const tileSize = Math.max(8, Math.min(tileWidthLimit, tileHeightLimit));
  const size = Math.max(MIN_SIZE, Math.min(limit, tileSize * Math.max(cols, rows)));

  return { width: size, height: size };
}

function requestFrame(callback) {
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    window.requestAnimationFrame(callback);
  } else {
    setTimeout(callback, 0);
  }
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

  const applySquareButtonStyle = (button, fontSize = '18px') => {
    button.style.width = '48px';
    button.style.height = '48px';
    button.style.fontSize = fontSize;
    button.style.display = 'flex';
    button.style.alignItems = 'center';
    button.style.justifyContent = 'center';
  };

  const state = {
    map: null,
    context: {},
    home: { xStart: 0, yStart: 0 },
    focus: { x: 0, y: 0 },
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
    zoom: 1,
    minZoom: 0.5,
    maxZoom: 3
  };

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

  const mapDisplay = document.createElement('pre');
  mapDisplay.className = `${idPrefix}-display map-display`;
  mapDisplay.style.whiteSpace = 'pre';
  mapDisplay.style.fontFamily = '"Apple Color Emoji", "Noto Color Emoji", "Segoe UI Emoji", sans-serif';
  mapDisplay.style.lineHeight = '1';
  mapDisplay.style.margin = '0';
  mapDisplay.style.padding = '0';
  mapDisplay.style.display = 'block';
  mapDisplay.style.width = '100%';
  mapDisplay.style.height = '100%';
  mapDisplay.style.position = 'absolute';
  mapDisplay.style.top = '50%';
  mapDisplay.style.left = '50%';
  mapDisplay.style.transform = 'translate(-50%, -50%) scale(1)';
  mapDisplay.style.transformOrigin = 'center center';
  mapDisplay.style.boxSizing = 'border-box';
  mapWrapper.appendChild(mapDisplay);

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
    zoomControls.style.display = 'flex';
    zoomControls.style.gap = '8px';
    zoomControls.style.justifyContent = 'center';
    zoomControls.style.alignItems = 'center';
    zoomControls.style.width = '100%';

    const createZoomButton = (label, aria, fontSize) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.setAttribute('aria-label', aria);
      applySquareButtonStyle(button, fontSize);
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

    requestFrame(updateFontSize);
  }

  function updateLegend(counts = {}) {
    if (!legendList) return;
    legendList.innerHTML = '';
    Object.entries(TERRAIN_SYMBOLS).forEach(([type, symbol]) => {
      const li = document.createElement('li');
      const label = legendLabels[type] || type;
      const amount = counts[type] ?? 0;
      li.textContent = `${symbol} – ${label} (${amount})`;
      legendList.appendChild(li);
    });
  }

  function normalizeFocusCoords(coords = {}) {
    const x = Number.isFinite(coords.x) ? coords.x : 0;
    const y = Number.isFinite(coords.y) ? coords.y : 0;
    return { x, y };
  }

  function computeHomeStart(coords = {}) {
    const rows = state.map?.tiles?.length || 0;
    const cols = rows ? state.map.tiles[0]?.length || 0 : 0;
    if (!rows || !cols) {
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
    mapDisplay.style.transform = `translate(-50%, -50%) scale(${state.zoom})`;
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
    requestFrame(updateFontSize);
  }

  function zoomBy(delta) {
    setZoom(state.zoom + delta);
  }

  function resetZoom() {
    setZoom(1);
  }

  function updateFontSize() {
    if (!state.map) return;
    const rows = state.map.tiles?.length || 0;
    const cols = rows ? state.map.tiles[0].length : 0;
    if (!rows || !cols) return;
    const availableWidth = Math.max(0, mapWrapper.clientWidth);
    const availableHeight = Math.max(0, mapWrapper.clientHeight);
    if (!availableWidth || !availableHeight) return;
    const sizeForWidth = availableWidth / cols;
    const sizeForHeight = availableHeight / rows;
    const targetSize = Math.max(8, Math.min(sizeForWidth, sizeForHeight));
    mapDisplay.style.fontSize = `${targetSize}px`;
  }

  function updateWrapperSize() {
    if (!state.map) return;
    const cols = state.map.tiles?.[0]?.length || 0;
    const rows = state.map.tiles?.length || 0;
    const { width, height } = computeViewportDimensions(cols, rows);
    mapWrapper.style.width = `${width}px`;
    mapWrapper.style.height = `${height}px`;

    requestFrame(() => {
      updateFontSize();
    });
  }

  function applyMap(nextMap) {
    if (!nextMap || !nextMap.tiles) return;
    state.map = { ...nextMap };
    if (state.focus) {
      state.home = computeHomeStart(state.focus);
    }
    state.context = { ...state.context, focus: { ...state.focus } };
    if (typeof state.onMapUpdate === 'function') {
      state.onMapUpdate(state.map, state.context);
    }
    render();
  }

  function requestMapUpdate(xStart, yStart) {
    if (!state.map) return;
    const width = state.map.tiles?.[0]?.length || 0;
    const height = state.map.tiles?.length || 0;
    if (!width || !height) return;
    const params = {
      map: state.map,
      context: state.context,
      seed: state.map.seed,
      season: state.map.season,
      xStart,
      yStart,
      width,
      height
    };
    if (typeof state.fetchMap === 'function') {
      const result = state.fetchMap(params);
      if (result && typeof result.then === 'function') {
        result.then(applyMap);
      } else {
        applyMap(result);
      }
    } else {
      applyMap({ ...state.map, xStart, yStart });
    }
  }

  function centerMap() {
    requestMapUpdate(state.home.xStart, state.home.yStart);
  }

  function render() {
    if (!state.map) return;
    const rows = state.map.tiles.map(row => row.join(''));
    mapDisplay.textContent = rows.join('\n');
    updateLegend(summarizeTerrain(state.map.types));
    updateWrapperSize();
    requestFrame(updateFontSize);
  }

  function shiftViewport(dxTiles, dyTiles) {
    if (!state.map || (!dxTiles && !dyTiles)) return;
    const nextX = (state.map.xStart || 0) + dxTiles;
    const nextY = (state.map.yStart || 0) + dyTiles;
    requestMapUpdate(nextX, nextY);
  }

  function pan(dx, dy) {
    if (!state.map) return;
    const cols = state.map.tiles?.[0]?.length || 0;
    const rows = state.map.tiles?.length || 0;
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
      applySquareButtonStyle(btn);
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
      state.map = map ? { ...map } : null;
      state.context = { ...state.context, ...context };
      if (!state.map) {
        render();
        return;
      }

      const focusCandidate =
        context?.focus ??
        context?.center ??
        context?.current ??
        context?.currentCoords ??
        context?.homeCoords ??
        state.focus;
      state.focus = normalizeFocusCoords(focusCandidate);
      state.context = { ...state.context, focus: { ...state.focus } };
      state.home = computeHomeStart(state.focus);

      const needsRecentering =
        state.map.xStart !== state.home.xStart || state.map.yStart !== state.home.yStart;

      if (needsRecentering) {
        requestMapUpdate(state.home.xStart, state.home.yStart);
      } else {
        render();
      }
    },
    refresh() {
      updateWrapperSize();
      updateFontSize();
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
