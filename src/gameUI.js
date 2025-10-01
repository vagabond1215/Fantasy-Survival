import { addItem, setExpectedChange } from './inventory.js';
import { advanceDay, advanceHours, info as timeInfo, isMealTime, isNightfall, resetToDawn } from './time.js';
import store from './state.js';
import { showBackButton } from './menu.js';
import { allLocations } from './location.js';
import { generateColorMap, TERRAIN_SYMBOLS } from './map.js';
import { getBiome } from './biomes.js';
import {
  addOrder as queueOrder,
  getOrders,
  activateNextOrder,
  removeOrder,
  updateOrder,
  clearCompletedOrders,
  getActiveOrder
} from './orders.js';
import { calculateOrderDelta, calculateExpectedInventoryChanges } from './resources.js';

const LEGEND_LABELS = {
  water: 'Water',
  open: 'Open Land',
  forest: 'Forest',
  ore: 'Ore Deposits'
};

const ENEMY_EVENT_CHANCE_PER_HOUR = 0.05;

let mapWrapper = null;
let mapDisplay = null;
let legendList = null;
let lastSeason = null;
let ordersList = null;
let inventoryPanel = null;
let eventLogList = null;
let timeBanner = null;
let startBtn = null;
let mapControls = null;
let mapInitialized = false;
let mapResizeHandler = null;
let dragListenersAttached = false;
let isDraggingMap = false;
const dragState = {
  startX: 0,
  startY: 0,
  scrollLeft: 0,
  scrollTop: 0
};

function requestFrame(callback) {
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    window.requestAnimationFrame(callback);
  } else {
    setTimeout(callback, 0);
  }
}

function summarizeTerrain(types = []) {
  const counts = { water: 0, open: 0, forest: 0, ore: 0 };
  types.forEach(row => {
    row.forEach(type => {
      if (type in counts) counts[type] += 1;
    });
  });
  return counts;
}

function updateLegend(counts = summarizeTerrain(store.locations.values().next().value?.map?.types || [])) {
  if (!legendList) return;
  legendList.innerHTML = '';
  Object.entries(TERRAIN_SYMBOLS).forEach(([type, symbol]) => {
    const li = document.createElement('li');
    const label = LEGEND_LABELS[type] || type;
    const amount = counts[type] ?? 0;
    li.textContent = `${symbol} – ${label} (${amount})`;
    legendList.appendChild(li);
  });
}

function computeMapViewportSize() {
  if (typeof window === 'undefined') return 320;
  const widthAllowance = Math.max(200, window.innerWidth - 80);
  const heightAllowance = Math.max(200, window.innerHeight - 240);
  return Math.max(220, Math.min(widthAllowance, heightAllowance));
}

function updateMapFontSize() {
  if (!mapWrapper || !mapDisplay) return;
  const loc = allLocations()[0];
  const rows = loc?.map?.tiles?.length || 0;
  const cols = rows ? loc.map.tiles[0].length : 0;
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

function updateMapWrapperSize({ preserveScroll = true } = {}) {
  if (!mapWrapper || !mapDisplay) return;
  const size = computeMapViewportSize();
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
    updateMapFontSize();
  });
}

function centerMap() {
  if (!mapWrapper || !mapDisplay) return;
  requestFrame(() => {
    const maxLeft = Math.max(0, mapDisplay.scrollWidth - mapWrapper.clientWidth);
    const maxTop = Math.max(0, mapDisplay.scrollHeight - mapWrapper.clientHeight);
    mapWrapper.scrollLeft = maxLeft / 2;
    mapWrapper.scrollTop = maxTop / 2;
  });
}

function renderTextMap() {
  const loc = allLocations()[0];
  if (!loc || !mapDisplay) return;
  const rows = loc.map.tiles.map(row => row.join(''));
  mapDisplay.textContent = rows.join('\n');
  updateLegend(summarizeTerrain(loc.map.types));
  updateMapWrapperSize({ preserveScroll: mapInitialized });
  requestFrame(updateMapFontSize);
  if (!mapInitialized) {
    centerMap();
    mapInitialized = true;
  }
}

function formatHour(hour = 0) {
  const normalized = ((hour % 24) + 24) % 24;
  const h = Math.floor(normalized);
  return `${String(h).padStart(2, '0')}:00`;
}

function ensureEventLog() {
  if (!Array.isArray(store.eventLog)) store.eventLog = [];
  return store.eventLog;
}

