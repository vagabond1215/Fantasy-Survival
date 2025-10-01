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

function computeViewportSize() {
  if (typeof window === 'undefined') return 320;
  const widthAllowance = Math.max(220, window.innerWidth - 80);
  const heightAllowance = Math.max(220, window.innerHeight - 260);
  return Math.max(220, Math.min(widthAllowance, heightAllowance));
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

  const state = {
    map: null,
    context: {},
    home: { xStart: 0, yStart: 0 },
    drag: {
      active: false,
      lastX: 0,
      lastY: 0,
      pendingX: 0,
      pendingY: 0
    },
    resizeHandler: null,
    fetchMap,
    onMapUpdate
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
  mapDisplay.style.fontFamily = '"Apple Color Emoji", "Segoe UI Emoji", sans-serif';
  mapDisplay.style.lineHeight = '1';
  mapDisplay.style.margin = '0';
  mapDisplay.style.padding = '0';
  mapDisplay.style.display = 'block';
  mapDisplay.style.width = '100%';
  mapDisplay.style.height = '100%';
  mapDisplay.style.boxSizing = 'border-box';
  mapWrapper.appendChild(mapDisplay);

  container.appendChild(mapWrapper);

  const controls = document.createElement('div');
  if (showControls) {
    controls.className = `${idPrefix}-controls map-controls`;
    controls.style.display = 'grid';
    controls.style.gridTemplateColumns = 'repeat(3, 48px)';
    controls.style.gridAutoRows = '48px';
    controls.style.gap = '6px';
    controls.style.margin = '8px auto 0';
    controls.style.justifyContent = 'center';
    container.appendChild(controls);
  }

  let legendList = null;
  let legendTitle = null;
  if (showLegend) {
    legendTitle = document.createElement('h4');
    legendTitle.textContent = 'Legend';
    container.appendChild(legendTitle);

    legendList = document.createElement('ul');
    legendList.className = `${idPrefix}-legend`;
    container.appendChild(legendList);
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
    const size = computeViewportSize();
    mapWrapper.style.width = `${size}px`;
    mapWrapper.style.height = `${size}px`;

    requestFrame(() => {
      updateFontSize();
    });
  }

  function applyMap(nextMap) {
    if (!nextMap || !nextMap.tiles) return;
    state.map = { ...nextMap };
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
    if (!showControls) return;
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
      btn.style.width = '48px';
      btn.style.height = '48px';
      btn.style.fontSize = '18px';
      btn.style.display = 'flex';
      btn.style.alignItems = 'center';
      btn.style.justifyContent = 'center';
      btn.addEventListener('click', () => {
        if (config.recenter) {
          centerMap();
        } else {
          pan(config.dx, config.dy);
        }
      });
      controls.appendChild(btn);
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
  attachNavButtons();

  if (typeof window !== 'undefined') {
    state.resizeHandler = () => {
      updateWrapperSize();
    };
    window.addEventListener('resize', state.resizeHandler);
  }

  return {
    setMap(map, context = {}) {
      state.map = map ? { ...map } : null;
      state.context = { ...state.context, ...context };
      if (state.map) {
        state.home = {
          xStart: state.map.xStart || 0,
          yStart: state.map.yStart || 0
        };
      }
      render();
    },
    refresh() {
      updateWrapperSize();
      updateFontSize();
    },
    center: centerMap,
    destroy() {
      if (typeof window !== 'undefined') {
        if (state.resizeHandler) {
          window.removeEventListener('resize', state.resizeHandler);
        }
        if (detachGlobalDrag) detachGlobalDrag();
      }
      if (mapWrapper.parentElement === container) container.removeChild(mapWrapper);
      if (showControls && controls.parentElement === container) container.removeChild(controls);
      if (legendList && legendList.parentElement === container) container.removeChild(legendList);
      if (legendTitle && legendTitle.parentElement === container) container.removeChild(legendTitle);
    },
    elements: {
      wrapper: mapWrapper,
      display: mapDisplay,
      controls,
      legendList
    }
  };
}

export default createMapView;
