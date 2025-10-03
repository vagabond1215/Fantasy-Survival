import { addItem, setExpectedChange } from './inventory.js';
import {
  advanceDay,
  advanceHours,
  getDayPeriod,
  getMonthName,
  getSeasonDetails,
  getWeatherDetails,
  info as timeInfo,
  isMealTime,
  isNightfall,
  resetToDawn
} from './time.js';
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
let constructionSummaryContainer = null;
let constructionModal = null;
let constructionModalContent = null;
let openConstructionModal = () => {};
let closeConstructionModal = () => {};
let profileDialog = null;
let profileContent = null;
let logDialog = null;
let logContent = null;

export function showConstructionDashboard() {
  openConstructionModal();
}

export function hideConstructionDashboard() {
  closeConstructionModal();
}

function ensureTimeBannerElement() {
  if (!timeBanner) {
    timeBanner = document.createElement('div');
    timeBanner.id = 'time-banner';
    timeBanner.setAttribute('role', 'status');
    timeBanner.setAttribute('aria-live', 'polite');
  }
  if (!timeBanner.parentElement) {
    const content = document.getElementById('content');
    if (content) {
      const gameContainer = document.getElementById('game');
      if (gameContainer && content.contains(gameContainer)) {
        content.insertBefore(timeBanner, gameContainer);
      } else {
        content.appendChild(timeBanner);
      }
    }
  }
  return timeBanner;
}

function createPopupDialog(id, title) {
  const overlay = document.createElement('div');
  overlay.id = id;
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', `${id}-title`);
  Object.assign(overlay.style, {
    position: 'fixed',
    inset: '0',
    display: 'none',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    background: 'rgba(0, 0, 0, 0.65)',
    zIndex: '2000'
  });

  const panel = document.createElement('div');
  panel.tabIndex = -1;
  Object.assign(panel.style, {
    background: 'var(--bg-color)',
    color: 'var(--text-color)',
    borderRadius: '12px',
    padding: '20px',
    maxWidth: 'min(600px, 92vw)',
    width: '100%',
    maxHeight: 'min(640px, 90vh)',
    overflow: 'hidden',
    boxShadow: '0 24px 48px rgba(0, 0, 0, 0.35)'
  });

  const header = document.createElement('div');
  Object.assign(header.style, {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px'
  });

  const heading = document.createElement('h3');
  heading.id = `${id}-title`;
  heading.textContent = title;
  heading.style.margin = '0';
  header.appendChild(heading);

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.textContent = 'Close';
  closeBtn.style.alignSelf = 'flex-start';
  header.appendChild(closeBtn);

  panel.appendChild(header);

  const content = document.createElement('div');
  Object.assign(content.style, {
    marginTop: '12px',
    overflowY: 'auto',
    maxHeight: 'calc(90vh - 160px)'
  });
  panel.appendChild(content);

  const closeDialog = () => {
    overlay.style.display = 'none';
    overlay.setAttribute('aria-hidden', 'true');
    document.removeEventListener('keydown', handleKeydown);
  };

  const openDialog = () => {
    overlay.style.display = 'flex';
    overlay.setAttribute('aria-hidden', 'false');
    document.addEventListener('keydown', handleKeydown);
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() => panel.focus());
    } else {
      setTimeout(() => panel.focus(), 0);
    }
  };

  const handleKeydown = event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeDialog();
    }
  };

  closeBtn.addEventListener('click', () => {
    closeDialog();
  });

  overlay.addEventListener('click', event => {
    if (event.target === overlay) {
      closeDialog();
    }
  });

  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  return { overlay, panel, content, openDialog, closeDialog };
}

function ensureProfileDialog() {
  if (!profileDialog) {
    profileDialog = createPopupDialog('profile-dialog', 'Settlement Profile');
    profileContent = profileDialog.content;
  }
  return profileDialog;
}

