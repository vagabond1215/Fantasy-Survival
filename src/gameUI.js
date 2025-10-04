import { addItem, setItemFlow, getItem, listInventory } from './inventory.js';
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
import { showBackButton, mountMenuActions } from './menu.js';
import { allLocations } from './location.js';
import { generateColorMap, TERRAIN_SYMBOLS, GRID_DISTANCE_METERS } from './map.js';
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
import { calculateOrderDelta, calculateExpectedInventoryFlows } from './resources.js';
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
import {
  rewardOrderProficiency,
  getProficiencyLevel,
  getProficiencies,
  inferOrderProficiency
} from './proficiencies.js';
import { calculateTravelTime, describeTerrainDifficulty } from './movement.js';
import { performGathering, formatBlockedMessages } from './gathering.js';
import { getUnlockedRecipes, craftRecipe } from './crafting.js';
import { getJobOverview, setJob } from './jobs.js';
import { getCraftTarget, setCraftTarget, listCraftTargets, calculateReservedQuantity } from './craftPlanner.js';
import {
  recordPlantDiscovery,
  recordAnimalDiscovery,
  getHerbariumCatalog,
  getBestiaryCatalog,
  getUnknownLabel
} from './naturalHistory.js';

const LEGEND_LABELS = {
  water: 'Water',
  open: 'Open Land',
  forest: 'Forest',
  ore: 'Ore Deposits'
};

const ENEMY_EVENT_CHANCE_PER_HOUR = 0.05;
const PLAYER_ICON = '🧍';
const PLAYER_MARKER_ID = 'player-marker';
const EVENT_LOG_SUMMARY_LIMIT = 5;

let mapView = null;
let lastSeason = null;
let ordersList = null;
let eventLogList = null;
let eventLogPanel = null;
let eventLogSummaryList = null;
let eventLogPanelButton = null;
let timeBanner = null;
let timeBannerChipsContainer = null;
let timeBannerActionsContainer = null;
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
let playerPanel = null;
let playerPanelContainer = null;
let playerLocationLabel = null;
let playerTerrainLabel = null;
let playerActionList = null;
let inventoryDialog = null;
let inventoryDialogContent = null;
let inventoryTableBody = null;
let inventoryVisible = false;
let jobsDialog = null;
let jobsContent = null;
let craftPlannerDialog = null;
let craftPlannerContent = null;
let herbariumDialog = null;
let herbariumContent = null;
let bestiaryDialog = null;
let bestiaryContent = null;

const MASS_NOUNS = new Set(['wood', 'firewood', 'food', 'water']);

function articleFor(word = '') {
  const trimmed = String(word || '').trim().toLowerCase();
  if (!trimmed) return 'a';
  if (trimmed.startsWith('hour')) return 'an';
  const first = trimmed[0];
  return ['a', 'e', 'i', 'o', 'u'].includes(first) ? 'an' : 'a';
}

function singularizeWord(word = '') {
  if (!word) return word;
  if (/[^aeiou]ies$/i.test(word)) {
    return word.replace(/ies$/i, 'y');
  }
  if (/(xes|ses|zes|ches|shes)$/i.test(word)) {
    return word.replace(/es$/i, '');
  }
  if (/s$/i.test(word) && !/ss$/i.test(word)) {
    return word.replace(/s$/i, '');
  }
  return word;
}

function singularizeResourceName(name = '') {
  const trimmed = String(name || '').trim();
  if (!trimmed) return '';
  const parts = trimmed.split(/\s+/);
  const last = parts.pop();
  const singularLast = singularizeWord(last);
  parts.push(singularLast);
  return parts.join(' ');
}

function formatResourceNeed(name, amount) {
  const deficit = Math.max(0, Math.ceil(amount || 0));
  if (!deficit) return null;
  const resourceName = String(name || '').trim() || 'resource';
  if (deficit === 1) {
    const lower = resourceName.toLowerCase();
    if (MASS_NOUNS.has(lower)) {
      return `1 more ${resourceName}`;
    }
    const singular = singularizeResourceName(resourceName);
    return `${articleFor(singular)} ${singular}`;
  }
  return `${deficit} more ${resourceName}`;
}

function joinWithAnd(items = []) {
  const filtered = items.filter(Boolean);
  if (!filtered.length) return '';
  if (filtered.length === 1) return filtered[0];
  if (filtered.length === 2) return `${filtered[0]} and ${filtered[1]}`;
  const head = filtered.slice(0, -1).join(', ');
  const tail = filtered[filtered.length - 1];
  return `${head}, and ${tail}`;
}

function formatResourceNeedsMessage(missing = []) {
  if (!Array.isArray(missing) || !missing.length) return '';
  const parts = missing
    .map(entry => {
      const required = Number(entry?.required) || 0;
      const available = Number(entry?.available) || 0;
      const deficit = required - available;
      return formatResourceNeed(entry?.name, deficit);
    })
    .filter(Boolean);
  if (!parts.length) return '';
  const needsText = joinWithAnd(parts);
  return needsText ? `You need ${needsText}.` : '';
}

function applyCodexTableStyles(table) {
  if (!table) return;
  table.style.width = '100%';
  table.style.borderCollapse = 'collapse';
  table.style.marginTop = '6px';
  table.style.fontSize = '13px';
  table.querySelectorAll('th').forEach(cell => {
    cell.style.textAlign = 'left';
    cell.style.padding = '6px 8px';
    cell.style.borderBottom = '1px solid var(--map-border, #ccc)';
    cell.style.position = 'sticky';
    cell.style.top = '0';
    cell.style.background = 'var(--menu-bg)';
    cell.style.zIndex = '1';
  });
  table.querySelectorAll('td').forEach(cell => {
    cell.style.padding = '6px 8px';
    cell.style.borderBottom = '1px solid rgba(128, 128, 128, 0.25)';
    cell.style.verticalAlign = 'top';
  });
}

export function showConstructionDashboard() {
  openConstructionModal();
}

export function hideConstructionDashboard() {
  closeConstructionModal();
}

function getActiveLocation() {
  return allLocations()[0] || null;
}

function describeTerrainType(type) {
  if (!type) return 'Uncharted ground';
  return LEGEND_LABELS[type] || type;
}

function hasTool(name) {
  const record = getItem(name);
  return Number.isFinite(record.quantity) && record.quantity > 0;
}

function hasAnyTool(names = []) {
  return names.some(name => hasTool(name));
}

function ensurePlayerState(locationId = null) {
  if (!store.player || typeof store.player !== 'object') {
    store.player = { locationId: locationId ?? null, x: 0, y: 0 };
  }
  if (locationId && store.player.locationId !== locationId) {
    store.player.locationId = locationId;
  } else if (!store.player.locationId && locationId) {
    store.player.locationId = locationId;
  }
  if (!Number.isFinite(store.player.x)) store.player.x = 0;
  if (!Number.isFinite(store.player.y)) store.player.y = 0;
  store.player.x = Math.trunc(store.player.x);
  store.player.y = Math.trunc(store.player.y);
  return store.player;
}

function clampToMapBounds(location, coords = {}) {
  const loc = location || getActiveLocation();
  const map = loc?.map;
  const xStart = Number.isFinite(map?.xStart) ? Math.trunc(map.xStart) : 0;
  const yStart = Number.isFinite(map?.yStart) ? Math.trunc(map.yStart) : 0;
  const width = Math.max(1, Math.trunc(map?.width || map?.tiles?.[0]?.length || 1));
  const height = Math.max(1, Math.trunc(map?.height || map?.tiles?.length || 1));
  const minX = xStart;
  const minY = yStart;
  const maxX = minX + width - 1;
  const maxY = minY + height - 1;
  const x = Number.isFinite(coords.x) ? Math.trunc(coords.x) : minX;
  const y = Number.isFinite(coords.y) ? Math.trunc(coords.y) : minY;
  return {
    x: Math.min(maxX, Math.max(minX, x)),
    y: Math.min(maxY, Math.max(minY, y))
  };
}

