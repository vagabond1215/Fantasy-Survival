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
import { createMapView } from './mapView.js';
import {
  evaluateBuilding,
  beginConstruction,
  getBuildings,
  getBuildingType,
  recordBuildingProgress,
  recordResourceConsumption,
  markBuildingComplete,
  getAllBuildingTypes
} from './buildings.js';
import { getResourceIcon } from './icons.js';

const LEGEND_LABELS = {
  water: 'Water',
  open: 'Open Land',
  forest: 'Forest',
  ore: 'Ore Deposits'
};

const ENEMY_EVENT_CHANCE_PER_HOUR = 0.05;

let mapView = null;
let lastSeason = null;
let ordersList = null;
let inventoryPanel = null;
let eventLogList = null;
let timeBanner = null;
let startBtn = null;
let buildOptionsContainer = null;
let projectList = null;
let completedList = null;
let lockedList = null;

function renderTextMap() {
  const loc = allLocations()[0];
  if (!loc || !mapView) return;
  mapView.setMap(loc.map);
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

      const nameCell = document.createElement('td');
      const iconInfo = getResourceIcon(item.id);
      if (iconInfo) {
        const iconSpan = document.createElement('span');
        iconSpan.textContent = iconInfo.icon;
        iconSpan.title = iconInfo.label;
        iconSpan.setAttribute('role', 'img');
        iconSpan.setAttribute('aria-label', iconInfo.label);
        nameCell.appendChild(iconSpan);
      } else {
        nameCell.textContent = item.id;
      }

      const qtyCell = document.createElement('td');
      qtyCell.textContent = quantity;

      const expectedCell = document.createElement('td');
      expectedCell.textContent = expectedText;

      tr.appendChild(nameCell);
      tr.appendChild(qtyCell);
      tr.appendChild(expectedCell);
      table.appendChild(tr);
    });
  }
  inventoryPanel.appendChild(table);
}

function formatSigned(value = 0) {
  const rounded = Math.round(value * 10) / 10;
  if (rounded > 0) return `+${rounded}`;
  return `${rounded}`;
}

function createInfoLine(label, content) {
  const line = document.createElement('p');
  const strong = document.createElement('strong');
  strong.textContent = `${label}: `;
  line.appendChild(strong);
  if (content instanceof Node) {
    line.appendChild(content);
  } else {
    line.appendChild(document.createTextNode(content));
  }
  return line;
}

function createResourceBadges(resources = {}) {
  const entries = Object.entries(resources).filter(([, amount]) => amount && amount !== 0);
  const wrapper = document.createElement('span');
  if (!entries.length) {
    wrapper.textContent = 'None';
    return wrapper;
  }
  entries.forEach(([name, amount], index) => {
    const badge = document.createElement('span');
    badge.style.display = 'inline-flex';
    badge.style.alignItems = 'center';
    badge.style.gap = '4px';
    badge.style.marginRight = '8px';
    const rounded = Math.round(amount * 10) / 10;
    const iconInfo = getResourceIcon(name);
    if (iconInfo) {
      const iconSpan = document.createElement('span');
      iconSpan.textContent = iconInfo.icon;
      iconSpan.title = iconInfo.label;
      iconSpan.setAttribute('role', 'img');
      iconSpan.setAttribute('aria-label', iconInfo.label);
      badge.appendChild(iconSpan);
      const qty = document.createElement('span');
      qty.textContent = `×${rounded}`;
      badge.appendChild(qty);
    } else {
      badge.textContent = `${rounded} ${name}`;
    }
    wrapper.appendChild(badge);
    if (index === entries.length - 1) {
      badge.style.marginRight = '0';
    }
  });
  return wrapper;
}

