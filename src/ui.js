// Temporary UI module to set up initial game parameters.
// Provides a basic form to select biome, starting season, and difficulty.
// This module is standalone so the UI can be redesigned or replaced
// without affecting the rest of the game logic.

import { biomes } from './biomes.js';
import { difficulties, difficultySettings } from './difficulty.js';

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

  const startBtn = document.createElement('button');
  startBtn.type = 'submit';
  startBtn.textContent = 'Start';
  form.appendChild(startBtn);

  const formatDays = d => (d >= 7 ? `${d / 7} week${d >= 14 ? 's' : ''}` : `${d} day${d !== 1 ? 's' : ''}`);

  const updateBiomeInfo = () => {
    const b = biomes.find(x => x.id === biomeSelect.select.value);
    if (!b) {
      biomeInfo.textContent = '';
      return;
    }
    biomeInfo.innerHTML = `<strong>${b.name}</strong>: ${b.description}<br>Open land: ${b.openLand}<br>Food resources: ${b.food}`;
  };

  const updateDiffInfo = () => {
    const id = diffSelect.select.value;
    const cfg = difficultySettings[id];
    const name = diffSelect.select.options[diffSelect.select.selectedIndex].textContent;
    const tools = Object.entries(cfg.tools)
      .map(([t, q]) => `${q} ${t}`)
      .join(', ') || 'None';
    diffInfo.innerHTML = `<strong>Difficulty:</strong> ${name}<br>Starting people: ${cfg.people}<br>Food: ${formatDays(cfg.foodDays)} stock<br>Firewood: ${formatDays(cfg.firewoodDays)} stock<br>Tools: ${tools}`;
  };

  biomeSelect.select.addEventListener('change', updateBiomeInfo);
  diffSelect.select.addEventListener('change', updateDiffInfo);
  updateBiomeInfo();
  updateDiffInfo();

  form.addEventListener('submit', e => {
    e.preventDefault();
    const settings = {
      biome: biomeSelect.select.value,
      season: seasonSelect.select.value,
      difficulty: diffSelect.select.value
    };
    form.remove();
    if (typeof onStart === 'function') onStart(settings);
  });

  container.appendChild(form);
}