function ensureLogDialog() {
  if (!logDialog) {
    logDialog = createPopupDialog('log-dialog', 'Event Log');
    logContent = logDialog.content;
    const intro = document.createElement('p');
    intro.textContent = 'A chronological account of notable happenings within your settlement.';
    logContent.appendChild(intro);
    eventLogList = document.createElement('ul');
    eventLogList.style.listStyle = 'none';
    eventLogList.style.padding = '0';
    eventLogList.style.margin = '0';
    logContent.appendChild(eventLogList);
  }
  return logDialog;
}

function renderTextMap() {
  const loc = allLocations()[0];
  if (!loc || !mapView) return;
  mapView.setMap(loc.map, {
    biomeId: loc.biome,
    seed: loc.map?.seed,
    season: loc.map?.season
  });
}

function formatHour(hour = 0, options = {}) {
  const { separator = ':' } = options;
  const numeric = Number.isFinite(hour) ? Number(hour) : 0;
  const normalized = ((numeric % 24) + 24) % 24;
  let wholeHours = Math.floor(normalized);
  let minutes = Math.round((normalized - wholeHours) * 60);
  if (minutes >= 60) {
    minutes -= 60;
    wholeHours = (wholeHours + 1) % 24;
  }
  const hourText = padNumber(wholeHours);
  const minuteText = padNumber(minutes);
  if (!separator) {
    return `${hourText}${minuteText}`;
  }
  return `${hourText}${separator}${minuteText}`;
}

function padNumber(value, digits = 2) {
  const numeric = Number.isFinite(value) ? Math.trunc(value) : 0;
  const safe = numeric < 0 ? 0 : numeric;
  return String(safe).padStart(digits, '0');
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
    month: t.month,
    year: t.year,
    hour: t.hour,
    season: t.season,
    weather: t.weather
  });
  if (log.length > 30) {
    log.length = 30;
  }
  renderEventLog();
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
    const dayNumber = Number.isFinite(entry.day) ? Math.max(1, Math.floor(entry.day)) : 1;
    const monthName = getMonthName(entry.month ?? 1);
    const yearNumber = Number.isFinite(entry.year) ? Math.floor(entry.year) : 0;
    const descriptorParts = [entry.season, entry.weather].filter(Boolean);
    const descriptor = descriptorParts.length ? ` (${descriptorParts.join(' • ')})` : '';
    const dateText = `${dayNumber} ${monthName} ${yearNumber}`;
    li.textContent = `${dateText}${descriptor} – ${formatHour(entry.hour)} – ${entry.message}`;
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

function ensureConstructionModal() {
  if (constructionModal) return;

  constructionModal = document.createElement('div');
  constructionModal.id = 'construction-dashboard';
  Object.assign(constructionModal.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    right: '0',
    bottom: '0',
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'none',
    alignItems: 'flex-start',
    justifyContent: 'center',
    overflowY: 'auto',
    padding: '40px 16px',
    zIndex: '2000'
  });
  constructionModal.addEventListener('click', event => {
    if (event.target === constructionModal) {
      closeConstructionModal();
    }
  });

  constructionModalContent = document.createElement('div');
  Object.assign(constructionModalContent.style, {
    background: 'var(--menu-bg)',
    color: 'var(--text-color)',
    borderRadius: '8px',
    boxShadow: '0 6px 20px rgba(0, 0, 0, 0.3)',
    maxWidth: '960px',
    width: '100%',
    padding: '24px',
    boxSizing: 'border-box'
  });

  const headerRow = document.createElement('div');
  headerRow.style.display = 'flex';
  headerRow.style.justifyContent = 'space-between';
  headerRow.style.alignItems = 'center';

  const title = document.createElement('h3');
  title.textContent = 'Construction Planner';
  headerRow.appendChild(title);

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.textContent = 'Close';
  closeBtn.addEventListener('click', () => {
    closeConstructionModal();
  });
  headerRow.appendChild(closeBtn);

  constructionModalContent.appendChild(headerRow);

  const buildBlurb = document.createElement('p');
  buildBlurb.textContent = 'Plan, upgrade, and review settlement structures. Projects consume materials over time and unlock more sophisticated buildings as the village advances.';
  constructionModalContent.appendChild(buildBlurb);

  const buildSection = document.createElement('section');
  buildSection.id = 'build-menu';

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

  constructionModalContent.appendChild(buildSection);
  constructionModal.appendChild(constructionModalContent);
  document.body.appendChild(constructionModal);

  closeConstructionModal = () => {
    if (constructionModal) {
      constructionModal.style.display = 'none';
    }
  };

  openConstructionModal = () => {
    ensureConstructionModal();
    renderBuildMenu();
    if (constructionModal) {
      constructionModal.style.display = 'flex';
      constructionModalContent?.scrollTo({ top: 0 });
    }
  };

  closeConstructionModal();
}