function describeEffects(effects = {}) {
  const lines = [];
  const simpleKeys = [
    ['occupancy', value => `Occupancy ${formatSigned(value)}`],
    ['comfort', value => `Comfort ${formatSigned(value)}`],
    ['survivability', value => `Survivability ${formatSigned(value)}`],
    ['appeal', value => `Appeal ${formatSigned(value)}`],
    ['safety', value => `Safety ${formatSigned(value)}`],
    ['maxWorkers', value => `Supports ${value} workers`]
  ];
  simpleKeys.forEach(([key, formatter]) => {
    if (effects[key]) lines.push(formatter(effects[key]));
  });
  if (effects.supply) {
    Object.entries(effects.supply).forEach(([name, amount]) => {
      lines.push(`Supply ${name} ${formatSigned(amount)}`);
    });
  }
  if (effects.demand) {
    Object.entries(effects.demand).forEach(([name, amount]) => {
      lines.push(`Demand ${name} ${formatSigned(amount)}`);
    });
  }
  if (effects.capacity) {
    Object.entries(effects.capacity).forEach(([name, amount]) => {
      lines.push(`Capacity ${name} ${formatSigned(amount)}`);
    });
  }
  if (effects.storage) {
    Object.entries(effects.storage).forEach(([name, amount]) => {
      lines.push(`Storage ${name} ${formatSigned(amount)}`);
    });
  }
  if (effects.unlocks) {
    const unlocks = Array.isArray(effects.unlocks) ? effects.unlocks : [effects.unlocks];
    lines.push(`Unlocks: ${unlocks.join(', ')}`);
  }
  return lines;
}

function createBuildCard(type, info) {
  const card = document.createElement('article');
  card.className = 'build-card';
  card.style.border = '1px solid var(--map-border)';
  card.style.padding = '8px';
  card.style.borderRadius = '6px';
  card.style.background = 'var(--map-bg)';
  card.style.color = 'var(--text-color)';

  const title = document.createElement('h4');
  title.textContent = `${type.icon ? `${type.icon} ` : ''}${type.name}`;
  card.appendChild(title);

  if (type.description) {
    const desc = document.createElement('p');
    desc.textContent = type.description;
    card.appendChild(desc);
  }

  card.appendChild(createInfoLine('Labor', `${type.stats.totalLaborHours} worker-hours`));
  card.appendChild(createInfoLine('Minimum Builders', type.stats.minBuilders));
  card.appendChild(createInfoLine('Resources', createResourceBadges(type.stats.totalResources)));

  const effectLines = describeEffects(type.effects);
  if (effectLines.length) {
    const effectTitle = document.createElement('p');
    effectTitle.innerHTML = '<strong>Effects:</strong>';
    card.appendChild(effectTitle);
    const list = document.createElement('ul');
    effectLines.forEach(line => {
      const li = document.createElement('li');
      li.textContent = line;
      list.appendChild(li);
    });
    card.appendChild(list);
  }

  if (type.stats.components?.length) {
    const details = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = 'Core components';
    details.appendChild(summary);
    type.stats.components.forEach(component => {
      const section = document.createElement('div');
      section.style.marginBottom = '6px';
      const heading = document.createElement('p');
      heading.innerHTML = `<strong>${component.name}:</strong> ${component.description}`;
      section.appendChild(heading);
      section.appendChild(createInfoLine('Labor', `${component.laborHours} hrs @ ≥${component.minBuilders} builders`));
      section.appendChild(createInfoLine('Resources', createResourceBadges(component.resources)));
      details.appendChild(section);
    });
    card.appendChild(details);
  }

  if (type.stats.addons?.length) {
    const addonDetails = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = 'Optional upgrades';
    addonDetails.appendChild(summary);
    type.stats.addons.forEach(addon => {
      const section = document.createElement('div');
      section.style.marginBottom = '6px';
      const heading = document.createElement('p');
      heading.innerHTML = `<strong>${addon.name}:</strong> ${addon.description}`;
      section.appendChild(heading);
      section.appendChild(createInfoLine('Labor', `${addon.laborHours} hrs @ ≥${addon.minBuilders} builders`));
      if (addon.effects) {
        const addonEffects = describeEffects(addon.effects);
        if (addonEffects.length) {
          const list = document.createElement('ul');
          addonEffects.forEach(line => {
            const li = document.createElement('li');
            li.textContent = line;
            list.appendChild(li);
          });
          section.appendChild(list);
        }
      }
      section.appendChild(createInfoLine('Resources', createResourceBadges(addon.resources)));
      addonDetails.appendChild(section);
    });
    card.appendChild(addonDetails);
  }

  const missingResources = info.resourceStatus?.missing || [];
  if (missingResources.length) {
    const deficits = Object.fromEntries(
      missingResources.map(entry => [entry.name, entry.required - entry.available])
    );
    const deficitLine = createInfoLine('Needed', createResourceBadges(deficits));
    card.appendChild(deficitLine);
  }

  const buildBtn = document.createElement('button');
  buildBtn.textContent = `Build ${type.name}`;
  buildBtn.disabled = !info.hasResources;
  if (!info.hasResources) {
    buildBtn.title = 'Gather more resources to begin construction.';
  }
  buildBtn.addEventListener('click', () => {
    try {
      const { order } = beginConstruction(type.id, { workers: type.stats.minBuilders });
      queueOrder(order);
      logEvent(`Construction started on the ${type.name}.`);
      updateInventoryExpectations();
      render();
    } catch (err) {
      console.warn(err);
      alert(err.message);
    }
  });
  card.appendChild(buildBtn);

  return card;
}