function getTerrainTypeAt(location, x, y) {
  if (!location?.map?.types) return null;
  const xStart = Number.isFinite(location.map.xStart) ? Math.trunc(location.map.xStart) : 0;
  const yStart = Number.isFinite(location.map.yStart) ? Math.trunc(location.map.yStart) : 0;
  const col = Math.trunc(x) - xStart;
  const row = Math.trunc(y) - yStart;
  if (row < 0 || col < 0) return null;
  const rowData = location.map.types[row];
  if (!rowData || col >= rowData.length) return null;
  return rowData[col];
}

function getPlayerTerrain() {
  const loc = getActiveLocation();
  if (!loc) return null;
  const player = ensurePlayerState(loc.id);
  return getTerrainTypeAt(loc, player.x, player.y);
}

function determinePlayerActions({ terrain, season, weather, biome }) {
  const actions = [];
  const seasonName = season || store.time.season || '';
  const weatherName = weather || store.time.weather || '';
  const coldSeason = /Frost/i.test(seasonName);
  const wetWeather = /(Rain|Storm|Snow|Sleet)/i.test(weatherName);
  const caution = wetWeather ? ' Weather may slow progress.' : '';

  actions.push({
    id: 'survey',
    label: 'Survey area',
    description: `Study the surroundings for opportunities and hazards.${caution}`
  });

  if (terrain === 'forest') {
    if (hasAnyTool(['stone hand axe', 'stone knife'])) {
      actions.push({
        id: 'gather-wood',
        label: 'Gather wood',
        description: `Use your tools to cut timber from the forest.${wetWeather ? ' Damp wood will need drying.' : ''}`
      });
    } else {
      actions.push({
        id: 'collect-branches',
        label: 'Collect branches',
        description: 'Gather fallen branches and twigs for kindling.'
      });
    }
    if (!coldSeason) {
      actions.push({
        id: 'forage-forest',
        label: 'Forage for herbs',
        description: `Search for edible shoots and mushrooms beneath the canopy.${caution}`
      });
    }
    if (hasAnyTool(['bow'])) {
      actions.push({
        id: 'hunt-forest',
        label: 'Hunt game',
        description: `Track deer or boar sheltering in the woods.${wetWeather ? ' Muddy ground makes tracking tricky.' : ''}`
      });
    }
  } else if (terrain === 'open') {
    if (!coldSeason) {
      actions.push({
        id: 'forage-open',
        label: 'Forage wild grains',
        description: `Gather seeds and berries from the open meadows.${caution}`
      });
    } else {
      actions.push({
        id: 'glean-winter',
        label: 'Gather winter grasses',
        description: 'Collect hardy grasses and roots poking through the frost.'
      });
    }
    if (hasAnyTool(['bow'])) {
      actions.push({
        id: 'hunt-open',
        label: 'Hunt small game',
        description: `Use your bow to stalk hares darting across the plain.${caution}`
      });
    }
  } else if (terrain === 'water') {
    if (hasAnyTool(['stone hand axe', 'stone knife'])) {
      actions.push({
        id: 'gather-reeds',
        label: 'Gather reeds',
        description: `Harvest reeds for shelter and weaving projects.${caution}`
      });
    }
    actions.push({
      id: 'scavenge-shore',
      label: 'Scavenge shoreline',
      description: 'Inspect the waterline for driftwood, shellfish, and other useful finds.'
    });
  } else if (terrain === 'ore') {
    actions.push({
      id: 'survey-ore',
      label: 'Survey ore deposit',
      description: 'Mark promising veins and note the surrounding stone.'
    });
    if (hasAnyTool(['stone hand axe'])) {
      actions.push({
        id: 'chip-ore',
        label: 'Chip ore sample',
        description: `Break loose a sample for study.${caution}`
      });
    }
  }

  const unique = new Map();
  actions.forEach(action => {
    if (!unique.has(action.id)) {
      unique.set(action.id, action);
    }
  });

  return [...unique.values()];
}

function ensurePlayerPanel(parent) {
  if (!parent) return null;
  if (!playerPanel) {
    playerPanel = document.createElement('section');
    playerPanel.id = 'player-panel';
    Object.assign(playerPanel.style, {
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      border: '1px solid var(--map-border, #ccc)',
      borderRadius: '12px',
      padding: '12px',
      background: 'var(--bg-color, #fff)'
    });
    const title = document.createElement('h4');
    title.textContent = 'Explorer Position';
    title.style.margin = '0';
    playerPanel.appendChild(title);

    playerLocationLabel = document.createElement('p');
    playerLocationLabel.style.margin = '0';
    playerPanel.appendChild(playerLocationLabel);

    playerTerrainLabel = document.createElement('p');
    playerTerrainLabel.style.margin = '0';
    playerPanel.appendChild(playerTerrainLabel);

    const actionHeader = document.createElement('h5');
    actionHeader.textContent = 'Available actions';
    actionHeader.style.margin = '12px 0 4px';
    actionHeader.style.fontSize = '1rem';
    actionHeader.style.fontWeight = '600';
    playerPanel.appendChild(actionHeader);

    playerActionList = document.createElement('div');
    playerActionList.style.display = 'flex';
    playerActionList.style.flexWrap = 'wrap';
    playerActionList.style.gap = '8px';
    playerActionList.style.margin = '0';
    playerPanel.appendChild(playerActionList);
  }

  if (playerPanel.parentElement !== parent) {
    playerPanel.parentElement?.removeChild(playerPanel);
    parent.appendChild(playerPanel);
  }

  return playerPanel;
}

function updatePlayerMarker() {
  if (!mapView || typeof mapView.setMarkers !== 'function') return;
  const loc = getActiveLocation();
  if (!loc) {
    mapView.setMarkers([]);
    return;
  }
  const player = ensurePlayerState(loc.id);
  const clamped = clampToMapBounds(loc, player);
  player.x = clamped.x;
  player.y = clamped.y;
  if (player.locationId !== loc.id) {
    player.locationId = loc.id;
  }
  mapView.setMarkers([
    {
      id: PLAYER_MARKER_ID,
      x: player.x,
      y: player.y,
      icon: PLAYER_ICON,
      className: 'map-marker--player',
      label: 'Explorer position',
      emphasis: false
    }
  ]);
}

function renderPlayerPanel() {
  if (playerPanelContainer) {
    ensurePlayerPanel(playerPanelContainer);
  }
  if (!playerPanel) return;
  const loc = getActiveLocation();
  const player = loc ? ensurePlayerState(loc.id) : ensurePlayerState();
  if (!loc) {
    if (playerLocationLabel) playerLocationLabel.textContent = 'No active expedition.';
    if (playerTerrainLabel) playerTerrainLabel.textContent = '';
    if (playerActionList) playerActionList.replaceChildren();
    return;
  }

  const clamped = clampToMapBounds(loc, player);
  player.x = clamped.x;
  player.y = clamped.y;

  if (playerLocationLabel) {
    playerLocationLabel.textContent = `Position: (${player.x}, ${player.y})`;
  }

  const terrain = getPlayerTerrain();
  const terrainLabel = describeTerrainType(terrain);
  const time = timeInfo();
  if (playerTerrainLabel) {
    playerTerrainLabel.textContent = `Terrain: ${terrainLabel} — ${time.season}, ${time.weather}`;
  }

  if (playerActionList) {
    playerActionList.replaceChildren();
    const actions = determinePlayerActions({
      terrain,
      season: time.season,
      weather: time.weather,
      biome: loc.biome
    });
    if (!actions.length) {
      const empty = document.createElement('span');
      empty.textContent = 'No obvious actions available here.';
      playerActionList.appendChild(empty);
    } else {
      actions.forEach(action => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = action.label;
        btn.title = action.description;
        btn.dataset.actionId = action.id;
        btn.addEventListener('click', () => {
          handlePlayerAction(action);
        });
        playerActionList.appendChild(btn);
      });
    }
  }
}

function centerOnPlayer(options = {}) {
  if (!mapView || typeof mapView.setFocus !== 'function') return;
  const loc = getActiveLocation();
  const player = loc ? ensurePlayerState(loc.id) : ensurePlayerState();
  mapView.setFocus({ x: player.x, y: player.y }, options);
}