function renderConstructionSummary(projects = []) {
  if (!constructionSummaryContainer) return;
  constructionSummaryContainer.innerHTML = '';
  if (!projects.length) {
    const empty = document.createElement('p');
    empty.textContent = 'No structures are currently under construction.';
    constructionSummaryContainer.appendChild(empty);
    return;
  }

  const list = document.createElement('ul');
  list.style.listStyle = 'none';
  list.style.padding = '0';
  list.style.margin = '0';

  projects.forEach(project => {
    const type = getBuildingType(project.typeId);
    const name = type?.name || project.typeId;
    const icon = type?.icon ? `${type.icon} ` : '';
    const totalLabor = project.totalLaborHours || 0;
    const progressHours = Math.min(totalLabor, project.progressHours || 0);
    const progress = totalLabor ? Math.round((progressHours / totalLabor) * 100) : 0;

    const item = document.createElement('li');
    item.style.display = 'flex';
    item.style.flexWrap = 'wrap';
    item.style.gap = '8px';
    item.style.alignItems = 'center';

    const label = document.createElement('span');
    label.textContent = `${icon}${name} ${progress}%`;
    item.appendChild(label);

    const progressHoursRounded = Math.round((progressHours || 0) * 10) / 10;
    const totalLaborRounded = Math.round((totalLabor || 0) * 10) / 10;
    const laborIcon = getResourceIcon('construction progress');
    const laborSymbol = laborIcon?.icon || '🏗️';
    const laborQuote = document.createElement('span');
    laborQuote.style.whiteSpace = 'nowrap';
    laborQuote.textContent = `"${progressHoursRounded} / ${totalLaborRounded} ${laborSymbol}"`;
    item.appendChild(laborQuote);

    const required = project.requiredResources || {};
    const consumed = project.consumedResources || {};
    const resourceNames = Object.keys(required);

    if (resourceNames.length) {
      resourceNames.forEach(resource => {
        const total = required[resource] || 0;
        const used = Math.min(total, consumed[resource] || 0);
        const iconInfo = getResourceIcon(resource);
        const iconSymbol = iconInfo?.icon || resource;
        const usedRounded = Math.round((used || 0) * 10) / 10;
        const totalRounded = Math.round((total || 0) * 10) / 10;
        const quote = document.createElement('span');
        quote.style.whiteSpace = 'nowrap';
        quote.textContent = `"${usedRounded} / ${totalRounded} ${iconSymbol}"`;
        item.appendChild(quote);
      });
    } else {
      const note = document.createElement('span');
      note.textContent = '(No material requirements)';
      item.appendChild(note);
    }

    list.appendChild(item);
  });

  constructionSummaryContainer.appendChild(list);
}

function renderBuildMenu() {
  const projects = getBuildings({ statuses: ['under-construction'] });
  renderConstructionSummary(projects);

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
    map.waterLevel,
    map.viewport
  );
  loc.map = { ...map, ...newMap };
  lastSeason = t.season;
  renderTextMap();
}