function renderBuildMenu() {
  if (!buildOptionsContainer || !projectList || !completedList || !lockedList) return;

  const entries = getAllBuildingTypes().map(type => ({ type, info: evaluateBuilding(type.id) })).filter(entry => entry.info);

  buildOptionsContainer.innerHTML = '';
  const available = entries.filter(entry => entry.info.unlocked && entry.info.locationOk && entry.info.canBuildMore);
  if (!available.length) {
    const empty = document.createElement('p');
    empty.textContent = 'No structures are currently available to build.';
    buildOptionsContainer.appendChild(empty);
  } else {
    available.forEach(entry => {
      const card = createBuildCard(entry.type, entry.info);
      buildOptionsContainer.appendChild(card);
    });
  }

  projectList.innerHTML = '';
  const projects = getBuildings({ statuses: ['under-construction'] });
  if (!projects.length) {
    const empty = document.createElement('p');
    empty.textContent = 'No projects are currently underway.';
    projectList.appendChild(empty);
  } else {
    const list = document.createElement('ul');
    projects.forEach(project => {
      const type = getBuildingType(project.typeId);
      const li = document.createElement('li');
      const progress = project.totalLaborHours ? Math.round((project.progressHours / project.totalLaborHours) * 100) : 0;
      const worked = Math.round(project.progressHours * 10) / 10;
      const total = Math.round(project.totalLaborHours * 10) / 10;
      li.textContent = `${type?.icon ? `${type.icon} ` : ''}${type?.name || project.typeId} – ${progress}% complete (${worked}/${total} worker-hours, ${project.assignedWorkers} builders)`;
      list.appendChild(li);
    });
    projectList.appendChild(list);
  }

  completedList.innerHTML = '';
  const completed = getBuildings({ statuses: ['completed'] });
  if (!completed.length) {
    const empty = document.createElement('p');
    empty.textContent = 'No completed structures yet.';
    completedList.appendChild(empty);
  } else {
    const list = document.createElement('ul');
    completed.forEach(entry => {
      const type = getBuildingType(entry.typeId);
      const li = document.createElement('li');
      const name = type?.name || entry.typeId;
      li.textContent = `${type?.icon ? `${type.icon} ` : ''}${name}`;
      list.appendChild(li);
    });
    completedList.appendChild(list);
  }

  lockedList.innerHTML = '';
  const blocked = entries.filter(entry => !entry.info.unlocked || !entry.info.locationOk || !entry.info.canBuildMore);
  if (!blocked.length) {
    const empty = document.createElement('p');
    empty.textContent = 'All known structures are available.';
    lockedList.appendChild(empty);
  } else {
    const list = document.createElement('ul');
    blocked.forEach(({ type, info }) => {
      const li = document.createElement('li');
      const name = `${type.icon ? `${type.icon} ` : ''}${type.name}`;
      const reasons = [];
      if (!info.unlocked) {
        reasons.push('Prerequisites not yet met');
      }
      if (info.unlocked && !info.locationOk) {
        const tags = type.requirements?.locationTags?.join(', ') || 'special terrain';
        reasons.push(`Requires terrain with: ${tags}`);
      }
      if (info.unlocked && !info.canBuildMore) {
        reasons.push('Maximum built for now');
      }
      li.textContent = `${name} – ${reasons.join('; ')}`;
      list.appendChild(li);
    });
    lockedList.appendChild(list);
  }
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
  renderBuildMenu();
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
    const isBuilding = active.type === 'building' && active.metadata?.projectId;
    if (isBuilding) {
      const consumption = {};
      Object.entries(delta).forEach(([resource, amount]) => {
        if (!amount) return;
        if (resource === 'construction progress') return;
        addItem(resource, amount);
        if (amount < 0) {
          consumption[resource] = (consumption[resource] || 0) + Math.abs(amount);
        }
      });
      const progressPerWorker = active.metadata?.progressPerWorkerHour ?? 1;
      recordBuildingProgress(active.metadata.projectId, step * active.workers * progressPerWorker);
      if (Object.keys(consumption).length) {
        recordResourceConsumption(active.metadata.projectId, consumption);
      }
    } else {
      Object.entries(delta).forEach(([resource, amount]) => {
        if (!amount) return;
        addItem(resource, amount);
      });
    }

    updateOrder(active.id, {
      remainingHours: Math.max(0, active.remainingHours - step)
    });

    advanceHours(step);

    active = getActiveOrder();
    if (active && active.remainingHours <= 0) {
      updateOrder(active.id, { status: 'completed', remainingHours: 0 });
      if (active.type === 'building' && active.metadata?.projectId) {
        const project = markBuildingComplete(active.metadata.projectId);
        const typeName = active.metadata?.typeName || project?.typeId || 'Building';
        event = `${typeName} completed.`;
      } else {
        event = `${capitalize(active.type)} order completed.`;
      }
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

    mapView = createMapView(mapSection, {
      legendLabels: LEGEND_LABELS,
      showControls: true,
      showLegend: true,
      idPrefix: 'game-map'
    });
    mapView.setMap(loc.map);

    container.appendChild(mapSection);
    lastSeason = store.time.season;
    renderTextMap();
  }

  const buildSection = document.createElement('section');
  buildSection.id = 'build-menu';
  const buildTitle = document.createElement('h3');
  buildTitle.textContent = 'Construction Planner';
  buildSection.appendChild(buildTitle);

  const buildBlurb = document.createElement('p');
  buildBlurb.textContent = 'Plan, upgrade, and review settlement structures. Projects consume materials over time and unlock more sophisticated buildings as the village advances.';
  buildSection.appendChild(buildBlurb);

  buildOptionsContainer = document.createElement('div');
  buildOptionsContainer.id = 'build-options';
  buildOptionsContainer.style.display = 'grid';
  buildOptionsContainer.style.gridTemplateColumns = 'repeat(auto-fit, minmax(260px, 1fr))';
  buildOptionsContainer.style.gap = '12px';
  buildSection.appendChild(buildOptionsContainer);

  const projectHeading = document.createElement('h4');
  projectHeading.textContent = 'Active Projects';
  buildSection.appendChild(projectHeading);

  projectList = document.createElement('div');
  projectList.id = 'build-projects';
  buildSection.appendChild(projectList);

  const completedHeading = document.createElement('h4');
  completedHeading.textContent = 'Completed Structures';
  buildSection.appendChild(completedHeading);

  completedList = document.createElement('div');
  completedList.id = 'completed-buildings';
  buildSection.appendChild(completedList);

  const lockedHeading = document.createElement('h4');
  lockedHeading.textContent = 'Locked or Unavailable';
  buildSection.appendChild(lockedHeading);

  lockedList = document.createElement('div');
  lockedList.id = 'locked-buildings';
  buildSection.appendChild(lockedList);

  container.appendChild(buildSection);

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
