import { biomes, getBiome } from './biomes.js';
import { difficulties, difficultySettings } from './difficulty.js';
import {
  computeCenteredStart,
  DEFAULT_MAP_HEIGHT,
  DEFAULT_MAP_WIDTH,
  generateColorMap
} from './map.js';
import { createMapView } from './mapView.js';

const seasons = [
  { id: 'Thawbound', label: 'Thawbound', hint: 'emergent thaw' },
  { id: 'Sunheight', label: 'Sunheight', hint: 'high sun' },
  { id: 'Emberwane', label: 'Emberwane', hint: 'fading ember' },
  { id: 'Frostshroud', label: 'Frostshroud', hint: 'deep chill' }
];

const difficultyFlavors = {
  easy: 'forgiving',
  normal: 'balanced',
  hard: 'brutal'
};

const BIOME_SWATCHES = [
  'linear-gradient(135deg, rgba(96, 115, 255, 0.45), rgba(136, 69, 255, 0.18))',
  'linear-gradient(135deg, rgba(92, 214, 255, 0.45), rgba(73, 116, 255, 0.2))',
  'linear-gradient(135deg, rgba(255, 191, 113, 0.45), rgba(255, 137, 191, 0.2))',
  'linear-gradient(135deg, rgba(96, 255, 182, 0.45), rgba(60, 145, 255, 0.18))',
  'linear-gradient(135deg, rgba(255, 120, 120, 0.45), rgba(255, 215, 132, 0.18))',
  'linear-gradient(135deg, rgba(150, 107, 255, 0.45), rgba(255, 158, 243, 0.18))',
  'linear-gradient(135deg, rgba(132, 232, 255, 0.45), rgba(170, 122, 255, 0.18))',
  'linear-gradient(135deg, rgba(255, 165, 92, 0.45), rgba(109, 227, 243, 0.18))'
];

function createSeed() {
  if (typeof crypto !== 'undefined' && crypto?.getRandomValues) {
    return crypto.getRandomValues(new Uint32Array(1))[0].toString(36);
  }
  return Math.trunc(Date.now() * Math.random()).toString(36);
}

function getBiomeSwatch(id) {
  if (!id) return BIOME_SWATCHES[0];
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) & 0xffffffff;
  }
  const index = Math.abs(hash) % BIOME_SWATCHES.length;
  return BIOME_SWATCHES[index];
}

