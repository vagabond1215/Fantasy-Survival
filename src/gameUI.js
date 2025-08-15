import { stats as peopleStats } from './people.js';
import { getItem, addItem } from './inventory.js';
import { advanceDay, info as timeInfo } from './time.js';
import { getJobs, setJob } from './jobs.js';
import store from './state.js';
import { scavengeResources } from './resources.js';
import { showBackButton } from './menu.js';
import { allLocations } from './location.js';
import { generateColorMap, getBiomeBorderColor, getFeatureColors } from './map.js';
import { saveGame } from './persistence.js';
import { getBiome } from './biomes.js';

// Keep a reference to the scavenge count element so the display can
// be refreshed whenever the UI rerenders.
let scavengeDisplay = null;
// Distance (in meters) represented by a single map grid cell. This
// value changes when the user "zooms" the map to simulate different
// aerial view heights without altering the canvas resolution.
const DEFAULT_MAP_SCALE = 100;
let mapScale = DEFAULT_MAP_SCALE;
let mapCanvas = null;
let scaleDisplay = null;
const MAP_DISPLAY_SIZE = 600;
let mapOffsetX = 0;
let mapOffsetY = 0;
let currentLocation = null;
let mapViewport = null;
let legendList = null;
let lastSeason = null;

const LEGEND_LABELS = {
  water: 'Bodies of Water',
  open: 'Open Land',
  forest: 'Forest',
  ore: 'Ore Deposits'
};

function updateLegendColors(season = store.time.season) {
  if (!legendList || !currentLocation) return;
  const colors = getFeatureColors(currentLocation.biome, season);
  legendList.innerHTML = '';
  Object.entries(colors).forEach(([key, color]) => {
    const li = document.createElement('li');
    const swatch = document.createElement('span');
    swatch.style.display = 'inline-block';
    swatch.style.width = '12px';
    swatch.style.height = '12px';
    swatch.style.backgroundColor = color;
    swatch.style.marginRight = '6px';
    li.appendChild(swatch);
    li.appendChild(document.createTextNode(LEGEND_LABELS[key] || key));
    legendList.appendChild(li);
  });
}

function centerMap() {
  if (!mapCanvas || !currentLocation) return;
  const zoomFactor = DEFAULT_MAP_SCALE / mapScale;
  const centerX = MAP_DISPLAY_SIZE / 2;
  const centerY = MAP_DISPLAY_SIZE / 2;
  const startPixelX = -currentLocation.map.xStart;
  const startPixelY = -currentLocation.map.yStart;
  mapOffsetX = centerX - startPixelX * zoomFactor;
  mapOffsetY = centerY - startPixelY * zoomFactor;
}

// Apply a CSS transform rather than resizing the canvas element. This
// keeps the canvas resolution consistent while visually zooming the
// contents to represent different map scales.
function updateMapDisplay() {
  if (mapCanvas) {
    const zoomFactor = DEFAULT_MAP_SCALE / mapScale;
    mapCanvas.style.transform = `translate(${mapOffsetX}px, ${mapOffsetY}px) scale(${zoomFactor})`;
    mapCanvas.style.transformOrigin = '0 0';
  }
  if (scaleDisplay) scaleDisplay.textContent = `${mapScale}m`;
}