function handlePlayerAction(action) {
  const loc = getActiveLocation();
  const player = loc ? ensurePlayerState(loc.id) : ensurePlayerState();
  const terrainLabel = describeTerrainType(getPlayerTerrain());
  logEvent(`${action.label} selected at (${player.x}, ${player.y}) within the ${terrainLabel}. ${action.description}`);
}

function handlePlayerNavigate({ dx = 0, dy = 0, recenter = false } = {}) {
  const loc = getActiveLocation();
  if (!loc) return;
  const player = ensurePlayerState(loc.id);
  if (recenter) {
    centerOnPlayer();
    return;
  }
  if (!dx && !dy) return;
  const next = clampToMapBounds(loc, { x: player.x + dx, y: player.y + dy });
  if (next.x === player.x && next.y === player.y) {
    logEvent('The survey does not extend further in that direction.');
    centerOnPlayer();
    return;
  }
  const currentTerrain = getTerrainTypeAt(loc, player.x, player.y) || 'open';
  const nextTerrain = getTerrainTypeAt(loc, next.x, next.y) || currentTerrain;
  const distanceMeters = Math.hypot(next.x - player.x, next.y - player.y) * GRID_DISTANCE_METERS;
  const swimmingLevel = getProficiencyLevel('swimming');
  const travel = calculateTravelTime({
    fromTerrain: currentTerrain,
    toTerrain: nextTerrain,
    distance: distanceMeters,
    swimmingLevel
  });
  if (travel.blocked) {
    const reason = travel.reason || describeTerrainDifficulty(nextTerrain);
    logEvent(`Unable to cross the ${describeTerrainType(nextTerrain).toLowerCase()}. ${reason}`);
    return;
  }

  player.x = next.x;
  player.y = next.y;
  player.locationId = loc.id;
  const durationHours = Math.max(travel.hours, 0.02);
  const distanceText = formatDistance(distanceMeters);
  const durationText = formatDuration(durationHours);
  const terrainLabel = describeTerrainType(nextTerrain);
  const detail = travel.reason || describeTerrainDifficulty(nextTerrain);

  advanceHours(durationHours);
  centerOnPlayer();
  updatePlayerMarker();
  render();
  logEvent(`Traveled ${distanceText} into the ${terrainLabel.toLowerCase()} in ${durationText}. ${detail}`.trim());
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
  if (!timeBannerChipsContainer) {
    timeBannerChipsContainer = document.createElement('div');
    timeBannerChipsContainer.className = 'time-chip-group';
  }
  if (timeBannerChipsContainer.parentElement !== timeBanner) {
    if (timeBannerChipsContainer.parentElement) {
      timeBannerChipsContainer.parentElement.removeChild(timeBannerChipsContainer);
    }
    timeBanner.insertBefore(timeBannerChipsContainer, timeBanner.firstChild);
  }
  if (!timeBannerActionsContainer) {
    timeBannerActionsContainer = document.createElement('div');
    timeBannerActionsContainer.className = 'time-actions';
  }
  if (timeBannerActionsContainer.parentElement !== timeBanner) {
    if (timeBannerActionsContainer.parentElement) {
      timeBannerActionsContainer.parentElement.removeChild(timeBannerActionsContainer);
    }
    timeBanner.appendChild(timeBannerActionsContainer);
  }
  mountMenuActions(timeBannerActionsContainer);
  return timeBanner;
}

function ensureEventLogPanel() {
  if (!eventLogPanel) {
    eventLogPanel = document.createElement('section');
    eventLogPanel.id = 'event-log-panel';
    eventLogPanel.setAttribute('aria-live', 'polite');
    Object.assign(eventLogPanel.style, {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      padding: '12px 16px',
      background: 'var(--menu-bg)',
      border: '1px solid var(--map-border)',
      borderRadius: '12px',
      gridColumn: '1 / -1',
      minWidth: '0'
    });

    const headerRow = document.createElement('div');
    Object.assign(headerRow.style, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px'
    });

    const title = document.createElement('h3');
    title.textContent = 'Recent Events';
    title.style.margin = '0';
    headerRow.appendChild(title);

    eventLogPanelButton = document.createElement('button');
    eventLogPanelButton.type = 'button';
    eventLogPanelButton.textContent = 'Open Full Log';
    Object.assign(eventLogPanelButton.style, {
      borderRadius: '8px',
      border: '1px solid var(--map-border)',
      background: 'var(--action-button-bg)',
      color: 'var(--action-button-text)',
      padding: '6px 12px',
      cursor: 'pointer',
      boxShadow: 'var(--action-button-shadow)',
      alignSelf: 'flex-start'
    });
    eventLogPanelButton.disabled = true;
    eventLogPanelButton.addEventListener('click', () => {
      showLogPopup();
    });
    headerRow.appendChild(eventLogPanelButton);

    eventLogPanel.appendChild(headerRow);

    const intro = document.createElement('p');
    intro.textContent = 'Stay informed about your settlers\' latest discoveries and efforts.';
    intro.style.margin = '0';
    intro.style.fontSize = '13px';
    intro.style.opacity = '0.85';
    eventLogPanel.appendChild(intro);

    eventLogSummaryList = document.createElement('ul');
    eventLogSummaryList.id = 'event-log-summary-list';
    Object.assign(eventLogSummaryList.style, {
      listStyle: 'none',
      padding: '0',
      margin: '0',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px'
    });
    eventLogPanel.appendChild(eventLogSummaryList);
  }

  if (!eventLogPanel.parentElement) {
    const content = document.getElementById('content');
    if (content) {
      const gameContainer = document.getElementById('game');
      if (gameContainer && content.contains(gameContainer)) {
        content.insertBefore(eventLogPanel, gameContainer);
      } else {
        content.appendChild(eventLogPanel);
      }
    }
  }

  return eventLogPanel;
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

function ensureJobsDialog() {
  if (!jobsDialog) {
    jobsDialog = createPopupDialog('jobs-dialog', 'Assign Jobs');
    jobsContent = jobsDialog.content;
  }
  return jobsDialog;
}

function renderJobsDialog() {
  const dialog = ensureJobsDialog();
  if (!jobsContent || !dialog) return;

  const overview = getJobOverview();
  jobsContent.innerHTML = '';

  const summary = document.createElement('p');
  summary.textContent = `Adults ready to work: ${overview.adults}. Unassigned laborers: ${overview.laborer}.`;
  jobsContent.appendChild(summary);

  const helper = document.createElement('p');
  helper.textContent =
    'Assign settlers to focused duties. Laborers without assignments will handle general chores. Hover or long-press a job to view details.';
  helper.style.fontSize = '13px';
  helper.style.opacity = '0.82';
  helper.style.marginTop = '4px';
  jobsContent.appendChild(helper);

  const list = document.createElement('div');
  Object.assign(list.style, {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    marginTop: '12px'
  });
  list.setAttribute('role', 'list');
  jobsContent.appendChild(list);

  overview.assignments.forEach(job => {
    const maxForJob = Math.max(0, overview.adults - (overview.assigned - job.assigned));
    const row = document.createElement('div');
    row.dataset.jobId = job.id;
    row.setAttribute('role', 'listitem');
    Object.assign(row.style, {
      display: 'grid',
      gridTemplateColumns: '1fr auto auto',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 12px',
      borderRadius: '10px',
      border: '1px solid var(--map-border, #ccc)',
      background: 'var(--menu-bg)',
      color: 'var(--text-color)'
    });

    const tooltipParts = [];
    if (job.description) tooltipParts.push(job.description);
    tooltipParts.push(`Assigned ${job.assigned} of ${maxForJob}`);
    tooltipParts.push(`Unassigned laborers: ${overview.laborer}`);
    const tooltip = tooltipParts.join('\n');
    row.title = tooltip;
    row.setAttribute('aria-label', `${job.label}. ${tooltipParts.join('. ')}`);

    const name = document.createElement('span');
    name.textContent = job.label;
    name.style.fontWeight = '600';
    name.style.whiteSpace = 'nowrap';
    name.style.overflow = 'hidden';
    name.style.textOverflow = 'ellipsis';
    row.appendChild(name);

    const count = document.createElement('span');
    count.textContent = String(job.assigned || 0);
    count.style.fontVariantNumeric = 'tabular-nums';
    count.style.justifySelf = 'center';
    row.appendChild(count);

    const controls = document.createElement('div');
    Object.assign(controls.style, {
      display: 'flex',
      gap: '4px'
    });

    const createArrowButton = (symbol, delta, ariaLabel) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = symbol;
      btn.setAttribute('aria-label', ariaLabel);
      Object.assign(btn.style, {
        width: '28px',
        height: '28px',
        borderRadius: '6px',
        border: '1px solid var(--map-border, #999)',
        background: 'var(--menu-bg)',
        cursor: 'pointer'
      });
      btn.addEventListener('click', event => {
        event.preventDefault();
        setJob(job.id, job.assigned + delta);
        renderJobsDialog();
      });
      return btn;
    };

    const decreaseBtn = createArrowButton('▼', -1, `Reduce ${job.label} assignments`);
    const increaseBtn = createArrowButton('▲', 1, `Increase ${job.label} assignments`);
    decreaseBtn.disabled = job.assigned <= 0;
    increaseBtn.disabled = job.assigned >= maxForJob;
    if (decreaseBtn.disabled) {
      decreaseBtn.style.cursor = 'not-allowed';
      decreaseBtn.style.opacity = '0.5';
    }
    if (increaseBtn.disabled) {
      increaseBtn.style.cursor = 'not-allowed';
      increaseBtn.style.opacity = '0.5';
    }
    controls.appendChild(decreaseBtn);
    controls.appendChild(increaseBtn);

    row.appendChild(controls);

    list.appendChild(row);
  });
}