function logEvent(message) {
  const t = timeInfo();
  const log = ensureEventLog();
  log.unshift({
    id: `${Date.now()}-${Math.random()}`,
    message,
    day: t.day,
    hour: t.hour,
    season: t.season
  });
  if (log.length > 30) {
    log.length = 30;
  }
}

function renderEventLog() {
  if (!eventLogList) return;
  const log = ensureEventLog();
  eventLogList.innerHTML = '';
  if (!log.length) {
    const empty = document.createElement('li');
    empty.textContent = 'No recent events yet.';
    eventLogList.appendChild(empty);
    return;
  }
  log.forEach(entry => {
    const li = document.createElement('li');
    li.textContent = `Day ${entry.day} ${entry.season} ${formatHour(entry.hour)} – ${entry.message}`;
    eventLogList.appendChild(li);
  });
}

function updateInventoryExpectations() {
  const expected = calculateExpectedInventoryChanges(getOrders());
  const known = new Set(Array.from(store.inventory.keys()));
  Object.keys(expected).forEach(name => known.add(name));
  known.forEach(name => {
    const change = expected[name] || 0;
    setExpectedChange(name, Math.round(change * 10) / 10);
  });
}

function renderInventory() {
  if (!inventoryPanel) return;
  inventoryPanel.innerHTML = '<h3>Inventory</h3>';
  const table = document.createElement('table');
  const header = document.createElement('tr');
  header.innerHTML = '<th>Item</th><th>Quantity</th><th>Expected Δ</th>';
  table.appendChild(header);
  const items = Array.from(store.inventory.values()).sort((a, b) => a.id.localeCompare(b.id));
  if (!items.length) {
    const empty = document.createElement('tr');
    empty.innerHTML = '<td colspan="3">No supplies on hand.</td>';
    table.appendChild(empty);
  } else {
    items.forEach(item => {
      const tr = document.createElement('tr');
      const expected = item.expectedChange ?? 0;
      const expectedRounded = Math.round(expected * 10) / 10;
      const expectedText = expectedRounded > 0 ? `+${expectedRounded}` : expectedRounded;
      const quantity = Math.round(item.quantity * 10) / 10;
      tr.innerHTML = `<td>${item.id}</td><td>${quantity}</td><td>${expectedText}</td>`;
      table.appendChild(tr);
    });
  }
  inventoryPanel.appendChild(table);
}