function renderTimeBanner() {
  const banner = ensureTimeBannerElement();
  if (!banner) return;
  banner.innerHTML = '';
  const t = timeInfo();
  const seasonDetails = getSeasonDetails(t.season);
  const weatherDetails = getWeatherDetails(t.weather);
  const dayPeriod = getDayPeriod(t.hour);
  const monthName = t.monthName || getMonthName(t.month);
  const dayNumber = Number.isFinite(t.day) ? Math.max(1, Math.floor(t.day)) : 1;
  const yearNumber = Number.isFinite(t.year) ? Math.floor(t.year) : 0;
  const compactTime = formatHour(t.hour, { separator: '' });
  const readableTime = formatHour(t.hour);
  const monthDisplay = monthName || 'Unknown Month';
  const dateDisplay = [compactTime, dayNumber, monthDisplay, yearNumber]
    .filter(value => value !== null && value !== undefined && `${value}`.trim() !== '')
    .join(' ');

  const chips = [
    {
      icon: dayPeriod.icon,
      text: dateDisplay,
      title: `${dayPeriod.label} at ${readableTime} on ${dayNumber} ${monthDisplay}, Year ${yearNumber}`,
      showText: true
    },
    {
      icon: seasonDetails.icon,
      text: seasonDetails.name,
      title: `${seasonDetails.name} season`,
      showText: false
    },
    {
      icon: weatherDetails.icon,
      text: weatherDetails.name,
      title: `Weather: ${weatherDetails.name}`,
      showText: false
    }
  ];

  chips.forEach(chip => {
    const chipEl = document.createElement('span');
    chipEl.className = 'time-chip';
    if (chip.title) chipEl.title = chip.title;
    if (chip.title || chip.text) {
      chipEl.setAttribute('aria-label', chip.title || chip.text);
    }
    const iconEl = document.createElement('span');
    iconEl.textContent = chip.icon;
    chipEl.appendChild(iconEl);
    const shouldShowText = chip.showText !== false;
    if (shouldShowText && chip.text !== undefined && chip.text !== null && chip.text !== '') {
      const textEl = document.createElement('span');
      textEl.textContent = chip.text;
      chipEl.appendChild(textEl);
    }
    banner.appendChild(chipEl);
  });
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
  hideConstructionDashboard();
  showBackButton(false);
}

export function showProfilePopup() {
  const dialog = ensureProfileDialog();
  if (!profileContent) return;

  profileContent.innerHTML = '';
  const intro = document.createElement('p');
  intro.textContent = 'Key facts about your settlement and its surroundings.';
  profileContent.appendChild(intro);

  const infoGrid = document.createElement('dl');
  Object.assign(infoGrid.style, {
    display: 'grid',
    gridTemplateColumns: 'max-content 1fr',
    columnGap: '12px',
    rowGap: '6px',
    margin: '0'
  });

  const addEntry = (label, value) => {
    if (value === undefined || value === null || value === '') return;
    const dt = document.createElement('dt');
    dt.textContent = label;
    dt.style.fontWeight = '600';
    dt.style.margin = '0';
    const dd = document.createElement('dd');
    dd.textContent = value;
    dd.style.margin = '0';
    infoGrid.appendChild(dt);
    infoGrid.appendChild(dd);
  };

  const loc = allLocations()[0];
  const biomeName = loc?.biome ? getBiome(loc.biome)?.name || loc.biome : 'Uncharted Region';
  addEntry('Biome', biomeName);

  if (loc?.map) {
    const cols = loc.map.tiles?.[0]?.length || 0;
    const rows = loc.map.tiles?.length || 0;
    if (cols && rows) {
      addEntry('Survey Window', `${cols} × ${rows} tiles`);
    }
    if (loc.map.seed) {
      addEntry('Map Seed', loc.map.seed);
    }
    const originX = loc.map.xStart ?? 0;
    const originY = loc.map.yStart ?? 0;
    addEntry('Survey Origin', `${originX}, ${originY}`);
  }

  const t = timeInfo();
  addEntry('Season', `${t.season} (Day ${t.day})`);
  addEntry('Local Time', formatHour(t.hour));
  addEntry('Difficulty', capitalize(store.difficulty || 'normal'));
  const population = store.people?.size ?? 0;
  addEntry('Population', `${population} settlers`);

  const completedStructures = getBuildings({ statuses: ['completed'] }).length;
  const inProgress = getBuildings({ statuses: ['under-construction'] }).length;
  addEntry('Completed Structures', completedStructures);
  addEntry('Projects Underway', inProgress);

  profileContent.appendChild(infoGrid);

  if (loc?.features?.length) {
    const featureTitle = document.createElement('h4');
    featureTitle.textContent = 'Notable Features';
    featureTitle.style.marginBottom = '8px';
    featureTitle.style.marginTop = '16px';
    profileContent.appendChild(featureTitle);

    const featureList = document.createElement('ul');
    featureList.style.margin = '0';
    featureList.style.paddingLeft = '20px';
    loc.features.forEach(feature => {
      const li = document.createElement('li');
      li.textContent = feature;
      featureList.appendChild(li);
    });
    profileContent.appendChild(featureList);
  } else {
    const noFeatures = document.createElement('p');
    noFeatures.textContent = 'No notable features have been catalogued yet.';
    noFeatures.style.marginTop = '16px';
    profileContent.appendChild(noFeatures);
  }

  dialog.openDialog();
}

