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

function startGame(settings = {}) {
  if (!store.people.size) {
    addPerson({ id: 'p1', age: 30, sex: 'M', job: 'lumberjack', home: null, family: [] });
  }
  addItem('food', 100);
  if (settings.biome) {
    generateLocation('loc1', settings.biome);
  } else if (store.locations.size === 0) {
    generateLocation('loc1', 'temperate-deciduous');
  }
  shelterTypes.forEach(registerBuildingType);
  unlockTechnology({ id: 'basic-tools', name: 'Basic Tools' });

  if (settings.season) store.time.season = settings.season;
  if (settings.difficulty) store.difficulty = settings.difficulty;

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