function ensureCraftPlannerDialog() {
  if (!craftPlannerDialog) {
    craftPlannerDialog = createPopupDialog('craft-planner-dialog', 'Craft Planner');
    craftPlannerContent = craftPlannerDialog.content;
  }
  return craftPlannerDialog;
}

function renderCraftPlannerDialog() {
  const dialog = ensureCraftPlannerDialog();
  if (!craftPlannerContent || !dialog) return;

  const availableTools = listAvailableToolNames();
  const unlocked = getUnlockedRecipes({ availableTools });
  const outputMeta = new Map();
  unlocked.forEach(info => {
    Object.entries(info.recipe.outputs || {}).forEach(([name]) => {
      if (!outputMeta.has(name)) {
        outputMeta.set(name, { recipes: new Set() });
      }
      outputMeta.get(name).recipes.add(info.recipe.name || name);
    });
  });
  const existingTargets = listCraftTargets();
  const itemNames = new Set([
    ...outputMeta.keys(),
    ...existingTargets.map(entry => entry.id)
  ]);

  craftPlannerContent.innerHTML = '';

  if (!itemNames.size) {
    const empty = document.createElement('p');
    empty.textContent = 'No craftable goods are available yet.';
    craftPlannerContent.appendChild(empty);
    return;
  }

  const intro = document.createElement('p');
  intro.textContent = 'Set the desired stock for crafted goods. Equipped or held items are ignored automatically.';
  intro.style.fontSize = '13px';
  intro.style.opacity = '0.82';
  craftPlannerContent.appendChild(intro);

  const list = document.createElement('div');
  Object.assign(list.style, {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginTop: '12px'
  });
  craftPlannerContent.appendChild(list);

  Array.from(itemNames)
    .sort((a, b) => a.localeCompare(b))
    .forEach(name => {
      const meta = outputMeta.get(name) || { recipes: new Set() };
      const target = getCraftTarget(name);
      const record = getItem(name);
      const quantity = Number(record.quantity) || 0;
      const reserved = calculateReservedQuantity(name);
      const usable = Math.max(0, Math.round((quantity - reserved) * 10) / 10);
      const reservedDisplay = Math.max(0, Math.round(reserved * 10) / 10);

      const card = document.createElement('div');
      Object.assign(card.style, {
        border: '1px solid var(--map-border, #ccc)',
        borderRadius: '12px',
        padding: '12px',
        background: 'var(--menu-bg)',
        color: 'var(--text-color)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      });

      const header = document.createElement('div');
      Object.assign(header.style, {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        flexWrap: 'wrap'
      });

      const title = document.createElement('h4');
      title.textContent = name.charAt(0).toUpperCase() + name.slice(1);
      title.style.margin = '0';
      header.appendChild(title);

      const controls = document.createElement('div');
      Object.assign(controls.style, {
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      });

      const targetLabel = document.createElement('span');
      targetLabel.textContent = 'Target';
      targetLabel.style.fontWeight = '600';
      controls.appendChild(targetLabel);

      const input = document.createElement('input');
      input.type = 'number';
      input.min = '0';
      input.step = '1';
      input.value = String(target || 0);
      input.style.width = '80px';
      input.setAttribute('aria-label', `Desired stock for ${name}`);
      input.addEventListener('change', () => {
        const value = Number.parseInt(input.value, 10);
        setCraftTarget(name, Number.isFinite(value) ? value : 0);
        renderCraftPlannerDialog();
      });
      controls.appendChild(input);

      const clearBtn = document.createElement('button');
      clearBtn.type = 'button';
      clearBtn.textContent = 'Clear';
      clearBtn.addEventListener('click', () => {
        setCraftTarget(name, 0);
        renderCraftPlannerDialog();
      });
      controls.appendChild(clearBtn);

      header.appendChild(controls);
      card.appendChild(header);

      const stockLine = document.createElement('span');
      stockLine.style.fontSize = '13px';
      stockLine.style.opacity = '0.85';
      stockLine.textContent = `Usable on hand: ${usable} (Reserved: ${reservedDisplay}).`;
      card.appendChild(stockLine);

      if (meta.recipes.size) {
        const producedBy = document.createElement('span');
        producedBy.style.fontSize = '12px';
        producedBy.style.opacity = '0.75';
        producedBy.textContent = `Produced by: ${Array.from(meta.recipes).join(', ')}.`;
        card.appendChild(producedBy);
      }

      list.appendChild(card);
    });
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

function isDialogVisible(dialog) {
  return Boolean(dialog?.overlay && dialog.overlay.style.display !== 'none');
}

function ensureHerbariumDialog() {
  if (!herbariumDialog) {
    herbariumDialog = createPopupDialog('herbarium-dialog', 'Herbarium');
    herbariumContent = herbariumDialog.content;
    if (herbariumContent) {
      const blurb = document.createElement('p');
      blurb.textContent = 'Catalogue of flora identified throughout your travels. Forage to reveal new entries.';
      blurb.style.marginBottom = '8px';
      herbariumContent.appendChild(blurb);
    }
  }
  return herbariumDialog;
}

function renderHerbariumDialog() {
  const dialog = ensureHerbariumDialog();
  if (!herbariumContent || !dialog) return;

  herbariumContent.innerHTML = '';
  const catalog = getHerbariumCatalog();
  if (!catalog.total) {
    const empty = document.createElement('p');
    empty.textContent = 'No flora specimens have been catalogued yet. Forage successfully to add discoveries to your herbarium.';
    herbariumContent.appendChild(empty);
    return;
  }

  const intro = document.createElement('p');
  intro.textContent = `Specimens catalogued: ${catalog.discovered} of ${catalog.total}.`;
  intro.style.marginBottom = '6px';
  herbariumContent.appendChild(intro);

  catalog.sections.forEach(section => {
    const sectionEl = document.createElement('section');
    sectionEl.style.marginTop = '12px';

    const heading = document.createElement('h4');
    heading.textContent = `${section.biomeName} (${section.discoveredCount}/${section.total})`;
    heading.style.margin = '0 0 4px 0';
    sectionEl.appendChild(heading);

    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    ['Specimen', 'Edible Parts', 'Caution', 'Uses'].forEach(label => {
      const th = document.createElement('th');
      th.textContent = label;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    section.entries.forEach(entry => {
      const tr = document.createElement('tr');
      if (!entry.discovered) {
        tr.style.opacity = '0.65';
      }

      const nameCell = document.createElement('td');
      if (entry.discovered) {
        nameCell.textContent = entry.item.name;
        nameCell.style.fontWeight = '600';
      } else {
        nameCell.textContent = getUnknownLabel('flora');
        nameCell.style.fontStyle = 'italic';
      }
      tr.appendChild(nameCell);

      const edibleCell = document.createElement('td');
      edibleCell.textContent = entry.discovered
        ? entry.item.edibleParts || 'None noted'
        : 'Unknown';
      tr.appendChild(edibleCell);

      const cautionCell = document.createElement('td');
      cautionCell.textContent = entry.discovered
        ? entry.item.poisonousParts || 'None noted'
        : 'Unknown';
      tr.appendChild(cautionCell);

      const usesCell = document.createElement('td');
      usesCell.textContent = entry.discovered
        ? entry.item.usefulParts || 'No recorded uses'
        : 'Unknown';
      tr.appendChild(usesCell);

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    applyCodexTableStyles(table);
    sectionEl.appendChild(table);
    herbariumContent.appendChild(sectionEl);
  });
}

function ensureBestiaryDialog() {
  if (!bestiaryDialog) {
    bestiaryDialog = createPopupDialog('bestiary-dialog', 'Bestiary');
    bestiaryContent = bestiaryDialog.content;
    if (bestiaryContent) {
      const blurb = document.createElement('p');
      blurb.textContent = 'Records of wildlife encountered in each biome. Successful hunts reveal new creatures.';
      blurb.style.marginBottom = '8px';
      bestiaryContent.appendChild(blurb);
    }
  }
  return bestiaryDialog;
}

function renderBestiaryDialog() {
  const dialog = ensureBestiaryDialog();
  if (!bestiaryContent || !dialog) return;

  bestiaryContent.innerHTML = '';
  const catalog = getBestiaryCatalog();
  if (!catalog.total) {
    const empty = document.createElement('p');
    empty.textContent = 'No wildlife has been documented yet. Complete hunting expeditions to populate the bestiary.';
    bestiaryContent.appendChild(empty);
    return;
  }

  const intro = document.createElement('p');
  intro.textContent = `Creatures documented: ${catalog.discovered} of ${catalog.total}.`;
  intro.style.marginBottom = '6px';
  bestiaryContent.appendChild(intro);

  catalog.sections.forEach(section => {
    const sectionEl = document.createElement('section');
    sectionEl.style.marginTop = '12px';

    const heading = document.createElement('h4');
    heading.textContent = `${section.biomeName} (${section.discoveredCount}/${section.total})`;
    heading.style.margin = '0 0 4px 0';
    sectionEl.appendChild(heading);

    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    ['Creature', 'Difficulty', 'Aggression', 'Diet', 'Recommended Tools', 'Notes'].forEach(label => {
      const th = document.createElement('th');
      th.textContent = label;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    section.entries.forEach(entry => {
      const tr = document.createElement('tr');
      if (!entry.discovered) {
        tr.style.opacity = '0.65';
      }

      const nameCell = document.createElement('td');
      if (entry.discovered) {
        nameCell.textContent = entry.item.name;
        nameCell.style.fontWeight = '600';
      } else {
        nameCell.textContent = getUnknownLabel('fauna');
        nameCell.style.fontStyle = 'italic';
      }
      tr.appendChild(nameCell);

      const difficultyCell = document.createElement('td');
      difficultyCell.textContent = entry.discovered ? entry.item.difficulty : 'Unknown';
      tr.appendChild(difficultyCell);

      const aggressionCell = document.createElement('td');
      aggressionCell.textContent = entry.discovered
        ? entry.item.aggressive
          ? 'Yes'
          : 'No'
        : 'Unknown';
      tr.appendChild(aggressionCell);

      const dietCell = document.createElement('td');
      dietCell.textContent = entry.discovered ? entry.item.diet : 'Unknown';
      tr.appendChild(dietCell);

      const toolsCell = document.createElement('td');
      toolsCell.textContent = entry.discovered
        ? (entry.item.tools && entry.item.tools.length ? entry.item.tools.join(', ') : 'None')
        : 'Unknown';
      tr.appendChild(toolsCell);

      const notesCell = document.createElement('td');
      notesCell.textContent = entry.discovered ? entry.item.notes || 'No notes recorded.' : 'Unknown';
      tr.appendChild(notesCell);

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    applyCodexTableStyles(table);
    sectionEl.appendChild(table);
    bestiaryContent.appendChild(sectionEl);
  });
}

function renderTextMap() {
  const loc = getActiveLocation();
  if (!loc || !mapView) return;
  const player = ensurePlayerState(loc.id);
  mapView.setMap(loc.map, {
    biomeId: loc.biome,
    seed: loc.map?.seed,
    season: loc.map?.season,
    focus: { x: player.x, y: player.y }
  });
  centerOnPlayer({ recenter: true });
  updatePlayerMarker();
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

function formatDuration(hours = 0) {
  const numeric = Number.isFinite(hours) ? Math.max(0, hours) : 0;
  const totalMinutes = Math.round(numeric * 60);
  if (totalMinutes <= 0) return '<1m';
  const wholeHours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (wholeHours && minutes) {
    return `${wholeHours}h ${minutes}m`;
  }
  if (wholeHours) {
    return `${wholeHours}h`;
  }
  return `${minutes}m`;
}

function formatDistance(distanceMeters = GRID_DISTANCE_METERS) {
  const meters = Number.isFinite(distanceMeters) ? Math.max(0, distanceMeters) : GRID_DISTANCE_METERS;
  if (meters >= 1000) {
    return `${Math.round((meters / 1000) * 10) / 10} km`;
  }
  return `${Math.round(meters)} m`;
}

function padNumber(value, digits = 2) {
  const numeric = Number.isFinite(value) ? Math.trunc(value) : 0;
  const safe = numeric < 0 ? 0 : numeric;
  return String(safe).padStart(digits, '0');
}

function listAvailableToolNames() {
  return listInventory()
    .filter(item => Number.isFinite(item.quantity) && item.quantity > 0)
    .map(item => item.id);
}

function getBuildActionItems() {
  const entries = getAllBuildingTypes()
    .map(type => ({ type, info: evaluateBuilding(type.id) }))
    .filter(entry => entry.info && entry.info.unlocked);
  entries.sort((a, b) => {
    const aReady = a.info.canBuildMore && a.info.locationOk && a.info.hasResources;
    const bReady = b.info.canBuildMore && b.info.locationOk && b.info.hasResources;
    if (aReady === bReady) {
      return a.type.name.localeCompare(b.type.name);
    }
    return aReady ? -1 : 1;
  });
  return entries.map(({ type, info }) => {
    const canStart = info.canBuildMore && info.locationOk;
    const hasResources = info.hasResources;
    let disabledReason = '';
    if (!info.locationOk) {
      disabledReason = 'Requires specific terrain.';
    } else if (!info.canBuildMore) {
      disabledReason = 'Maximum number already built.';
    } else if (!hasResources) {
      disabledReason = formatResourceNeedsMessage(info.resourceStatus?.missing) || 'Gather more materials first.';
    }
    return {
      id: type.id,
      name: type.name,
      icon: type.icon || '🏗️',
      description: type.description || '',
      disabled: !(canStart && hasResources),
      disabledReason,
      actionLabel: canStart ? (hasResources ? 'Open planner' : 'Awaiting materials') : '',
      type,
      info
    };
  });
}

function focusBuildCard(typeId) {
  if (!typeId || !buildOptionsContainer) return;
  requestAnimationFrame(() => {
    const card = buildOptionsContainer.querySelector(`[data-type-id="${typeId}"]`);
    if (!card) return;
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const originalBoxShadow = card.style.boxShadow;
    const originalTransform = card.style.transform;
    const originalTransition = card.style.transition;
    card.style.transition = 'box-shadow 0.3s ease, transform 0.3s ease';
    card.style.boxShadow = '0 0 0 3px rgba(45, 108, 223, 0.45)';
    card.style.transform = 'scale(1.02)';
    setTimeout(() => {
      card.style.boxShadow = originalBoxShadow;
      card.style.transform = originalTransform;
      card.style.transition = originalTransition;
    }, 1200);
  });
}

function handleBuildActionSelect(item) {
  if (!item) return true;
  showConstructionDashboard();
  if (item.id) {
    focusBuildCard(item.id);
  }
  return true;
}

function getCraftActionItems() {
  const availableTools = listAvailableToolNames();
  const recipes = getUnlockedRecipes({ availableTools });
  const jobOverview = getJobOverview();
  const assignments = Array.isArray(jobOverview.assignments) ? jobOverview.assignments : [];
  const craftAssignment = assignments.find(job => job.id === 'craft');
  const activeCrafters = craftAssignment ? craftAssignment.assigned : 0;
  recipes.sort((a, b) => a.recipe.name.localeCompare(b.recipe.name));
  return recipes.map(info => {
    const laborHours = Number.isFinite(info.laborHours)
      ? info.laborHours
      : Number.isFinite(info.recipe.laborHours)
      ? info.recipe.laborHours
      : info.recipe.timeHours || 0;
    const needsCrafters = laborHours > 0 && activeCrafters <= 0;
    const disabled = !info.hasMaterials || !info.hasTools || needsCrafters;
    let disabledReason = '';
    if (!info.hasTools) {
      const toolList = info.missingTools.join(', ');
      disabledReason = toolList ? `Requires ${toolList}.` : 'Missing tools.';
    } else if (!info.hasMaterials) {
      disabledReason = formatResourceNeedsMessage(info.missingMaterials) || 'Gather more materials first.';
    } else if (needsCrafters) {
      disabledReason = 'Assign at least one Crafter in the Jobs panel.';
    }
    const actionLabelParts = [];
    if (laborHours > 0) {
      actionLabelParts.push(`Labor: ${formatDuration(laborHours)}`);
      if (activeCrafters > 0) {
        const projected = laborHours / activeCrafters;
        actionLabelParts.push(
          `≈${formatDuration(projected)} with ${activeCrafters} ${activeCrafters === 1 ? 'crafter' : 'crafters'}`
        );
      }
    }
    const actionLabel = actionLabelParts.join(' · ');
    return {
      id: info.recipe.id,
      name: info.recipe.name,
      icon: info.recipe.icon || '🛠️',
      description: info.recipe.description || '',
      disabled,
      disabledReason,
      actionLabel,
      recipeInfo: info
    };
  });
}

function handleCraftActionSelect(item) {
  if (!item) return true;
  const availableTools = listAvailableToolNames();
  try {
    const result = craftRecipe(item.id, { availableTools });
    const outputs = Object.entries(result.recipe.outputs || {}).map(([name, amount]) => `${amount} ${name}`).join(', ');
    const summary = outputs || result.recipe.name;
    const details = [];
    if (result.laborHours) {
      let laborDetail = `using ${formatDuration(result.laborHours)} of crafter labor`;
      if (result.workforce) {
        laborDetail += ` (${result.workforce} ${result.workforce === 1 ? 'crafter' : 'crafters'})`;
      }
      details.push(laborDetail);
    } else if (result.workforce) {
      details.push(`with ${result.workforce} ${result.workforce === 1 ? 'crafter' : 'crafters'}`);
    }
    if (result.timeHours) {
      details.push(`after ${formatDuration(result.timeHours)}`);
    }
    const message = [`Crafted ${summary}`, ...details].join(' ');
    logEvent(`${message}.`);
    if (result.timeHours) {
      advanceHours(result.timeHours);
    }
    render();
  } catch (err) {
    console.error(err);
    alert(err.message);
    return false;
  }
  return true;
}

function handleGatherAction() {
  const loc = getActiveLocation();
  if (!loc) {
    logEvent('There is no safe place to gather right now.');
    return;
  }
  const player = ensurePlayerState(loc.id);
  const terrain = getTerrainTypeAt(loc, player.x, player.y) || 'open';
  const season = store.time?.season || timeInfo().season;
  const availableTools = listAvailableToolNames();
  const result = performGathering({
    locationId: loc.id,
    x: player.x,
    y: player.y,
    terrain,
    season,
    availableTools
  });

  if (!result.gathered.length && !result.blocked.length) {
    logEvent('You search the area but find nothing of note.');
    render();
    return;
  }

  const gatherKeywords = [];
  result.gathered.forEach(entry => {
    addItem(entry.resource, entry.quantity);
    const durationNote = entry.timeHours ? ` It takes ${formatDuration(entry.timeHours)}.` : '';
    logEvent(`${entry.message}${durationNote}`);
    gatherKeywords.push(entry.encounterName, entry.resource, entry.message);
  });

  if (result.gathered.length && loc?.biome) {
    const discovery = recordPlantDiscovery(loc.biome, {
      encounter: result.gathered[0]?.encounterName,
      resource: result.gathered[0]?.resource,
      notes: result.gathered.map(entry => entry.message).join(' '),
      keywords: gatherKeywords
    });
    if (discovery) {
      logEvent(`Herbarium updated: ${discovery.name} catalogued.`);
      if (isDialogVisible(herbariumDialog)) {
        renderHerbariumDialog();
      }
    }
  }

  const blockedMessages = formatBlockedMessages(result.blocked);
  blockedMessages.forEach(message => logEvent(message));

  if (result.elapsedHours > 0) {
    advanceHours(result.elapsedHours);
  }

  render();
}

function ensureEventLog() {
  if (!Array.isArray(store.eventLog)) store.eventLog = [];
  return store.eventLog;
}

function getEventLogMetadata(entry = {}) {
  const dayNumber = Number.isFinite(entry.day) ? Math.max(1, Math.floor(entry.day)) : 1;
  const monthName = getMonthName(entry.month ?? 1);
  const yearNumber = Number.isFinite(entry.year) ? Math.floor(entry.year) : 0;
  const descriptorParts = [entry.season, entry.weather].filter(Boolean);
  const descriptor = descriptorParts.length ? ` (${descriptorParts.join(' • ')})` : '';
  const timeText = formatHour(entry.hour);
  return { dayNumber, monthName, yearNumber, descriptor, timeText };
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

function awardProficiencyForOrder(order) {
  if (!order) return;
  const result = rewardOrderProficiency(order);
  if (result && result.gained > 0.01) {
    const levelText = Math.round(result.level * 10) / 10;
    logEvent(`${result.name} proficiency rises to ${levelText}.`);
  }
}

function renderEventLogSummary(log) {
  ensureEventLogPanel();
  if (!eventLogSummaryList) return;

  eventLogSummaryList.innerHTML = '';
  if (!log.length) {
    const empty = document.createElement('li');
    empty.textContent = 'No recent events yet. Venture out to gather supplies or assign work orders.';
    empty.style.fontStyle = 'italic';
    eventLogSummaryList.appendChild(empty);
    if (eventLogPanelButton) {
      eventLogPanelButton.disabled = true;
      eventLogPanelButton.style.opacity = '0.6';
      eventLogPanelButton.style.cursor = 'default';
    }
    return;
  }

  if (eventLogPanelButton) {
    eventLogPanelButton.disabled = false;
    eventLogPanelButton.style.opacity = '1';
    eventLogPanelButton.style.cursor = 'pointer';
  }

  log.slice(0, EVENT_LOG_SUMMARY_LIMIT).forEach(entry => {
    const meta = getEventLogMetadata(entry);
    const li = document.createElement('li');
    Object.assign(li.style, {
      display: 'flex',
      flexDirection: 'column',
      gap: '2px'
    });

    const headline = document.createElement('div');
    Object.assign(headline.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    });

    const timeBadge = document.createElement('span');
    Object.assign(timeBadge.style, {
      fontFamily: '"Fira Mono", "SFMono-Regular", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      fontSize: '12px',
      padding: '2px 6px',
      borderRadius: '6px',
      color: 'inherit'
    });
    if (document.body?.classList?.contains('dark')) {
      timeBadge.style.background = 'rgba(255, 255, 255, 0.12)';
      timeBadge.style.border = '1px solid rgba(255, 255, 255, 0.18)';
    } else {
      timeBadge.style.background = 'rgba(0, 0, 0, 0.06)';
      timeBadge.style.border = '1px solid rgba(0, 0, 0, 0.08)';
    }
    timeBadge.textContent = meta.timeText;
    headline.appendChild(timeBadge);

    const messageSpan = document.createElement('span');
    messageSpan.textContent = entry.message;
    messageSpan.style.fontWeight = '600';
    headline.appendChild(messageSpan);

    li.appendChild(headline);

    const metaLine = document.createElement('div');
    metaLine.textContent = `${meta.dayNumber} ${meta.monthName} ${meta.yearNumber}${meta.descriptor}`;
    metaLine.style.fontSize = '12px';
    metaLine.style.opacity = '0.75';
    li.appendChild(metaLine);

    eventLogSummaryList.appendChild(li);
  });
}

function renderEventLogDialogEntries(log) {
  if (!eventLogList) return;

  eventLogList.innerHTML = '';
  if (!log.length) {
    const empty = document.createElement('li');
    empty.textContent = 'No recent events yet.';
    eventLogList.appendChild(empty);
    return;
  }

  log.forEach(entry => {
    const meta = getEventLogMetadata(entry);
    const li = document.createElement('li');
    li.textContent = `${meta.dayNumber} ${meta.monthName} ${meta.yearNumber}${meta.descriptor} – ${meta.timeText} – ${entry.message}`;
    eventLogList.appendChild(li);
  });
}

function renderEventLog() {
  const log = ensureEventLog();
  renderEventLogSummary(log);
  renderEventLogDialogEntries(log);
}

function updateInventoryFlows() {
  const flows = calculateExpectedInventoryFlows(getOrders());
  const known = new Set(Array.from(store.inventory.keys()));
  Object.keys(flows).forEach(name => known.add(name));
  known.forEach(name => {
    const flow = flows[name] || { supply: 0, demand: 0 };
    const supply = Math.round((flow.supply || 0) * 10) / 10;
    const demand = Math.round((flow.demand || 0) * 10) / 10;
    setItemFlow(name, { supply, demand });
  });
}

function formatFlowValue(value = 0, prefix = '') {
  const rounded = Math.round((value || 0) * 10) / 10;
  if (!rounded) return '0';
  return `${prefix}${Math.abs(rounded)}`;
}

function renderInventoryTable() {
  ensureInventoryDialog();
  if (!inventoryTableBody) return;
  inventoryTableBody.innerHTML = '';
  const items = listInventory().sort((a, b) => a.id.localeCompare(b.id));
  if (!items.length) {
    const empty = document.createElement('tr');
    empty.innerHTML = '<td colspan="4">No supplies on hand.</td>';
    inventoryTableBody.appendChild(empty);
    return;
  }
  items.forEach(item => {
    const tr = document.createElement('tr');

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
    qtyCell.textContent = Math.round((item.quantity || 0) * 10) / 10;

    const supplyCell = document.createElement('td');
    supplyCell.textContent = formatFlowValue(item.supply, '+');

    const demandCell = document.createElement('td');
    demandCell.textContent = formatFlowValue(item.demand, '-');

    tr.appendChild(nameCell);
    tr.appendChild(qtyCell);
    tr.appendChild(supplyCell);
    tr.appendChild(demandCell);
    inventoryTableBody.appendChild(tr);
  });
}

function refreshInventoryProjections() {
  updateInventoryFlows();
  if (inventoryVisible) {
    renderInventoryTable();
  }
}

function ensureInventoryDialog() {
  if (inventoryDialog) {
    if (!inventoryDialog.parentElement) {
      document.body.appendChild(inventoryDialog);
    }
    return inventoryDialog;
  }

  inventoryDialog = document.createElement('div');
  inventoryDialog.id = 'inventory-popup';
  inventoryDialog.setAttribute('role', 'dialog');
  inventoryDialog.setAttribute('aria-modal', 'true');
  inventoryDialog.setAttribute('aria-hidden', 'true');
  inventoryDialog.setAttribute('aria-labelledby', 'inventory-popup-title');
  Object.assign(inventoryDialog.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    right: '0',
    bottom: '0',
    display: 'none',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0, 0, 0, 0.45)',
    zIndex: '2100'
  });
  inventoryDialog.addEventListener('click', event => {
    if (event.target === inventoryDialog) {
      hideInventoryPopup();
    }
  });

  inventoryDialogContent = document.createElement('div');
  Object.assign(inventoryDialogContent.style, {
    background: 'var(--menu-bg)',
    color: 'var(--text-color)',
    borderRadius: '10px',
    boxShadow: '0 10px 24px rgba(0, 0, 0, 0.35)',
    padding: '20px',
    maxWidth: '520px',
    width: '90vw',
    maxHeight: '80vh',
    overflowY: 'auto'
  });

  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.alignItems = 'center';
  header.style.justifyContent = 'space-between';
  header.style.gap = '12px';

  const title = document.createElement('h3');
  title.id = 'inventory-popup-title';
  title.textContent = 'Inventory Overview';
  title.style.margin = '0';
  header.appendChild(title);

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.textContent = 'Close';
  closeBtn.addEventListener('click', () => {
    hideInventoryPopup();
  });
  header.appendChild(closeBtn);

  inventoryDialogContent.appendChild(header);

  const blurb = document.createElement('p');
  blurb.textContent = 'Track on-hand quantities alongside projected supply and demand from queued orders.';
  blurb.style.marginTop = '12px';
  blurb.style.marginBottom = '12px';
  inventoryDialogContent.appendChild(blurb);

  const table = document.createElement('table');
  table.style.width = '100%';
  table.style.borderCollapse = 'collapse';
  const headerRow = document.createElement('tr');
  headerRow.innerHTML = '<th style="text-align:left;">Item</th><th style="text-align:right;">#</th><th style="text-align:right;">Supply (+)</th><th style="text-align:right;">Demand (-)</th>';
  const thead = document.createElement('thead');
  thead.appendChild(headerRow);
  table.appendChild(thead);

  inventoryTableBody = document.createElement('tbody');
  table.appendChild(inventoryTableBody);

  inventoryDialogContent.appendChild(table);
  inventoryDialog.appendChild(inventoryDialogContent);
  document.body.appendChild(inventoryDialog);
  return inventoryDialog;
}

export function showInventoryPopup() {
  ensureInventoryDialog();
  updateInventoryFlows();
  renderInventoryTable();
  inventoryDialog.style.display = 'flex';
  inventoryDialog.setAttribute('aria-hidden', 'false');
  inventoryVisible = true;
}

function hideInventoryPopup() {
  if (!inventoryDialog) return;
  inventoryDialog.style.display = 'none';
  inventoryDialog.setAttribute('aria-hidden', 'true');
  inventoryVisible = false;
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
  if (type?.id) {
    card.dataset.typeId = type.id;
  }
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
    const shortfallMessage = formatResourceNeedsMessage(missingResources);
    if (shortfallMessage) {
      const shortfallNote = document.createElement('p');
      shortfallNote.textContent = shortfallMessage;
      card.appendChild(shortfallNote);
    }
  }

  const buildBtn = document.createElement('button');
  buildBtn.textContent = `Build ${type.name}`;
  buildBtn.disabled = !info.hasResources;
  if (!info.hasResources) {
    buildBtn.title = formatResourceNeedsMessage(missingResources) || 'Gather more resources to begin construction.';
  }
  buildBtn.addEventListener('click', () => {
    try {
      const { order } = beginConstruction(type.id, { workers: type.stats.minBuilders });
      queueOrder(order);
      logEvent(`Construction started on the ${type.name}.`);
      refreshInventoryProjections();
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
      refreshInventoryProjections();
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
  const loc = getActiveLocation();
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
  const chipsContainer = timeBannerChipsContainer || banner;
  chipsContainer.replaceChildren();
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
    chipsContainer.appendChild(chipEl);
  });
}

function render() {
  ensureSeasonalMap();
  renderTimeBanner();
  renderTextMap();
  renderPlayerPanel();
  renderBuildMenu();
  renderOrders();
  refreshInventoryProjections();
  renderEventLog();
}

function handleOrderCompletionDiscoveries(order) {
  if (!order) return;
  const loc = getActiveLocation();
  const biomeId = loc?.biome;
  if (!biomeId) return;
  if (order.type === 'hunting') {
    const discovery = recordAnimalDiscovery(biomeId, {
      notes: order.notes,
      keywords: order.notes ? [order.notes] : []
    });
    if (discovery) {
      logEvent(`Bestiary updated: ${discovery.name} documented.`);
      if (isDialogVisible(bestiaryDialog)) {
        renderBestiaryDialog();
      }
    }
  } else if (order.type === 'gathering') {
    const discovery = recordPlantDiscovery(biomeId, {
      notes: order.notes,
      keywords: order.notes ? [order.notes] : []
    });
    if (discovery) {
      logEvent(`Herbarium updated: ${discovery.name} catalogued.`);
      if (isDialogVisible(herbariumDialog)) {
        renderHerbariumDialog();
      }
    }
  }
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
      const completed = updateOrder(active.id, { status: 'completed', remainingHours: 0 });
      awardProficiencyForOrder(completed);
      handleOrderCompletionDiscoveries(completed);
      event = `${capitalize(completed.type)} order completed.`;
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
      const completed = updateOrder(active.id, { status: 'completed', remainingHours: 0 });
      awardProficiencyForOrder(completed);
      if (completed.type === 'building' && completed.metadata?.projectId) {
        const project = markBuildingComplete(completed.metadata.projectId);
        const typeName = completed.metadata?.typeName || project?.typeId || 'Building';
        event = `${typeName} completed.`;
      } else {
        handleOrderCompletionDiscoveries(completed);
        event = `${capitalize(completed.type)} order completed.`;
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
  refreshInventoryProjections();
  render();
}

const ORDER_COMPLEXITY_PRESETS = {
  hunting: { base: 48, proficiencyId: 'hunting', activity: 'hunting' },
  gathering: { base: 26, proficiencyId: 'gathering', activity: 'gathering' },
  crafting: { base: 38, proficiencyId: 'crafting', activity: 'crafting' },
  building: { base: 44, proficiencyId: 'construction', activity: 'construction' },
  combat: { base: 60, proficiencyId: 'combat', activity: 'combat' }
};

function createOrderMetadata(type, workers, hours, notes = '') {
  const preset = ORDER_COMPLEXITY_PRESETS[type] || { base: 24, proficiencyId: inferOrderProficiency(type), activity: type };
  const effortHours = Math.max(1, workers * hours);
  let baseComplexity = preset.base;
  let proficiencyId = preset.proficiencyId || inferOrderProficiency(type) || 'gathering';
  let activity = preset.activity || type;
  const detail = (notes || '').toLowerCase();
  if (type === 'gathering') {
    if (/(forag|herb|mushroom|berry|root)/.test(detail)) {
      proficiencyId = 'foraging';
      activity = 'foraging';
      baseComplexity += 4;
    } else if (/(tree|sapling|log|timber|wood|lumber)/.test(detail)) {
      proficiencyId = 'woodcutting';
      activity = 'woodcutting';
      baseComplexity += 8;
    }
  }
  if (type === 'hunting' && /(fish|river|lake)/.test(detail)) {
    proficiencyId = 'swimming';
    activity = 'fishing';
    baseComplexity += 6;
  }
  const complexity = Math.min(100, baseComplexity + Math.log2(effortHours + 1) * 8);
  return {
    taskId: `${type}-manual`,
    baseComplexity: Math.round(baseComplexity * 100) / 100,
    taskComplexity: Math.round(complexity * 100) / 100,
    effortHours,
    proficiencyId,
    activity,
    notes
  };
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
    const notes = notesInput.value.trim();
    const metadata = createOrderMetadata(typeSelect.value, workers, hours, notes);
    queueOrder({
      type: typeSelect.value,
      workers,
      hours,
      notes,
      metadata
    });
    notesInput.value = '';
    refreshInventoryProjections();
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
  if (jobsDialog) {
    jobsDialog.closeDialog();
  }
  showBackButton(false);
}

export function showJobs() {
  hideConstructionDashboard();
  renderJobsDialog();
  const dialog = ensureJobsDialog();
  dialog.openDialog();
  showBackButton(false);
}

export function showCraftPlannerPopup() {
  renderCraftPlannerDialog();
  const dialog = ensureCraftPlannerDialog();
  dialog.openDialog();
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

  const proficiencyList = getProficiencies();
  if (proficiencyList.length) {
    const profTitle = document.createElement('h4');
    profTitle.textContent = 'Proficiencies';
    profTitle.style.marginTop = '16px';
    profTitle.style.marginBottom = '8px';
    profileContent.appendChild(profTitle);

    const profUl = document.createElement('ul');
    profUl.style.margin = '0';
    profUl.style.paddingLeft = '20px';
    proficiencyList.forEach(skill => {
      const li = document.createElement('li');
      const levelText = Math.round((skill.level || 0) * 10) / 10;
      li.textContent = `${skill.name}: ${levelText}/100`;
      profUl.appendChild(li);
    });
    profileContent.appendChild(profUl);
  }

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

export function showHerbariumPopup() {
  renderHerbariumDialog();
  const dialog = ensureHerbariumDialog();
  dialog.openDialog();
}

export function showBestiaryPopup() {
  renderBestiaryDialog();
  const dialog = ensureBestiaryDialog();
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
  ensureEventLogPanel();

  const loc = getActiveLocation();
  const player = loc ? ensurePlayerState(loc.id) : ensurePlayerState();
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

    container.appendChild(mapSection);

    mapView = createMapView(mapSection, {
      legendLabels: LEGEND_LABELS,
      showControls: true,
      showLegend: true,
      idPrefix: 'game-map',
      navMode: 'player',
      onNavigate: handlePlayerNavigate,
      actions: {
        build: {
          title: 'Build Projects',
          description: 'Select a structure to plan and raise for the settlement.',
          getItems: getBuildActionItems,
          onSelect: handleBuildActionSelect,
          emptyMessage: 'No structures are currently available.'
        },
        craft: {
          title: 'Crafting Recipes',
          description: 'Assign artisans to produce tools and supplies.',
          getItems: getCraftActionItems,
          onSelect: handleCraftActionSelect,
          emptyMessage: 'No recipes are currently unlocked.'
        },
        gather: {
          title: 'Gather Resources',
          description: 'Send nearby settlers to comb the area for immediate materials.',
          primaryLabel: 'Begin gathering run',
          actionHint: 'Takes time as settlers search the surrounding terrain.',
          onExecute: handleGatherAction
        }
      },
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
        updatePlayerMarker();
        renderPlayerPanel();
      }
    });
    mapView.setMap(loc.map, {
      biomeId: loc.biome,
      seed: loc.map?.seed,
      season: loc.map?.season,
      focus: { x: player.x, y: player.y }
    });
    playerPanelContainer = mapSection;
    ensurePlayerPanel(playerPanelContainer);
    updatePlayerMarker();
    renderPlayerPanel();
    centerOnPlayer({ recenter: true });

    lastSeason = store.time.season;
    renderTextMap();
  } else {
    playerPanelContainer = container;
    ensurePlayerPanel(playerPanelContainer);
    renderPlayerPanel();
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
    refreshInventoryProjections();
    render();
  });
  controlsRow.appendChild(clearBtn);

  ordersSection.appendChild(controlsRow);

  container.appendChild(ordersSection);
  container.style.display = 'grid';
  ensureInventoryDialog();
  refreshInventoryProjections();
  render();
  if (mapView && typeof mapView.refresh === 'function') {
    mapView.refresh();
  }
}

export function updateGameUI() {
  render();
}