export function showLogPopup() {
  const dialog = ensureLogDialog();
  renderEventLog();
  dialog.openDialog();
}

export function initGameUI() {
  const container = document.getElementById('game');
  if (!container) return;
  container.innerHTML = '';
  Object.assign(container.style, {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '16px',
    alignItems: 'flex-start'
  });
  ensureTimeBannerElement();

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
        store.time.season,
        loc.map.waterLevel,
        loc.map.viewport
      );
      loc.map = { ...loc.map, ...newMap };
    }
    const mapSection = document.createElement('section');
    mapSection.id = 'map-section';
    Object.assign(mapSection.style, {
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      gridColumn: '1 / -1',
      minWidth: '0'
    });

    mapView = createMapView(mapSection, {
      legendLabels: LEGEND_LABELS,
      showControls: true,
      showLegend: true,
      idPrefix: 'game-map',
      fetchMap: ({ xStart, yStart, width, height, seed, season, viewport }) => {
        const baseSeed = seed ?? loc.map?.seed ?? Date.now();
        const baseSeason = season ?? store.time.season;
        return generateColorMap(
          loc.biome,
          baseSeed,
          xStart,
          yStart,
          width,
          height,
          baseSeason,
          loc.map?.waterLevel,
          viewport
        );
      },
      onMapUpdate: updated => {
        loc.map = { ...loc.map, ...updated };
      }
    });
    mapView.setMap(loc.map, {
      biomeId: loc.biome,
      seed: loc.map?.seed,
      season: loc.map?.season
    });

    container.appendChild(mapSection);
    lastSeason = store.time.season;
    renderTextMap();
  }

  ensureConstructionModal();
  closeConstructionModal();

  const summarySection = document.createElement('section');
  summarySection.id = 'construction-summary';
  Object.assign(summarySection.style, {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    gridColumn: '1 / -1',
    minWidth: '0'
  });
  const summaryTitle = document.createElement('h3');
  summaryTitle.textContent = 'Construction Status';
  summarySection.appendChild(summaryTitle);

  constructionSummaryContainer = document.createElement('div');
  constructionSummaryContainer.id = 'construction-summary-list';
  summarySection.appendChild(constructionSummaryContainer);

  container.appendChild(summarySection);

  const ordersSection = document.createElement('section');
  ordersSection.id = 'orders-section';
  Object.assign(ordersSection.style, {
    gridColumn: '1 / -1',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    minWidth: '0'
  });
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
  Object.assign(inventoryPanel.style, {
    marginTop: '12px',
    gridColumn: '1 / -1',
    minWidth: '0'
  });
  container.appendChild(inventoryPanel);
  container.style.display = 'grid';
  updateInventoryExpectations();
  render();
  if (mapView && typeof mapView.refresh === 'function') {
    mapView.refresh();
  }
}

export function updateGameUI() {
  render();
}
