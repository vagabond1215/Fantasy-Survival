import store from './state.js';
import { addPerson } from './people.js';
import { addItem } from './inventory.js';
import { refreshBuildingUnlocks } from './buildings.js';
import { unlockTechnology } from './technology.js';
import { generateLocation } from './location.js';
import { calculateStartingGoods, harvestWood } from './resources.js';
import { initSetupUI } from './ui.js';
import { saveGame, loadGame, clearSave } from './persistence.js';
import { difficultySettings } from './difficulty.js';
import { initGameUI, showJobs, closeJobs } from './gameUI.js';
import { initTopMenu, initBottomMenu } from './menu.js';
import { resetToDawn } from './time.js';
import { resetOrders } from './orders.js';

function startGame(settings = {}) {
  const diff = settings.difficulty || 'normal';
  const cfg = difficultySettings[diff];

  for (let i = 1; i <= cfg.people; i++) {
    addPerson({ id: `p${i}`, age: 20 + i, sex: i % 2 ? 'M' : 'F', job: null, home: null, family: [] });
  }

  const startingGoods = calculateStartingGoods(cfg);
  Object.entries(startingGoods).forEach(([item, qty]) => addItem(item, qty));

  if (settings.season) store.time.season = settings.season;
  store.time.day = 1;
  resetToDawn();
  if (settings.biome) {
    generateLocation('loc1', settings.biome, store.time.season, settings.seed);
  } else if (store.locations.size === 0) {
    generateLocation('loc1', 'temperate-deciduous', store.time.season, settings.seed);
  }
  unlockTechnology({ id: 'basic-tools', name: 'Basic Tools' });
  refreshBuildingUnlocks();
  store.difficulty = diff;
  // Initialize available jobs, starting with scavenging
  store.jobs = { scavenge: 0 };
  store.buildQueue = 0;
  store.haulQueue = 0;
  resetOrders();
  store.eventLog = [];

  const loc = [...store.locations.values()][0];
  const wood = harvestWood(1, loc?.biome || 'temperate-deciduous');
  addItem('wood', wood);

  saveGame();
  const setupDiv = document.getElementById('setup');
  if (setupDiv) setupDiv.style.display = 'none';
  initGameUI();
}

function init() {
  initTopMenu(showJobs, closeJobs, () => {
    clearSave();
    window.location.reload();
  });
  initBottomMenu();
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
