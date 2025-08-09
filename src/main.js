import store from './state.js';
import { addPerson } from './people.js';
import { addItem } from './inventory.js';
import { registerBuildingType } from './buildings.js';
import { unlockTechnology } from './technology.js';
import { generateLocation } from './location.js';
import { harvestWood } from './resources.js';
import { initSetupUI } from './ui.js';
import { saveGame, loadGame } from './persistence.js';
import { shelterTypes } from './shelters.js';
import { difficultySettings } from './difficulty.js';
import { initGameUI } from './gameUI.js';

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
  store.jobs = { laborer: 0 };
  store.buildQueue = 0;
  store.haulQueue = 0;

  const loc = [...store.locations.values()][0];
  const wood = harvestWood(1, loc?.biome || 'temperate-deciduous');
  addItem('wood', wood);

  saveGame();
  const setupDiv = document.getElementById('setup');
  if (setupDiv) setupDiv.style.display = 'none';
  initGameUI();
}

function init() {
  if (!loadGame()) {
    initSetupUI(startGame);
  } else {
    const setupDiv = document.getElementById('setup');
    if (setupDiv) setupDiv.style.display = 'none';
    initGameUI();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

window.Game = { store, saveGame };
