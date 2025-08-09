import store from './state.js';
import { addPerson, stats as peopleStats } from './people.js';
import { addItem, getItem } from './inventory.js';
import { advanceDay, info as timeInfo } from './time.js';
import { registerBuildingType, getBuildableTypes } from './buildings.js';
import { unlockTechnology } from './technology.js';
import { generateLocation } from './location.js';
import { harvestWood } from './resources.js';
import { initSetupUI } from './ui.js';
import { saveGame, loadGame } from './persistence.js';
import { shelterTypes } from './shelters.js';
import { difficultySettings } from './difficulty.js';

function startGame(settings = {}) {
  const diff = settings.difficulty || 'normal';
  const cfg = difficultySettings[diff];

  for (let i = 1; i <= cfg.people; i++) {
    addPerson({ id: `p${i}`, age: 20 + i, sex: i % 2 ? 'M' : 'F', job: null, home: null, family: [] });
  }

  const foodPerPersonPerDay = 1;
  addItem('food', cfg.people * cfg.foodDays * foodPerPersonPerDay);
  addItem('firewood', cfg.people * cfg.firewoodDays);

  Object.entries(cfg.tools).forEach(([item, qty]) => addItem(item, qty));

  if (settings.biome) {
    generateLocation('loc1', settings.biome);
  } else if (store.locations.size === 0) {
    generateLocation('loc1', 'temperate-deciduous');
  }
  shelterTypes.forEach(registerBuildingType);
  unlockTechnology({ id: 'basic-tools', name: 'Basic Tools' });

  if (settings.season) store.time.season = settings.season;
  store.difficulty = diff;

  // Simple example of resource production influenced by tech/location.
  const loc = [...store.locations.values()][0];
  const wood = harvestWood(1, loc?.biome || 'temperate-deciduous');
  addItem('wood', wood);

  advanceDay();
  saveGame();
  render();
  setInterval(() => {
    advanceDay();
    saveGame();
    render();
  }, 10000); // advance day and autosave every 10 seconds
}

function render() {
  const output = {
    people: peopleStats(),
    inventory: {
      food: getItem('food'),
      firewood: getItem('firewood'),
      wood: getItem('wood')
    },
    time: timeInfo(),
    difficulty: store.difficulty,
    buildable: getBuildableTypes(),
    locations: [...store.locations.values()].map(l => l.biome)
  };
  const el = document.getElementById('output');
  if (el) el.textContent = JSON.stringify(output, null, 2);
}

if (!loadGame()) {
  initSetupUI(startGame);
} else {
  render();
  // Resume autosave/advance loop
  setInterval(() => {
    advanceDay();
    saveGame();
    render();
  }, 10000);
}

// expose for debugging
window.Game = { store, saveGame };