export function initSetupUI(onStart) {
  const container = document.getElementById('setup') || document.body;
  container.innerHTML = '';

  document.body.classList.add('landing-active');

  const template = document.createElement('template');
  template.innerHTML = `
    <div class="wrap">
      <div class="setup">
        <div class="card hero">
          <div>
            <div class="brand">Fantasy Survival</div>
            <div class="sub">Settle a harsh land. Thrive through seasons. Adapt or vanish.</div>
          </div>
          <div class="badge badge--ok">Alpha</div>
        </div>

        <div class="card section" id="biome-card">
          <div class="section__title">Biome</div>
          <div class="grid" id="biome-grid"></div>
          <div class="mini-map" id="biome-mini-map" aria-hidden="true"></div>
          <div class="sub" id="biome-details"></div>
        </div>

        <div class="card section">
          <div class="section__title">Starting Season</div>
          <div class="segment" id="season-seg"></div>
        </div>

        <div class="card section">
          <div class="section__title">Difficulty</div>
          <div class="segment" id="difficulty-seg"></div>
          <div class="difficulty-tip" id="difficulty-tip"></div>
        </div>

        <div class="card section">
          <div class="section__title">World Seed</div>
          <div class="seed-row">
            <input id="seed-input" class="input" placeholder="Enter seed or leave blank for random" autocomplete="off">
            <button id="seed-apply" type="button" class="btn btn--ghost">Apply</button>
            <button id="seed-rand" type="button" class="btn btn--ghost" aria-label="Randomize seed">🎲 Random</button>
          </div>
        </div>

        <div class="card section map-section">
          <p class="map-tip" id="map-tip">Explore the terrain and click to choose a spawn point.</p>
          <div id="map-preview" class="map-preview" aria-label="World map preview"></div>
          <p class="sub" id="spawn-info"></p>
        </div>

        <div class="card cta-row">
          <button id="randomize-all" type="button" class="btn">Randomize All</button>
          <div class="spacer" aria-hidden="true"></div>
          <button id="start-btn" type="button" class="btn btn--primary">Start Game</button>
        </div>
      </div>
    </div>
  `;

  const wrap = template.content.firstElementChild;
  container.appendChild(wrap);

  const biomeGrid = wrap.querySelector('#biome-grid');
  const biomeDetails = wrap.querySelector('#biome-details');
  const biomeMiniMap = wrap.querySelector('#biome-mini-map');
  const seasonSeg = wrap.querySelector('#season-seg');
  const difficultySeg = wrap.querySelector('#difficulty-seg');
  const difficultyTip = wrap.querySelector('#difficulty-tip');
  const seedInput = wrap.querySelector('#seed-input');
  const seedApplyBtn = wrap.querySelector('#seed-apply');
  const seedRandomBtn = wrap.querySelector('#seed-rand');
  const mapPreview = wrap.querySelector('#map-preview');
  const spawnInfo = wrap.querySelector('#spawn-info');
  const randomizeAllBtn = wrap.querySelector('#randomize-all');
  const startBtn = wrap.querySelector('#start-btn');

  const biomeTiles = [];
  const seasonButtons = [];
  const difficultyButtons = [];

  const defaultBiome = biomes.find(b => b.id === 'temperate-deciduous') || biomes[0];
  const defaultSeason = seasons[0];
  const defaultDifficulty = difficulties.find(d => d.id === 'normal') || difficulties[0];

  let selectedBiome = defaultBiome?.id || '';
  let selectedSeason = defaultSeason?.id || '';
  let selectedDifficulty = defaultDifficulty?.id || '';
  let mapSeed = createSeed();
  let mapData = null;
  let mapView = null;
  let spawnCoords = null;
  let spawnPrompt = null;
  let pendingSpawn = null;
  const spawnMarkerId = 'setup-spawn-marker';

  seedInput.value = mapSeed;

  function setActive(list, node) {
    list.forEach(item => {
      item.classList.toggle('is-active', item === node);
    });
  }

  function updateBiomeDetails() {
    const biome = getBiome(selectedBiome);
    if (!biome) {
      biomeDetails.textContent = '';
      return;
    }
    const features = biome.features?.length ? `Features: ${biome.features.join(', ')}.` : '';
    biomeDetails.textContent = `${biome.name}${biome.description ? ` – ${biome.description}` : ''} ${features}`.trim();
  }

  function updateBiomePreview() {
    biomeMiniMap.style.background = getBiomeSwatch(selectedBiome);
  }

  function updateDifficultyInfo() {
    if (!selectedDifficulty) {
      difficultyTip.textContent = '';
      return;
    }
    const diff = difficultySettings[selectedDifficulty];
    const name = difficulties.find(d => d.id === selectedDifficulty)?.name || selectedDifficulty;
    if (diff) {
      difficultyTip.textContent = `${name}: ${diff.people} settlers, ${diff.foodDays} days of food, ${diff.firewoodDays} days of firewood.`;
    } else {
      difficultyTip.textContent = name;
    }
  }

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
      spawnPrompt.style.position = 'absolute';
      spawnPrompt.style.display = 'none';
      spawnPrompt.style.flexDirection = 'column';
      spawnPrompt.style.gap = '8px';
      spawnPrompt.style.padding = '12px 16px';
      spawnPrompt.style.borderRadius = '12px';
      spawnPrompt.style.boxShadow = '0 12px 24px rgba(0, 0, 0, 0.45)';
      spawnPrompt.style.minWidth = '150px';

      const question = document.createElement('p');
      question.dataset.role = 'spawn-question';
      question.style.margin = '0';
      question.style.fontWeight = '600';
      spawnPrompt.appendChild(question);

      const buttonRow = document.createElement('div');
      buttonRow.style.display = 'flex';
      buttonRow.style.justifyContent = 'flex-end';
      buttonRow.style.gap = '8px';

      const noBtn = document.createElement('button');
      noBtn.type = 'button';
      noBtn.textContent = 'No';
      noBtn.dataset.role = 'spawn-no';

      const yesBtn = document.createElement('button');
      yesBtn.type = 'button';
      yesBtn.textContent = 'Yes';
      yesBtn.dataset.role = 'spawn-yes';

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
    const labels = {
      water: 'Water',
      open: 'Open Land',
      forest: 'Forest',
      ore: 'Ore Deposits',
      stone: 'Stone Outcrop'
    };
    return labels[type] || type;
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

  function renderMapPreview() {
    if (!mapData || !mapView) return;
    hideSpawnPrompt();
    mapView.setMap(mapData, {
      biomeId: selectedBiome,
      seed: mapData?.seed ?? mapSeed,
      season: mapData?.season ?? selectedSeason
    });
    updateSpawnMarker();
    updateSpawnInfo();
  }

  function generatePreview() {
    if (!selectedBiome || !mapPreview) return;
    const width = DEFAULT_MAP_WIDTH;
    const height = DEFAULT_MAP_HEIGHT;
    const { xStart, yStart } = computeCenteredStart(width, height);
    mapData = generateColorMap(
      selectedBiome,
      mapSeed,
      xStart,
      yStart,
      width,
      height,
      selectedSeason
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

  function applySelection(key, value) {
    if (!value) return;
    switch (key) {
      case 'biome':
        if (value === selectedBiome) return;
        selectedBiome = value;
        updateBiomeDetails();
        updateBiomePreview();
        generatePreview();
        break;
      case 'season':
        if (value === selectedSeason) return;
        selectedSeason = value;
        generatePreview();
        break;
      case 'diff':
        if (value === selectedDifficulty) return;
        selectedDifficulty = value;
        updateDifficultyInfo();
        break;
      case 'seed':
        mapSeed = value;
        seedInput.value = mapSeed;
        generatePreview();
        break;
      default:
        break;
    }
  }

  mapView = createMapView(mapPreview, {
    legendLabels: {
      water: 'Water',
      open: 'Open Land',
      forest: 'Forest',
      ore: 'Ore Deposits',
      stone: 'Stone Outcrop'
    },
    showControls: true,
    showLegend: false,
    idPrefix: 'setup-map',
    useTerrainColors: true,
    fetchMap: ({ xStart, yStart, width, height, seed, season, viewport }) => {
      const biomeId = selectedBiome;
      const nextSeed = seed ?? mapSeed;
      const nextSeason = season ?? selectedSeason;
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

  biomes.forEach((biome, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tile col-4';
    button.dataset.biome = biome.id;
    button.innerHTML = `
      <div class="tile__name">${biome.name}</div>
      <div class="tile__desc">${biome.description || ''}</div>
    `;
    button.addEventListener('click', () => {
      setActive(biomeTiles, button);
      applySelection('biome', biome.id);
    });
    if (!selectedBiome && index === 0) {
      selectedBiome = biome.id;
    }
    biomeTiles.push(button);
    biomeGrid.appendChild(button);
  });

  seasons.forEach((season, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'seg';
    button.dataset.season = season.id;
    button.innerHTML = season.hint
      ? `${season.label} <span class="hint">${season.hint}</span>`
      : season.label;
    button.addEventListener('click', () => {
      setActive(seasonButtons, button);
      applySelection('season', season.id);
    });
    if (!selectedSeason && index === 0) {
      selectedSeason = season.id;
    }
    seasonButtons.push(button);
    seasonSeg.appendChild(button);
  });

  difficulties.forEach((diff, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'seg';
    button.dataset.diff = diff.id;
    const flavor = difficultyFlavors[diff.id] || '';
    button.innerHTML = flavor
      ? `${diff.name} <span class="hint">${flavor}</span>`
      : diff.name;
    button.addEventListener('click', () => {
      setActive(difficultyButtons, button);
      applySelection('diff', diff.id);
    });
    if (!selectedDifficulty && index === 0) {
      selectedDifficulty = diff.id;
    }
    difficultyButtons.push(button);
    difficultySeg.appendChild(button);
  });

  function selectBiome(id) {
    const tile = biomeTiles.find(item => item.dataset.biome === id) || biomeTiles[0];
    if (!tile) return;
    setActive(biomeTiles, tile);
    applySelection('biome', tile.dataset.biome);
  }

  function selectSeason(id) {
    const seg = seasonButtons.find(item => item.dataset.season === id) || seasonButtons[0];
    if (!seg) return;
    setActive(seasonButtons, seg);
    applySelection('season', seg.dataset.season);
  }

  function selectDifficulty(id) {
    const seg = difficultyButtons.find(item => item.dataset.diff === id) || difficultyButtons[0];
    if (!seg) return;
    setActive(difficultyButtons, seg);
    applySelection('diff', seg.dataset.diff);
  }

  function selectSeed(seed) {
    applySelection('seed', seed);
  }

  selectBiome(selectedBiome);
  selectSeason(selectedSeason);
  selectDifficulty(selectedDifficulty);
  updateBiomeDetails();
  updateBiomePreview();
  updateDifficultyInfo();
  selectSeed(mapSeed);

  seedApplyBtn.addEventListener('click', () => {
    const value = seedInput.value.trim();
    selectSeed(value || createSeed());
  });

  seedRandomBtn.addEventListener('click', () => {
    const seed = createSeed();
    selectSeed(seed);
  });

  seedInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      seedApplyBtn.click();
    }
  });

  randomizeAllBtn.addEventListener('click', () => {
    if (biomeTiles.length) {
      const pick = biomeTiles[Math.floor(Math.random() * biomeTiles.length)];
      setActive(biomeTiles, pick);
      applySelection('biome', pick.dataset.biome);
    }

    if (seasonButtons.length) {
      const pick = seasonButtons[Math.floor(Math.random() * seasonButtons.length)];
      setActive(seasonButtons, pick);
      applySelection('season', pick.dataset.season);
    }

    if (difficultyButtons.length) {
      const pick = difficultyButtons[Math.floor(Math.random() * difficultyButtons.length)];
      setActive(difficultyButtons, pick);
      applySelection('diff', pick.dataset.diff);
    }

    selectSeed(createSeed());
  });

  startBtn.addEventListener('click', () => {
    const seed = seedInput.value.trim();
    if (seed && seed !== mapSeed) {
      selectSeed(seed);
    }
    onStart({
      biome: selectedBiome,
      season: selectedSeason,
      difficulty: selectedDifficulty,
      seed: mapSeed,
      spawn: spawnCoords ? { ...spawnCoords } : null
    });
  });
}
