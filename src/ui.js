// Temporary UI module to set up initial game parameters.
// Provides a basic form to select biome, starting season, and difficulty.
// This module is standalone so the UI can be redesigned or replaced
// without affecting the rest of the game logic.

import { biomes, getBiome } from './biomes.js';
import { difficulties, difficultySettings } from './difficulty.js';
import {
  computeCenteredStart,
  DEFAULT_MAP_HEIGHT,
  DEFAULT_MAP_WIDTH,
  generateColorMap,
  TERRAIN_SYMBOLS
} from './map.js';
import { createMapView } from './mapView.js';

const seasons = [
  { id: 'Thawbound', name: 'Thawbound (Emergent thaw)' },
  { id: 'Sunheight', name: 'Sunheight (High sun)' },
  { id: 'Emberwane', name: 'Emberwane (Fading ember)' },
  { id: 'Frostshroud', name: 'Frostshroud (Deep chill)' }
];

/**
 * Create a temporary setup form and call the provided callback when submitted.
 * @param {Function} onStart - callback receiving { biome, season, difficulty }
 */
export function initSetupUI(onStart) {
  const container = document.getElementById('setup') || document.body;

  const form = document.createElement('form');
  form.id = 'setup-form';

  const makeSelect = (labelText, options, name) => {
    const label = document.createElement('label');
    label.textContent = labelText + ': ';

    const select = document.createElement('select');
    select.name = name;
    options.forEach(opt => {
      const option = document.createElement('option');
      option.value = opt.id || opt;
      option.textContent = opt.name || opt;
      select.appendChild(option);
    });

    label.appendChild(select);
    return { label, select };
  };

  const biomeSelect = makeSelect('Biome', biomes, 'biome');
  const seasonSelect = makeSelect('Season', seasons, 'season');
  const diffSelect = makeSelect('Difficulty', difficulties, 'difficulty');

  [biomeSelect, seasonSelect, diffSelect].forEach(({ label }) => {
    form.appendChild(label);
    form.appendChild(document.createElement('br'));
  });

  const biomeInfo = document.createElement('p');
  const diffInfo = document.createElement('p');
  form.appendChild(biomeInfo);
  form.appendChild(diffInfo);

  let mapData = null;
  let mapSeed = Date.now().toString();
  let spawnCoords = null;
  let spawnPrompt = null;
  let pendingSpawn = null;
  const spawnMarkerId = 'setup-spawn-marker';

  const mapSection = document.createElement('section');
  mapSection.style.marginTop = '12px';

  const mapIntro = document.createElement('p');
  mapIntro.textContent = 'Preview of the surrounding area rendered with emoji terrain symbols. Each icon represents one patch of terrain. Use the navigation and zoom controls to examine different parts of the map.';
  mapSection.appendChild(mapIntro);

  const spawnInfo = document.createElement('p');
  spawnInfo.style.margin = '8px 0 0';
  spawnInfo.style.fontStyle = 'italic';

  const seedRow = document.createElement('div');
  seedRow.style.display = 'flex';
  seedRow.style.flexWrap = 'wrap';
  seedRow.style.alignItems = 'center';
  seedRow.style.gap = '6px';

  const seedLabel = document.createElement('label');
  seedLabel.textContent = 'Map Seed: ';
  const seedInput = document.createElement('input');
  seedInput.type = 'text';
  seedInput.value = mapSeed;
  seedInput.size = 24;
  seedLabel.appendChild(seedInput);
  seedRow.appendChild(seedLabel);

  const applySeedBtn = document.createElement('button');
  applySeedBtn.type = 'button';
  applySeedBtn.textContent = 'Apply';
  seedRow.appendChild(applySeedBtn);

  const randomSeedBtn = document.createElement('button');
  randomSeedBtn.type = 'button';
  randomSeedBtn.textContent = 'Randomize';
  seedRow.appendChild(randomSeedBtn);

  mapSection.appendChild(seedRow);

  const LEGEND_LABELS = {
    water: 'Water',
    open: 'Open Land',
    forest: 'Forest',
    ore: 'Ore Deposits'
  };

  function hideSpawnPrompt() {
    if (spawnPrompt) {
      spawnPrompt.style.display = 'none';
      spawnPrompt.setAttribute('aria-hidden', 'true');
    }
    pendingSpawn = null;
  }

  function ensureSpawnPrompt() {
    const wrapper = mapView?.elements?.wrapper;
    if (!wrapper) return null;
    if (!spawnPrompt) {
      spawnPrompt = document.createElement('div');
      spawnPrompt.className = 'spawn-confirm';
      spawnPrompt.setAttribute('role', 'dialog');
      spawnPrompt.setAttribute('aria-modal', 'false');
      spawnPrompt.setAttribute('aria-hidden', 'true');
      Object.assign(spawnPrompt.style, {
        position: 'absolute',
        display: 'none',
        flexDirection: 'column',
        gap: '8px',
        background: 'var(--bg-color, #fff)',
        color: 'inherit',
        border: '1px solid var(--map-border, #ccc)',
        borderRadius: '10px',
        padding: '12px 16px',
        boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)',
        zIndex: '10',
        minWidth: '140px'
      });
      const question = document.createElement('p');
      question.dataset.role = 'spawn-question';
      question.style.margin = '0';
      question.style.fontWeight = '600';
      question.textContent = 'Spawn here?';
      spawnPrompt.appendChild(question);

      const buttonRow = document.createElement('div');
      buttonRow.style.display = 'flex';
      buttonRow.style.gap = '8px';
      buttonRow.style.justifyContent = 'flex-end';

      const yesBtn = document.createElement('button');
      yesBtn.type = 'button';
      yesBtn.textContent = 'Yes';
      yesBtn.dataset.role = 'spawn-yes';
      const noBtn = document.createElement('button');
      noBtn.type = 'button';
      noBtn.textContent = 'No';
      noBtn.dataset.role = 'spawn-no';

      buttonRow.appendChild(noBtn);
      buttonRow.appendChild(yesBtn);
      spawnPrompt.appendChild(buttonRow);

      yesBtn.addEventListener('click', () => {
        if (pendingSpawn) {
          setSpawnCoords({ x: pendingSpawn.x, y: pendingSpawn.y });
        }
        hideSpawnPrompt();
      });

      noBtn.addEventListener('click', () => {
        hideSpawnPrompt();
      });
    }

    if (spawnPrompt.parentElement !== wrapper) {
      spawnPrompt.parentElement?.removeChild(spawnPrompt);
      wrapper.appendChild(spawnPrompt);
    }

    return spawnPrompt;
  }

  function showSpawnPrompt(detail) {
    const prompt = ensureSpawnPrompt();
    if (!prompt) return;
    pendingSpawn = detail;
    const question = prompt.querySelector('[data-role="spawn-question"]');
    if (question) {
      question.textContent = `Spawn here at (${detail.x}, ${detail.y})?`;
    }

    const wrapper = mapView?.elements?.wrapper;
    if (wrapper && detail?.element?.getBoundingClientRect) {
      const wrapperRect = wrapper.getBoundingClientRect();
      const tileRect = detail.element.getBoundingClientRect();
      const left = tileRect.left - wrapperRect.left + tileRect.width / 2;
      const top = tileRect.top - wrapperRect.top + tileRect.height / 2;
      prompt.style.left = `${left}px`;
      prompt.style.top = `${top}px`;
    } else {
      prompt.style.left = '50%';
      prompt.style.top = '50%';
    }

    prompt.style.transform = 'translate(-50%, -120%)';
    prompt.style.display = 'flex';
    prompt.setAttribute('aria-hidden', 'false');

    const yesBtn = prompt.querySelector('[data-role="spawn-yes"]');
    if (yesBtn) {
      if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
        window.requestAnimationFrame(() => yesBtn.focus());
      } else {
        setTimeout(() => yesBtn.focus(), 0);
      }
    }
  }

  function computeDefaultSpawn(map) {
    if (!map) return null;
    const source = map.viewport || map;
    const width = Math.max(1, Math.trunc(source?.width ?? DEFAULT_MAP_WIDTH));
    const height = Math.max(1, Math.trunc(source?.height ?? DEFAULT_MAP_HEIGHT));
    const xStart = Number.isFinite(source?.xStart)
      ? Math.trunc(source.xStart)
      : Number.isFinite(map?.xStart)
        ? Math.trunc(map.xStart)
        : 0;
    const yStart = Number.isFinite(source?.yStart)
      ? Math.trunc(source.yStart)
      : Number.isFinite(map?.yStart)
        ? Math.trunc(map.yStart)
        : 0;
    return {
      x: xStart + Math.floor(width / 2),
      y: yStart + Math.floor(height / 2)
    };
  }

  function setSpawnCoords(coords = {}, options = {}) {
    if (!coords) return;
    const x = Number.isFinite(coords.x) ? Math.trunc(coords.x) : null;
    const y = Number.isFinite(coords.y) ? Math.trunc(coords.y) : null;
    if (x === null || y === null) return;
    spawnCoords = { x, y };
    if (!options.silent) {
      hideSpawnPrompt();
    }
    updateSpawnMarker();
    updateSpawnInfo();
  }

  function getTerrainAt(map, coords = {}) {
    if (!map?.types?.length) return null;
    const xStart = Number.isFinite(map.xStart) ? Math.trunc(map.xStart) : 0;
    const yStart = Number.isFinite(map.yStart) ? Math.trunc(map.yStart) : 0;
    const col = Math.trunc(coords.x) - xStart;
    const row = Math.trunc(coords.y) - yStart;
    if (row < 0 || col < 0) return null;
    const rowData = map.types[row];
    if (!rowData || col >= rowData.length) return null;
    return rowData[col];
  }

  function describeTerrain(type) {
    if (!type) return '';
    return LEGEND_LABELS[type] || type;
  }

  function updateSpawnInfo() {
    if (!spawnInfo) return;
    if (!spawnCoords) {
      spawnInfo.textContent = 'Click the map to choose your starting position.';
      return;
    }
    const terrain = describeTerrain(getTerrainAt(mapData, spawnCoords));
    const coordsText = `(${spawnCoords.x}, ${spawnCoords.y})`;
    spawnInfo.textContent = terrain
      ? `Chosen spawn point ${coordsText} – ${terrain}.`
      : `Chosen spawn point ${coordsText}.`;
  }

  function updateSpawnMarker() {
    if (!mapView || typeof mapView.setMarkers !== 'function') return;
    const markers = spawnCoords
      ? [
          {
            id: spawnMarkerId,
            x: spawnCoords.x,
            y: spawnCoords.y,
            icon: '🧍',
            className: 'map-marker--spawn',
            label: 'Chosen spawn location',
            emphasis: true
          }
        ]
      : [];
    mapView.setMarkers(markers);
  }

  const mapView = createMapView(mapSection, {
    legendLabels: LEGEND_LABELS,
    showControls: true,
    showLegend: false,
    idPrefix: 'setup-map',
    fetchMap: ({ xStart, yStart, width, height, seed, season, viewport, context }) => {
      const biomeId = context?.biomeId || biomeSelect.select.value;
      const nextSeed = seed ?? mapSeed;
      const nextSeason = season ?? seasonSelect.select.value;
      return generateColorMap(
        biomeId,
        nextSeed,
        xStart,
        yStart,
        width,
        height,
        nextSeason,
        mapData?.waterLevel,
        viewport
      );
    },
    onMapUpdate: updated => {
      mapData = { ...updated };
      updateSpawnMarker();
      updateSpawnInfo();
    },
    onTileClick: detail => {
      showSpawnPrompt(detail);
    }
  });

  mapSection.appendChild(spawnInfo);
  updateSpawnInfo();

  form.appendChild(mapSection);

  const startBtn = document.createElement('button');
  startBtn.type = 'submit';
  startBtn.textContent = 'Start';
  form.appendChild(startBtn);

  container.appendChild(form);

  function updateInfo() {
    const biome = getBiome(biomeSelect.select.value);
    if (biome) {
      const desc = biome.description ? `${biome.description} ` : '';
      const features = biome.features?.length ? `Features: ${biome.features.join(', ')}.` : '';
      biomeInfo.textContent = `${biome.name}: ${desc}${features}`;
    } else {
      biomeInfo.textContent = '';
    }

    const diffId = diffSelect.select.value;
    const diff = difficultySettings[diffId];
    const diffName = diffSelect.select.options[diffSelect.select.selectedIndex]?.textContent || diffId;
    if (diff) {
      diffInfo.textContent = `${diffName} difficulty – ${diff.people} settlers, ${diff.foodDays} days of food, ${diff.firewoodDays} days of firewood.`;
    } else {
      diffInfo.textContent = '';
    }
  }

  function renderMapPreview() {
    if (!mapData) return;
    hideSpawnPrompt();
    mapView.setMap(mapData, {
      biomeId: biomeSelect.select.value,
      seed: mapData?.seed ?? mapSeed,
      season: mapData?.season ?? seasonSelect.select.value
    });
    updateSpawnMarker();
    updateSpawnInfo();
  }

  function generatePreview() {
    const width = DEFAULT_MAP_WIDTH;
    const height = DEFAULT_MAP_HEIGHT;
    const { xStart, yStart } = computeCenteredStart(width, height);
    mapData = generateColorMap(
      biomeSelect.select.value,
      mapSeed,
      xStart,
      yStart,
      width,
      height,
      seasonSelect.select.value
    );
    const defaultSpawn = computeDefaultSpawn(mapData);
    if (defaultSpawn) {
      setSpawnCoords(defaultSpawn, { silent: true });
    } else {
      spawnCoords = null;
      updateSpawnMarker();
      updateSpawnInfo();
    }
    renderMapPreview();
  }

  applySeedBtn.addEventListener('click', () => {
    mapSeed = seedInput.value.trim() || Date.now().toString();
    seedInput.value = mapSeed;
    generatePreview();
  });

  randomSeedBtn.addEventListener('click', () => {
    mapSeed = Date.now().toString();
    seedInput.value = mapSeed;
    generatePreview();
  });

  seedInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      applySeedBtn.click();
    }
  });

  biomeSelect.select.addEventListener('change', () => {
    updateInfo();
    generatePreview();
  });
  seasonSelect.select.addEventListener('change', generatePreview);
  diffSelect.select.addEventListener('change', updateInfo);

  form.addEventListener('submit', e => {
    e.preventDefault();
    applySeedBtn.click();
    onStart({
      biome: biomeSelect.select.value,
      season: seasonSelect.select.value,
      difficulty: diffSelect.select.value,
      seed: mapSeed,
      spawn: spawnCoords ? { ...spawnCoords } : null
    });
  });

  updateInfo();
  generatePreview();
}