function capitalize(str = '') {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function renderOrders() {
  if (!ordersList) return;
  const orders = getOrders();
  ordersList.innerHTML = '';
  if (!orders.length) {
    const empty = document.createElement('p');
    empty.textContent = 'No orders queued. Add new tasks for your villagers.';
    ordersList.appendChild(empty);
    if (startBtn) startBtn.disabled = true;
    return;
  }
  if (startBtn) startBtn.disabled = false;
  const table = document.createElement('table');
  const header = document.createElement('tr');
  header.innerHTML = '<th>Status</th><th>Type</th><th>Workers</th><th>Remaining (hrs)</th><th>Notes</th><th></th>';
  table.appendChild(header);
  orders.forEach(order => {
    const tr = document.createElement('tr');
    const statusIcon = order.status === 'completed' ? '✅' : order.status === 'active' ? '▶️' : '⏳';
    const remaining = order.remainingHours ?? order.durationHours;
    const removeBtn = document.createElement('button');
    removeBtn.textContent = '✖';
    removeBtn.disabled = order.status === 'active';
    removeBtn.addEventListener('click', () => {
      removeOrder(order.id);
      updateInventoryExpectations();
      render();
    });
    const removeCell = document.createElement('td');
    removeCell.appendChild(removeBtn);
    tr.innerHTML = `<td>${statusIcon}</td><td>${capitalize(order.type)}</td><td>${order.workers}</td><td>${Math.max(0, Math.round(remaining))}</td><td>${order.notes || ''}</td>`;
    tr.appendChild(removeCell);
    table.appendChild(tr);
  });
  ordersList.appendChild(table);
}

function ensureSeasonalMap() {
  const loc = allLocations()[0];
  if (!loc?.map) return;
  const t = timeInfo();
  if (lastSeason && lastSeason === t.season) return;
  const map = loc.map;
  const newMap = generateColorMap(
    loc.biome,
    map.seed,
    map.xStart,
    map.yStart,
    map.tiles[0].length,
    map.tiles.length,
    t.season,
    map.waterLevel
  );
  loc.map = { ...map, ...newMap };
  lastSeason = t.season;
  mapInitialized = false;
  renderTextMap();
}

function renderTimeBanner() {
  if (!timeBanner) return;
  const t = timeInfo();
  timeBanner.textContent = `Day ${t.day} – ${t.season} – ${formatHour(t.hour)}`;
}

function render() {
  ensureSeasonalMap();
  renderTimeBanner();
  renderTextMap();
  renderOrders();
  renderInventoryExpectations();
  renderEventLog();
}

function renderInventoryExpectations() {
  updateInventoryExpectations();
  renderInventory();
}

function processOrderCycle() {
  const orders = getOrders();
  if (!orders.length) {
    logEvent('No orders queued.');
    render();
    return;
  }
  let active = getActiveOrder();
  if (!active) {
    active = activateNextOrder();
  }
  if (!active) {
    logEvent('All queued orders are complete.');
    render();
    return;
  }

  let event = null;
  while (!event) {
    active = getActiveOrder();
    if (!active) {
      event = 'All queued orders are complete.';
      break;
    }
    if (active.remainingHours <= 0) {
      updateOrder(active.id, { status: 'completed', remainingHours: 0 });
      event = `${capitalize(active.type)} order completed.`;
      break;
    }

    const t = timeInfo();
    const hoursToCompletion = Math.max(0, active.remainingHours);
    const hoursToMeal = t.hour < 12 ? 12 - t.hour : Infinity;
    const hoursToNight = t.hour < 20 ? 20 - t.hour : Infinity;
    let step = Math.min(hoursToCompletion, hoursToMeal, hoursToNight);
    if (!Number.isFinite(step) || step <= 0) step = 1;

    const delta = calculateOrderDelta(active, step);
    Object.entries(delta).forEach(([resource, amount]) => {
      if (!amount) return;
      addItem(resource, amount);
    });

    updateOrder(active.id, {
      remainingHours: Math.max(0, active.remainingHours - step)
    });

    advanceHours(step);

    active = getActiveOrder();
    if (active && active.remainingHours <= 0) {
      updateOrder(active.id, { status: 'completed', remainingHours: 0 });
      event = `${capitalize(active.type)} order completed.`;
      break;
    }

    if (isMealTime()) {
      event = 'Midday meal break.';
      break;
    }

    if (isNightfall()) {
      event = 'Nightfall. The village rests.';
      advanceDay();
      resetToDawn();
      break;
    }

    if (Math.random() < ENEMY_EVENT_CHANCE_PER_HOUR * step) {
      event = 'Enemies sighted near the settlement! Prepare defenses.';
      break;
    }
  }

  if (event) logEvent(event);
  updateInventoryExpectations();
  render();
}

function buildOrderForm(section) {
  const form = document.createElement('form');
  form.id = 'order-form';
  form.addEventListener('submit', evt => {
    evt.preventDefault();
  });

  const typeLabel = document.createElement('label');
  typeLabel.textContent = 'Order Type:';
  const typeSelect = document.createElement('select');
  typeSelect.name = 'order-type';
  [
    { value: 'hunting', label: 'Hunting' },
    { value: 'gathering', label: 'Gathering' },
    { value: 'crafting', label: 'Crafting' },
    { value: 'building', label: 'Building' },
    { value: 'combat', label: 'Combat Patrol' }
  ].forEach(opt => {
    const option = document.createElement('option');
    option.value = opt.value;
    option.textContent = opt.label;
    typeSelect.appendChild(option);
  });
  typeLabel.appendChild(typeSelect);

  const workerLabel = document.createElement('label');
  workerLabel.textContent = 'Workers:';
  workerLabel.style.marginLeft = '8px';
  const workerInput = document.createElement('input');
  workerInput.type = 'number';
  workerInput.min = '1';
  workerInput.value = '1';
  workerInput.style.width = '60px';
  workerLabel.appendChild(workerInput);

  const hoursLabel = document.createElement('label');
  hoursLabel.textContent = 'Hours:';
  hoursLabel.style.marginLeft = '8px';
  const hoursInput = document.createElement('input');
  hoursInput.type = 'number';
  hoursInput.min = '1';
  hoursInput.value = '4';
  hoursInput.style.width = '60px';
  hoursLabel.appendChild(hoursInput);

  const notesLabel = document.createElement('label');
  notesLabel.textContent = 'Notes:';
  notesLabel.style.marginLeft = '8px';
  const notesInput = document.createElement('input');
  notesInput.type = 'text';
  notesInput.placeholder = 'Optional details';
  notesInput.style.width = '200px';
  notesLabel.appendChild(notesInput);

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.textContent = 'Add Order';
  addBtn.style.marginLeft = '8px';
  addBtn.addEventListener('click', () => {
    const workers = Math.max(1, Number.parseInt(workerInput.value, 10) || 1);
    const hours = Math.max(1, Number.parseInt(hoursInput.value, 10) || 1);
    queueOrder({
      type: typeSelect.value,
      workers,
      hours,
      notes: notesInput.value.trim()
    });
    notesInput.value = '';
    updateInventoryExpectations();
    render();
  });

  form.appendChild(typeLabel);
  form.appendChild(workerLabel);
  form.appendChild(hoursLabel);
  form.appendChild(notesLabel);
  form.appendChild(addBtn);

  section.appendChild(form);
}

export function closeJobs() {
  showBackButton(false);
}

export function showJobs() {
  const ordersSection = document.getElementById('orders-section');
  if (ordersSection) {
    ordersSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  showBackButton(false);
}

export function initGameUI() {
  const container = document.getElementById('game');
  if (!container) return;
  container.innerHTML = '';

  const loc = allLocations()[0];
  if (loc?.map?.tiles) {
    if (loc.map.season !== store.time.season) {
      const newMap = generateColorMap(
        loc.biome,
        loc.map.seed,
        loc.map.xStart,
        loc.map.yStart,
        loc.map.tiles[0].length,
        loc.map.tiles.length,
        store.time.season
      );
      loc.map = { ...loc.map, ...newMap };
    }
    const mapSection = document.createElement('section');
    mapSection.id = 'map-section';

    const biomeName = getBiome(loc.biome)?.name || loc.biome;
    const title = document.createElement('h3');
    title.textContent = `Location: ${biomeName}`;
    mapSection.appendChild(title);

    if (loc.features?.length) {
      const features = document.createElement('p');
      features.textContent = `Notable features: ${loc.features.join(', ')}`;
      mapSection.appendChild(features);
    }

    const instructions = document.createElement('p');
    instructions.textContent = 'Use the arrows or drag across the map to explore. Tap the crosshair to recenter the view.';
    mapSection.appendChild(instructions);

    mapWrapper = document.createElement('div');
    mapWrapper.id = 'map-wrapper';
    mapWrapper.style.position = 'relative';
    mapWrapper.style.border = '1px solid #ccc';
    mapWrapper.style.background = '#f4f4f4';
    mapWrapper.style.overflow = 'auto';
    mapWrapper.style.cursor = 'grab';
    mapWrapper.style.userSelect = 'none';
    mapWrapper.style.touchAction = 'none';
    mapSection.appendChild(mapWrapper);

    mapDisplay = document.createElement('pre');
    mapDisplay.id = 'map-display';
    mapDisplay.style.whiteSpace = 'pre';
    mapDisplay.style.fontFamily = '"Apple Color Emoji", "Segoe UI Emoji", sans-serif';
    mapDisplay.style.lineHeight = '1';
    mapDisplay.style.margin = '0';
    mapDisplay.style.padding = '10px';
    mapDisplay.style.display = 'inline-block';
    mapWrapper.appendChild(mapDisplay);

    mapControls = document.createElement('div');
    mapControls.id = 'map-controls';
    mapControls.style.display = 'grid';
    mapControls.style.gridTemplateColumns = 'repeat(3, 48px)';
    mapControls.style.gridAutoRows = '48px';
    mapControls.style.gap = '6px';
    mapControls.style.margin = '8px auto 0';
    mapControls.style.justifyContent = 'center';
    mapSection.appendChild(mapControls);

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

    function panMap(dx, dy) {
      if (!mapWrapper) return;
      const stepX = mapWrapper.clientWidth * 0.6;
      const stepY = mapWrapper.clientHeight * 0.6;
      mapWrapper.scrollBy({
        left: dx * stepX,
        top: dy * stepY,
        behavior: 'smooth'
      });
    }

    function createNavButton(config) {
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
          mapInitialized = false;
          centerMap();
          mapInitialized = true;
        } else {
          panMap(config.dx, config.dy);
        }
      });
      mapControls.appendChild(btn);
    }

    navButtons.forEach(createNavButton);

    function startDrag(clientX, clientY) {
      if (!mapWrapper) return;
      isDraggingMap = true;
      dragState.startX = clientX;
      dragState.startY = clientY;
      dragState.scrollLeft = mapWrapper.scrollLeft;
      dragState.scrollTop = mapWrapper.scrollTop;
      mapWrapper.style.cursor = 'grabbing';
    }

    function handleMouseDown(event) {
      event.preventDefault();
      startDrag(event.clientX, event.clientY);
    }

    function handleTouchStart(event) {
      if (!event.touches?.length) return;
      const touch = event.touches[0];
      startDrag(touch.clientX, touch.clientY);
      event.preventDefault();
    }

    function updateDrag(clientX, clientY) {
      if (!isDraggingMap || !mapWrapper) return;
      const dx = clientX - dragState.startX;
      const dy = clientY - dragState.startY;
      mapWrapper.scrollLeft = dragState.scrollLeft - dx;
      mapWrapper.scrollTop = dragState.scrollTop - dy;
    }

    function handleMouseMove(event) {
      if (!isDraggingMap) return;
      event.preventDefault();
      updateDrag(event.clientX, event.clientY);
    }

    function handleTouchMove(event) {
      if (!isDraggingMap || !event.touches?.length) return;
      const touch = event.touches[0];
      updateDrag(touch.clientX, touch.clientY);
      event.preventDefault();
    }

    function endDrag() {
      if (!isDraggingMap || !mapWrapper) return;
      isDraggingMap = false;
      mapWrapper.style.cursor = 'grab';
    }

    mapWrapper.addEventListener('mousedown', handleMouseDown);
    mapWrapper.addEventListener('touchstart', handleTouchStart, { passive: false });

    if (!dragListenersAttached) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', endDrag);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', endDrag);
      window.addEventListener('touchcancel', endDrag);
      dragListenersAttached = true;
    }

    if (mapResizeHandler) {
      window.removeEventListener('resize', mapResizeHandler);
    }
    mapResizeHandler = () => updateMapWrapperSize({ preserveScroll: true });
    window.addEventListener('resize', mapResizeHandler);

    mapInitialized = false;
    updateMapWrapperSize({ preserveScroll: false });
    renderTextMap();

    const legendTitle = document.createElement('h4');
    legendTitle.textContent = 'Legend';
    mapSection.appendChild(legendTitle);

    legendList = document.createElement('ul');
    mapSection.appendChild(legendList);

    container.appendChild(mapSection);
    lastSeason = store.time.season;
    renderTextMap();
  }

  timeBanner = document.createElement('div');
  timeBanner.id = 'time-banner';
  timeBanner.style.marginTop = '12px';
  timeBanner.style.fontWeight = 'bold';
  container.appendChild(timeBanner);

  const ordersSection = document.createElement('section');
  ordersSection.id = 'orders-section';
  const ordersTitle = document.createElement('h3');
  ordersTitle.textContent = 'Orders Board';
  ordersSection.appendChild(ordersTitle);

  const ordersBlurb = document.createElement('p');
  ordersBlurb.textContent = 'Queue hunting, gathering, crafting, building, or combat patrols. Press Start to carry them out until something demands your attention.';
  ordersSection.appendChild(ordersBlurb);

  buildOrderForm(ordersSection);

  ordersList = document.createElement('div');
  ordersList.id = 'orders-list';
  ordersList.style.marginTop = '8px';
  ordersSection.appendChild(ordersList);

  const controlsRow = document.createElement('div');
  controlsRow.style.display = 'flex';
  controlsRow.style.gap = '8px';
  controlsRow.style.marginTop = '8px';

  startBtn = document.createElement('button');
  startBtn.textContent = 'Start';
  startBtn.addEventListener('click', processOrderCycle);
  controlsRow.appendChild(startBtn);

  const clearBtn = document.createElement('button');
  clearBtn.textContent = 'Clear Completed';
  clearBtn.addEventListener('click', () => {
    clearCompletedOrders();
    updateInventoryExpectations();
    render();
  });
  controlsRow.appendChild(clearBtn);

  ordersSection.appendChild(controlsRow);

  container.appendChild(ordersSection);

  inventoryPanel = document.createElement('div');
  inventoryPanel.id = 'inventory';
  inventoryPanel.style.marginTop = '12px';
  container.appendChild(inventoryPanel);

  const eventSection = document.createElement('section');
  eventSection.id = 'event-log';
  eventSection.style.marginTop = '12px';
  const eventTitle = document.createElement('h3');
  eventTitle.textContent = 'Recent Events';
  eventSection.appendChild(eventTitle);
  eventLogList = document.createElement('ul');
  eventSection.appendChild(eventLogList);
  container.appendChild(eventSection);

  container.style.display = 'block';
  updateInventoryExpectations();
  render();
}

export function updateGameUI() {
  render();
}
