// Temporary UI module to set up initial game parameters.
// Provides a basic form to select biome, starting season, and difficulty.
// This module is standalone so the UI can be redesigned or replaced
// without affecting the rest of the game logic.

import { biomes } from './biomes.js';

const seasons = ['Spring', 'Summer', 'Autumn', 'Winter'];

const difficulties = [
  { id: 'easy', name: 'Easy' },
  { id: 'normal', name: 'Normal' },
  { id: 'hard', name: 'Hard' }
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

  const startBtn = document.createElement('button');
  startBtn.type = 'submit';
  startBtn.textContent = 'Start';
  form.appendChild(startBtn);

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