function renderMap() {
  if (!currentLocation || !mapCanvas) return;
  const pixels = currentLocation.map.pixels;
  mapCanvas.width = pixels[0].length;
  mapCanvas.height = pixels.length;
  mapCanvas.style.width = `${mapCanvas.width}px`;
  mapCanvas.style.height = `${mapCanvas.height}px`;
  const ctx = mapCanvas.getContext('2d');
  const imgData = ctx.createImageData(mapCanvas.width, mapCanvas.height);
  for (let y = 0; y < mapCanvas.height; y++) {
    for (let x = 0; x < mapCanvas.width; x++) {
      const color = pixels[y][x];
      const idx = (y * mapCanvas.width + x) * 4;
      imgData.data[idx] = parseInt(color.slice(1, 3), 16);
      imgData.data[idx + 1] = parseInt(color.slice(3, 5), 16);
      imgData.data[idx + 2] = parseInt(color.slice(5, 7), 16);
      imgData.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);
}

function ensureMapCoverage(preGenerate = false) {
  const loc = currentLocation;
  if (!loc || !mapCanvas) return;
  const zoomFactor = DEFAULT_MAP_SCALE / mapScale;
  const viewWidth = MAP_DISPLAY_SIZE / zoomFactor;
  const viewHeight = MAP_DISPLAY_SIZE / zoomFactor;
  let left = -mapOffsetX / zoomFactor + loc.map.xStart;
  let top = -mapOffsetY / zoomFactor + loc.map.yStart;
  let right = left + viewWidth;
  let bottom = top + viewHeight;
  const chunk = 200;
  const buffer = preGenerate ? Math.max(loc.map.pixels[0].length, viewWidth) : 0;

  while (left < loc.map.xStart - buffer) {
    const extra = generateColorMap(
      loc.biome,
      loc.map.seed,
      loc.map.xStart - chunk,
      loc.map.yStart,
      chunk,
      loc.map.pixels.length,
      store.time.season
    ).pixels;
    for (let i = 0; i < loc.map.pixels.length; i++) {
      loc.map.pixels[i] = extra[i].concat(loc.map.pixels[i]);
    }
    loc.map.xStart -= chunk;
    mapOffsetX -= chunk * zoomFactor;
    left += chunk;
    right += chunk;
    renderMap();
    saveGame();
  }
  while (right > loc.map.xStart + loc.map.pixels[0].length + buffer) {
    const extra = generateColorMap(
      loc.biome,
      loc.map.seed,
      loc.map.xStart + loc.map.pixels[0].length,
      loc.map.yStart,
      chunk,
      loc.map.pixels.length,
      store.time.season
    ).pixels;
    for (let i = 0; i < loc.map.pixels.length; i++) {
      loc.map.pixels[i] = loc.map.pixels[i].concat(extra[i]);
    }
    renderMap();
    saveGame();
  }
  while (top < loc.map.yStart - buffer) {
    const extra = generateColorMap(
      loc.biome,
      loc.map.seed,
      loc.map.xStart,
      loc.map.yStart - chunk,
      loc.map.pixels[0].length,
      chunk,
      store.time.season
    ).pixels;
    loc.map.pixels = extra.concat(loc.map.pixels);
    loc.map.yStart -= chunk;
    mapOffsetY -= chunk * zoomFactor;
    top += chunk;
    bottom += chunk;
    renderMap();
    saveGame();
  }
  while (bottom > loc.map.yStart + loc.map.pixels.length + buffer) {
    const extra = generateColorMap(
      loc.biome,
      loc.map.seed,
      loc.map.xStart,
      loc.map.yStart + loc.map.pixels.length,
      loc.map.pixels[0].length,
      chunk,
      store.time.season
    ).pixels;
    loc.map.pixels = loc.map.pixels.concat(extra);
    renderMap();
    saveGame();
  }
}

function zoomMap(delta) {
  if (!currentLocation || !mapCanvas) return;
  const centerX = MAP_DISPLAY_SIZE / 2;
  const centerY = MAP_DISPLAY_SIZE / 2;
  const oldZoom = DEFAULT_MAP_SCALE / mapScale;
  const worldX = (centerX - mapOffsetX) / oldZoom;
  const worldY = (centerY - mapOffsetY) / oldZoom;
  mapScale = Math.max(10, mapScale + delta);
  currentLocation.map.scale = mapScale;
  const newZoom = DEFAULT_MAP_SCALE / mapScale;
  mapOffsetX = centerX - worldX * newZoom;
  mapOffsetY = centerY - worldY * newZoom;
  updateMapDisplay();
  ensureMapCoverage();
}

function computeChanges() {
  const stats = peopleStats();
  const jobs = getJobs();
  let laborers = jobs.laborer || 0;

  // Workers explicitly assigned to scavenge gather resources before
  // any remaining laborers are split between other tasks.
  const scavengeWorkers = jobs.scavenge || 0;
  const scavengeTotals = scavengeResources(scavengeWorkers);

  // Prioritize building then hauling
  const buildingTasks = store.buildQueue || 0;
  const haulingTasks = store.haulQueue || 0;

  const buildingWorkers = Math.min(laborers, buildingTasks);
  laborers -= buildingWorkers;
  const haulingWorkers = Math.min(laborers, haulingTasks);
  laborers -= haulingWorkers;

  // Remaining laborers gather firewood and food evenly
  const firewoodWorkers = Math.floor(laborers / 2);
  const foodWorkers = laborers - firewoodWorkers;

  return {
    food: {
      quantity: getItem('food').quantity,
      supply: foodWorkers + scavengeTotals.food,
      demand: stats.total
    },
    firewood: {
      quantity: getItem('firewood').quantity,
      supply: firewoodWorkers + scavengeTotals.firewood,
      demand: stats.total
    },
    'small stones': {
      quantity: getItem('small stones').quantity,
      supply: scavengeTotals['small stones'],
      demand: 0
    },
    pebbles: {
      quantity: getItem('pebbles').quantity,
      supply: scavengeTotals.pebbles,
      demand: 0
    }
  };
}

function render() {
  const container = document.getElementById('game');
  if (!container) return;

  const t = timeInfo();
  const turn = container.querySelector('#turn');
  if (turn) turn.textContent = `Day ${t.day} - ${t.season}`;

  if (currentLocation && t.season !== lastSeason) {
    const map = currentLocation.map;
    const newMap = generateColorMap(
      currentLocation.biome,
      map.seed,
      map.xStart,
      map.yStart,
      map.pixels[0].length,
      map.pixels.length,
      t.season
    );
    map.pixels = newMap.pixels;
    map.season = t.season;
    renderMap();
    if (mapViewport) {
      mapViewport.style.border = `4px solid ${getBiomeBorderColor(currentLocation.biome, t.season)}`;
    }
    updateLegendColors(t.season);
    lastSeason = t.season;
  }

  const changes = computeChanges();
  const jobs = getJobs();
  if (scavengeDisplay) scavengeDisplay.textContent = jobs.scavenge || 0;
  const inv = container.querySelector('#inventory');
  if (inv) {
    inv.innerHTML = '<h3>Inventory</h3>';
    const table = document.createElement('table');
    const header = document.createElement('tr');
    header.innerHTML = '<th>Item</th><th>Qty</th><th>Δ/turn</th>';
    table.appendChild(header);
    Object.entries(changes).forEach(([name, data]) => {
      const tr = document.createElement('tr');
      const net = data.supply - data.demand;
      tr.innerHTML = `<td>${name}</td><td>${data.quantity}</td><td>${net}</td>`;
      table.appendChild(tr);
    });
    inv.appendChild(table);
  }
}

function processTurn() {
  const changes = computeChanges();
  Object.entries(changes).forEach(([name, data]) => {
    const net = data.supply - data.demand;
    addItem(name, net);
  });
  advanceDay();
  render();
}

let jobsPopup = null;

export function closeJobs() {
  if (jobsPopup) {
    jobsPopup.remove();
    jobsPopup = null;
  }
  showBackButton(false);
}

function renderJobs() {
  closeJobs();
  const stats = peopleStats();
  const jobs = getJobs();
  jobsPopup = document.createElement('div');
  jobsPopup.id = 'jobs-popup';
  Object.assign(jobsPopup.style, {
    position: 'fixed',
    top: '10%',
    left: '10%',
    right: '10%',
    bottom: '10%',
    background: '#fff',
    border: '1px solid #000',
    padding: '10px',
    overflow: 'auto'
  });

  const close = document.createElement('span');
  close.textContent = 'X';
  close.style.float = 'right';
  close.style.cursor = 'pointer';
  close.addEventListener('click', closeJobs);
  jobsPopup.appendChild(close);

  const heading = document.createElement('div');
  heading.textContent = `Pop: ${stats.total} | Adults: ${stats.adults} | Children: ${stats.children}`;
  jobsPopup.appendChild(heading);

  const list = document.createElement('div');
  const unlocked = Object.keys(store.jobs || {});
  unlocked.forEach(name => {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.gap = '4px';

    const label = document.createElement('span');
    label.textContent = name;

    const down = document.createElement('button');
    down.textContent = '↓';
    down.addEventListener('click', () => {
      setJob(name, (jobs[name] || 0) - 1);
      render();
      renderJobs();
    });

    const count = document.createElement('span');
    count.textContent = jobs[name] || 0;

    const up = document.createElement('button');
    up.textContent = '↑';
    up.addEventListener('click', () => {
      setJob(name, (jobs[name] || 0) + 1);
      render();
      renderJobs();
    });

    row.appendChild(label);
    row.appendChild(down);
    row.appendChild(count);
    row.appendChild(up);
    list.appendChild(row);
  });

  const laborRow = document.createElement('div');
  laborRow.style.marginTop = '10px';
  laborRow.textContent = `Laborers: ${jobs.laborer}`;
  list.appendChild(laborRow);

  jobsPopup.appendChild(list);
  document.body.appendChild(jobsPopup);
}

export function showJobs() {
  showBackButton(true);
  renderJobs();
}

export function initGameUI() {
  const container = document.getElementById('game');
  if (!container) return;
  container.innerHTML = '';

  const loc = allLocations()[0];
  if (loc?.map?.pixels) {
    currentLocation = loc;
    let waterLevelDefault = getBiome(loc.biome)?.elevation?.waterLevel ?? 0.3;
    let waterLevel = loc.map.waterLevel ?? waterLevelDefault;
    let waterDisplay = null;
    let waterFeaturesContainer = null;
    let waterFeatureCounts = {};
    const WATER_FEATURE_TYPES = [
      { name: 'River', keyword: 'river' },
      { name: 'Creek', keyword: 'creek' },
      { name: 'Lake', keyword: 'lake' },
      { name: 'Spring', keyword: 'spring' },
      { name: 'Estuary Branch', keyword: 'estuary' },
      { name: 'Inlet', keyword: 'inlet' }
    ];
    if (loc.map.season !== store.time.season) {
      const newMap = generateColorMap(
        loc.biome,
        loc.map.seed,
        loc.map.xStart,
        loc.map.yStart,
        loc.map.pixels[0].length,
        loc.map.pixels.length,
        store.time.season,
        waterLevel
      );
      loc.map.pixels = newMap.pixels;
      loc.map.season = store.time.season;
    }

    const updateWaterDisplay = () => {
      if (waterDisplay) waterDisplay.textContent = `${Math.round(waterLevel * 100)}%`;
    };

    const updateWaterFeatures = () => {
      if (!waterFeaturesContainer) return;
      waterFeaturesContainer.innerHTML = '';
      waterFeatureCounts = {};
      const biomeFeatures = (getBiome(currentLocation.biome)?.features || []).map(f => f.toLowerCase());
      WATER_FEATURE_TYPES.forEach(f => {
        if (!biomeFeatures.some(bf => bf.includes(f.keyword))) return;
        waterFeatureCounts[f.name] = 0;
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.justifyContent = 'center';
        row.style.marginTop = '4px';

        const label = document.createElement('span');
        label.textContent = f.name;
        label.style.marginRight = '5px';
        row.appendChild(label);

        const minus = document.createElement('button');
        minus.type = 'button';
        minus.textContent = '-';
        minus.style.width = '30px';
        minus.style.height = '30px';
        minus.style.padding = '0';

        const display = document.createElement('button');
        display.type = 'button';
        display.textContent = '0';
        display.style.margin = '0 5px';
        display.style.height = '30px';
        display.style.padding = '0 5px';

        const plus = document.createElement('button');
        plus.type = 'button';
        plus.textContent = '+';
        plus.style.width = '30px';
        plus.style.height = '30px';
        plus.style.padding = '0';

        minus.addEventListener('click', () => {
          waterFeatureCounts[f.name] = Math.max(0, waterFeatureCounts[f.name] - 1);
          display.textContent = waterFeatureCounts[f.name];
        });
        plus.addEventListener('click', () => {
          waterFeatureCounts[f.name] += 1;
          display.textContent = waterFeatureCounts[f.name];
        });
        display.addEventListener('click', () => {
          waterFeatureCounts[f.name] = 0;
          display.textContent = '0';
        });

        row.appendChild(minus);
        row.appendChild(display);
        row.appendChild(plus);
        waterFeaturesContainer.appendChild(row);
      });
    };

    const regenerateWater = () => {
      const newMap = generateColorMap(
        loc.biome,
        loc.map.seed,
        loc.map.xStart,
        loc.map.yStart,
        loc.map.pixels[0].length,
        loc.map.pixels.length,
        store.time.season,
        waterLevel
      );
      currentLocation.map = { ...currentLocation.map, ...newMap };
      renderMap();
      updateMapDisplay();
    };

    const mapWrapper = document.createElement('div');
    mapWrapper.style.display = 'flex';
    mapWrapper.style.justifyContent = 'center';
    mapWrapper.style.alignItems = 'flex-start';
    mapWrapper.style.marginTop = '10px';

    const viewport = document.createElement('div');
    viewport.style.width = `${MAP_DISPLAY_SIZE}px`;
    viewport.style.height = `${MAP_DISPLAY_SIZE}px`;
    viewport.style.overflow = 'hidden';
    viewport.style.position = 'relative';
    viewport.style.border = `4px solid ${getBiomeBorderColor(loc.biome, store.time.season)}`;
    mapViewport = viewport;

    const canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.imageRendering = 'pixelated';
    canvas.style.display = 'block';
    canvas.style.margin = '0 auto';
    mapCanvas = canvas;
    mapScale = loc.map.scale || mapScale;
    renderMap();
    centerMap();
    ensureMapCoverage(true);
    centerMap();
    updateMapDisplay();
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    const startDrag = (x, y) => { dragging = true; lastX = x; lastY = y; };
    const moveDrag = (x, y) => {
      if (!dragging) return;
      mapOffsetX += x - lastX;
      mapOffsetY += y - lastY;
      lastX = x;
      lastY = y;
      updateMapDisplay();
      ensureMapCoverage();
    };
    const endDrag = () => { dragging = false; };
    canvas.addEventListener('mousedown', e => startDrag(e.clientX, e.clientY));
    document.addEventListener('mousemove', e => moveDrag(e.clientX, e.clientY));
    document.addEventListener('mouseup', endDrag);
    canvas.addEventListener('touchstart', e => { const t = e.touches[0]; startDrag(t.clientX, t.clientY); e.preventDefault(); });
    document.addEventListener('touchmove', e => { const t = e.touches[0]; moveDrag(t.clientX, t.clientY); e.preventDefault(); });
    document.addEventListener('touchend', endDrag);

    viewport.appendChild(canvas);
    mapWrapper.appendChild(viewport);

    const legend = document.createElement('div');
    legend.style.marginLeft = '20px';
    const biomeName = getBiome(loc.biome)?.name || loc.biome;
    const title = document.createElement('h3');
    title.textContent = biomeName;
    legend.appendChild(title);

    const list = document.createElement('ul');
    legend.appendChild(list);
    legendList = list;
    updateLegendColors(store.time.season);

    const waterSection = document.createElement('details');
    const waterSummary = document.createElement('summary');
    waterSummary.textContent = 'Water';
    waterSection.appendChild(waterSummary);

    const waterContent = document.createElement('div');
    waterContent.style.display = 'flex';
    waterContent.style.flexDirection = 'column';
    waterContent.style.alignItems = 'center';
    waterSection.appendChild(waterContent);

    const waterLevelLabel = document.createElement('div');
    waterLevelLabel.textContent = 'Water Level';
    waterContent.appendChild(waterLevelLabel);

    const waterControls = document.createElement('div');
    waterControls.style.display = 'flex';
    waterControls.style.alignItems = 'center';
    waterControls.style.justifyContent = 'center';
    waterControls.style.marginTop = '5px';

    const waterDown = document.createElement('button');
    waterDown.type = 'button';
    waterDown.textContent = '▼';
    waterDown.style.width = '30px';
    waterDown.style.height = '30px';
    waterDown.style.padding = '0';

    waterDisplay = document.createElement('button');
    waterDisplay.type = 'button';
    waterDisplay.style.margin = '0 5px';
    waterDisplay.style.height = '30px';
    waterDisplay.style.padding = '0 5px';

    const waterUp = document.createElement('button');
    waterUp.type = 'button';
    waterUp.textContent = '▲';
    waterUp.style.width = '30px';
    waterUp.style.height = '30px';
    waterUp.style.padding = '0';

    waterControls.appendChild(waterDown);
    waterControls.appendChild(waterDisplay);
    waterControls.appendChild(waterUp);
    waterContent.appendChild(waterControls);

    waterFeaturesContainer = document.createElement('div');
    waterFeaturesContainer.style.marginTop = '5px';
    waterContent.appendChild(waterFeaturesContainer);

    waterDown.addEventListener('click', () => {
      waterLevel = Math.max(0, Math.round((waterLevel - 0.05) * 100) / 100);
      updateWaterDisplay();
      regenerateWater();
    });
    waterUp.addEventListener('click', () => {
      waterLevel = Math.min(1, Math.round((waterLevel + 0.05) * 100) / 100);
      updateWaterDisplay();
      regenerateWater();
    });
    waterDisplay.addEventListener('click', () => {
      waterLevel = waterLevelDefault;
      updateWaterDisplay();
      regenerateWater();
    });

    legend.appendChild(waterSection);

    updateWaterDisplay();
    updateWaterFeatures();

    mapWrapper.appendChild(legend);
    container.appendChild(mapWrapper);

    const zoomControls = document.createElement('div');
    zoomControls.style.textAlign = 'center';
    zoomControls.style.marginTop = '5px';
    zoomControls.style.display = 'flex';
    zoomControls.style.justifyContent = 'center';
    zoomControls.style.alignItems = 'center';

    const BTN_SIZE = '30px';

    const centerBtn = document.createElement('button');
    centerBtn.textContent = '🏠';
    centerBtn.style.width = BTN_SIZE;
    centerBtn.style.height = BTN_SIZE;
    centerBtn.style.padding = '0';
    centerBtn.style.lineHeight = BTN_SIZE;
    centerBtn.style.boxSizing = 'border-box';
    centerBtn.addEventListener('click', () => {
      centerMap();
      ensureMapCoverage();
      updateMapDisplay();
    });

    const zoomOut = document.createElement('button');
    zoomOut.textContent = '-';
    zoomOut.style.width = BTN_SIZE;
    zoomOut.style.height = BTN_SIZE;
    zoomOut.style.padding = '0';
    zoomOut.style.lineHeight = BTN_SIZE;
    zoomOut.style.boxSizing = 'border-box';
    zoomOut.addEventListener('click', () => {
      zoomMap(10);
    });

    scaleDisplay = document.createElement('button');
    scaleDisplay.style.margin = '0 5px';
    scaleDisplay.style.height = BTN_SIZE;
    scaleDisplay.style.lineHeight = BTN_SIZE;
    scaleDisplay.style.padding = '0 5px';
    scaleDisplay.style.boxSizing = 'border-box';
    scaleDisplay.addEventListener('click', () => {
      zoomMap(DEFAULT_MAP_SCALE - mapScale);
    });

    const zoomIn = document.createElement('button');
    zoomIn.textContent = '+';
    zoomIn.style.width = BTN_SIZE;
    zoomIn.style.height = BTN_SIZE;
    zoomIn.style.padding = '0';
    zoomIn.style.lineHeight = BTN_SIZE;
    zoomIn.style.boxSizing = 'border-box';
    zoomIn.addEventListener('click', () => {
      zoomMap(-10);
    });

    updateMapDisplay();
    lastSeason = store.time.season;

    zoomControls.appendChild(centerBtn);
    zoomControls.appendChild(zoomOut);
    zoomControls.appendChild(scaleDisplay);
    zoomControls.appendChild(zoomIn);
    container.appendChild(zoomControls);
  }

  const turn = document.createElement('div');
  turn.id = 'turn';

  const next = document.createElement('button');
  next.textContent = 'Next Turn';
  next.addEventListener('click', processTurn);

  // Direct scavenge controls on the main UI
  const scavengeRow = document.createElement('div');
  const scavengeLabel = document.createElement('span');
  scavengeLabel.textContent = 'Scavenge';
  const scavengeDown = document.createElement('button');
  scavengeDown.textContent = '↓';
  scavengeDown.addEventListener('click', () => {
    const jobs = getJobs();
    setJob('scavenge', (jobs.scavenge || 0) - 1);
    render();
  });
  scavengeDisplay = document.createElement('span');
  scavengeDisplay.id = 'scavenge-count';
  scavengeDisplay.textContent = '0';
  const scavengeUp = document.createElement('button');
  scavengeUp.textContent = '↑';
  scavengeUp.addEventListener('click', () => {
    const jobs = getJobs();
    setJob('scavenge', (jobs.scavenge || 0) + 1);
    render();
  });
  scavengeRow.appendChild(scavengeLabel);
  scavengeRow.appendChild(scavengeDown);
  scavengeRow.appendChild(scavengeDisplay);
  scavengeRow.appendChild(scavengeUp);

  const inv = document.createElement('div');
  inv.id = 'inventory';

  container.appendChild(turn);
  container.appendChild(next);
  container.appendChild(scavengeRow);
  container.appendChild(inv);

  container.style.display = 'block';
  render();
}

export function updateGameUI() {
  render();
}
