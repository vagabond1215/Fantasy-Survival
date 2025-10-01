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
  idPrefix = 'map'
} = {}) {
  if (!container) throw new Error('Container is required for map view');

  const state = {
    map: null,
    initialized: false,
    drag: {
      active: false,
      startX: 0,
      startY: 0,
      scrollLeft: 0,
      scrollTop: 0
    },
    resizeHandler: null
  };

  const mapWrapper = document.createElement('div');
  mapWrapper.className = `${idPrefix}-wrapper map-wrapper`;
  mapWrapper.style.position = 'relative';
  mapWrapper.style.border = '1px solid var(--map-border, #ccc)';
  mapWrapper.style.background = 'var(--map-bg, #f4f4f4)';
  mapWrapper.style.overflow = 'auto';
  mapWrapper.style.cursor = allowDrag ? 'grab' : 'default';
  mapWrapper.style.userSelect = 'none';
  mapWrapper.style.touchAction = allowDrag ? 'none' : 'auto';

  const mapDisplay = document.createElement('pre');
  mapDisplay.className = `${idPrefix}-display map-display`;
  mapDisplay.style.whiteSpace = 'pre';
  mapDisplay.style.fontFamily = '"Apple Color Emoji", "Segoe UI Emoji", sans-serif';
  mapDisplay.style.lineHeight = '1';
  mapDisplay.style.margin = '0';
  mapDisplay.style.padding = '10px';
  mapDisplay.style.display = 'inline-block';
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
    const horizontalPadding = 20;
    const verticalPadding = 20;
    const availableWidth = Math.max(0, mapWrapper.clientWidth - horizontalPadding);
    const availableHeight = Math.max(0, mapWrapper.clientHeight - verticalPadding);
    if (!availableWidth || !availableHeight) return;
    const sizeForWidth = availableWidth / cols;
    const sizeForHeight = availableHeight / rows;
    const targetSize = Math.max(8, Math.min(sizeForWidth, sizeForHeight));
    mapDisplay.style.fontSize = `${targetSize}px`;
  }

  function updateWrapperSize({ preserveScroll = true } = {}) {
    if (!state.map) return;
    const size = computeViewportSize();
    let leftRatio = 0;
    let topRatio = 0;
    if (preserveScroll) {
      const maxLeft = Math.max(1, mapDisplay.scrollWidth - mapWrapper.clientWidth);
      const maxTop = Math.max(1, mapDisplay.scrollHeight - mapWrapper.clientHeight);
      leftRatio = mapWrapper.scrollLeft / maxLeft;
      topRatio = mapWrapper.scrollTop / maxTop;
    }
    mapWrapper.style.width = `${size}px`;
    mapWrapper.style.height = `${size}px`;

    requestFrame(() => {
      if (preserveScroll) {
        const maxLeft = Math.max(0, mapDisplay.scrollWidth - mapWrapper.clientWidth);
        const maxTop = Math.max(0, mapDisplay.scrollHeight - mapWrapper.clientHeight);
        mapWrapper.scrollLeft = leftRatio * maxLeft;
        mapWrapper.scrollTop = topRatio * maxTop;
      }
      updateFontSize();
    });
  }

  function centerMap() {
    requestFrame(() => {
      const maxLeft = Math.max(0, mapDisplay.scrollWidth - mapWrapper.clientWidth);
      const maxTop = Math.max(0, mapDisplay.scrollHeight - mapWrapper.clientHeight);
      mapWrapper.scrollLeft = maxLeft / 2;
      mapWrapper.scrollTop = maxTop / 2;
    });
  }

  function render() {
    if (!state.map) return;
    const rows = state.map.tiles.map(row => row.join(''));
    mapDisplay.textContent = rows.join('\n');
    updateLegend(summarizeTerrain(state.map.types));
    updateWrapperSize({ preserveScroll: state.initialized });
    requestFrame(updateFontSize);
    if (!state.initialized) {
      centerMap();
      state.initialized = true;
    }
  }

  function pan(dx, dy) {
    const stepX = mapWrapper.clientWidth * 0.6;
    const stepY = mapWrapper.clientHeight * 0.6;
    mapWrapper.scrollBy({
      left: dx * stepX,
      top: dy * stepY,
      behavior: 'smooth'
    });
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
          state.initialized = false;
          centerMap();
          state.initialized = true;
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
    state.drag.startX = clientX;
    state.drag.startY = clientY;
    state.drag.scrollLeft = mapWrapper.scrollLeft;
    state.drag.scrollTop = mapWrapper.scrollTop;
    mapWrapper.style.cursor = 'grabbing';
  }

  function updateDrag(clientX, clientY) {
    if (!state.drag.active) return;
    const dx = clientX - state.drag.startX;
    const dy = clientY - state.drag.startY;
    mapWrapper.scrollLeft = state.drag.scrollLeft - dx;
    mapWrapper.scrollTop = state.drag.scrollTop - dy;
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
    state.resizeHandler = () => updateWrapperSize({ preserveScroll: true });
    window.addEventListener('resize', state.resizeHandler);
  }

  return {
    setMap(map) {
      state.map = map;
      state.initialized = false;
      render();
    },
    refresh() {
      updateWrapperSize({ preserveScroll: true });
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
