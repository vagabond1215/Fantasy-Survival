// Temporary UI module to set up initial game parameters.
// Provides a basic form to select biome, starting season, and difficulty.
// This module is standalone so the UI can be redesigned or replaced
// without affecting the rest of the game logic.

import { biomes, getBiome } from './biomes.js';
import { difficulties, difficultySettings } from './difficulty.js';
import { generateColorMap, TERRAIN_SYMBOLS } from './map.js';

const seasons = ['Spring', 'Summer', 'Autumn', 'Winter'];

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

  const mapSection = document.createElement('section');
  mapSection.style.marginTop = '12px';

  const mapIntro = document.createElement('p');
  mapIntro.textContent = 'Preview of the surrounding area rendered with emoji terrain symbols. Each icon represents one patch of terrain.';
  mapSection.appendChild(mapIntro);

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

  const mapPreview = document.createElement('pre');
  mapPreview.id = 'setup-map-preview';
  mapPreview.style.whiteSpace = 'pre';
  mapPreview.style.fontFamily = '"Apple Color Emoji", "Segoe UI Emoji", sans-serif';
  mapPreview.style.fontSize = '16px';
  mapPreview.style.background = '#f4f4f4';
  mapPreview.style.padding = '10px';
  mapPreview.style.border = '1px solid #ccc';
  mapPreview.style.maxHeight = '400px';
  mapPreview.style.overflowY = 'auto';
  mapSection.appendChild(mapPreview);

  const legendTitle = document.createElement('h4');
  legendTitle.textContent = 'Legend';
  mapSection.appendChild(legendTitle);

  const legendList = document.createElement('ul');
  mapSection.appendChild(legendList);

  form.appendChild(mapSection);

  const startBtn = document.createElement('button');
  startBtn.type = 'submit';
  startBtn.textContent = 'Start';
  form.appendChild(startBtn);

  container.appendChild(form);

  const LEGEND_LABELS = {
    water: 'Water',
    open: 'Open Land',
    forest: 'Forest',
    ore: 'Ore Deposits'
  };

  const summarizeTerrain = (types = []) => {
    const counts = { water: 0, open: 0, forest: 0, ore: 0 };
    types.forEach(row => {
      row.forEach(type => {
        if (type in counts) counts[type] += 1;
      });
    });
    return counts;
  };

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
    mapPreview.textContent = mapData.tiles.map(row => row.join('')).join('\n');
    legendList.innerHTML = '';
    const counts = summarizeTerrain(mapData.types);
    Object.entries(TERRAIN_SYMBOLS).forEach(([type, symbol]) => {
      const li = document.createElement('li');
      const label = LEGEND_LABELS[type] || type;
      li.textContent = `${symbol} – ${label} (${counts[type] ?? 0})`;
      legendList.appendChild(li);
    });
  }

  function generatePreview() {
    mapData = generateColorMap(
      biomeSelect.select.value,
      mapSeed,
      0,
      0,
      80,
      40,
      seasonSelect.select.value
    );
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
      seed: mapSeed
    });
  });

  updateInfo();
  generatePreview();
}

