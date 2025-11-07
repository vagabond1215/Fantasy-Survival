// @ts-check
import store from './state.js';
import { addItem } from './inventory.js';
import { refreshBuildingUnlocks } from './buildings.js';
import { initializeTechnologyRegistry, unlockTechnology } from './technology.js';
import { generateLocation } from './location.js';
import { calculateStartingGoods, harvestWood } from './resources.js';
import { initSetupUI } from './ui/index.js';
import { saveGame, loadGame, clearSave } from './persistence.js';
import { difficultySettings } from './difficulty.js';
import { initializePopulation } from './population.js';
import {
  initGameUI,
  showJobs,
  closeJobs,
  showConstructionDashboard,
  showInventoryPopup,
  showProfilePopup,
  showLogPopup,
  showCraftPlannerPopup,
  showHerbariumPopup,
  showBestiaryPopup,
  renderHeader
} from './gameUI.js';
import { initTopMenu, initBottomMenu } from './menu.js';
import { resetToDawn, getSeasonDetails, getSeasonForMonth, randomDarkAgeYear } from './time.js';
import { resetOrders } from './orders.js';

function removeLandingTheme() {
  document.body.classList.remove('landing-active');
  const landingLink = document.getElementById('landing-theme');
  if (landingLink && landingLink.parentElement) {
    landingLink.parentElement.removeChild(landingLink);
  }
}

function startGame(settings = {}) {
  const diff = settings.difficulty || 'normal';
  const preset = difficultySettings[diff] || difficultySettings.normal;
  const startCfg = preset.start;
  const worldParameters = settings.world || preset.world;
  const hasStartingBiome = Object.prototype.hasOwnProperty.call(settings, 'startingBiomeId');
  const configuredStartingBiome = hasStartingBiome ? settings.startingBiomeId : settings.biome;
  const startingBiomeId = configuredStartingBiome ?? worldParameters?.startingBiomeId ?? null;
  const enrichedWorld = {
    ...worldParameters,
    ...(startingBiomeId ? { startingBiomeId } : {})
  };
  // MIGRATION: startGame now expects settings.world to include world generation parameters.

  store.jobs = { gather: 0, hunt: 0, craft: 0, build: 0, guard: 0 };
  store.technologies = new Map();
  initializeTechnologyRegistry();
  initializePopulation(startCfg.people, { seed: settings.seed });

  const startingGoods = calculateStartingGoods(startCfg);
  Object.entries(startingGoods).forEach(([item, qty]) => addItem(item, qty));

  store.time.day = 1;
  store.time.month = 1;
  store.time.year = randomDarkAgeYear();
  store.time.weather = 'Clear';
  if (settings.season) {
    store.time.season = settings.season;
    const seasonInfo = getSeasonDetails(settings.season);
    if (seasonInfo.months?.length) {
      store.time.month = seasonInfo.months[0];
    }
  } else {
    store.time.season = getSeasonForMonth(store.time.month);
  }
  resetToDawn();
  if (startingBiomeId) {
    generateLocation('loc1', startingBiomeId, store.time.season, settings.seed, enrichedWorld);
  } else if (store.locations.size === 0) {
    generateLocation(
      'loc1',
      'temperate-broadleaf',
      store.time.season,
      settings.seed,
      enrichedWorld
    );
  }

  const spawn = settings.spawn || {};
  const spawnX = Number.isFinite(spawn.x) ? Math.trunc(spawn.x) : 0;
  const spawnY = Number.isFinite(spawn.y) ? Math.trunc(spawn.y) : 0;
  store.player = {
    locationId: 'loc1',
    x: spawnX,
    y: spawnY,
    jobId: 'survey'
  };
  unlockTechnology({ id: 'basic-tools', name: 'Basic Tools' });
  refreshBuildingUnlocks();
  store.difficulty = diff;
  store.worldSettings = enrichedWorld;
  store.craftTargets = new Map();
  store.buildQueue = 0;
  store.haulQueue = 0;
  resetOrders();
  store.eventLog = [];

  const loc = [...store.locations.values()][0];
  const wood = harvestWood(1, loc?.biome || 'temperate-broadleaf');
  addItem('wood', wood);

  saveGame();
  const setupDiv = document.getElementById('setup');
  if (setupDiv) setupDiv.style.display = 'none';
  const createSteps = document.querySelector('.create-steps');
  const createStepContent = document.getElementById('create-step-content');
  if (createSteps instanceof HTMLElement) createSteps.style.display = 'none';
  if (createStepContent instanceof HTMLElement) createStepContent.style.display = 'none';
  removeLandingTheme();
  initGameUI();
}

async function init() {
  initTopMenu(showJobs, closeJobs, () => {
    clearSave();
    window.location.reload();
  }, showConstructionDashboard, showInventoryPopup, showProfilePopup, showLogPopup, showCraftPlannerPopup, showHerbariumPopup,
  showBestiaryPopup);
  const mainRoot = document.getElementById('content');
  if (mainRoot) {
    renderHeader(mainRoot);
  }
  initBottomMenu();
  const loaded = await loadGame();
  if (!loaded) {
    initSetupUI(startGame);
    return;
  }

  const setupDiv = document.getElementById('setup');
  if (setupDiv) setupDiv.style.display = 'none';
  const createSteps = document.querySelector('.create-steps');
  const createStepContent = document.getElementById('create-step-content');
  if (createSteps instanceof HTMLElement) createSteps.style.display = 'none';
  if (createStepContent instanceof HTMLElement) createStepContent.style.display = 'none';
  removeLandingTheme();
  initGameUI();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    void init();
  });
} else {
  void init();
}

/** @type {any} */ (window).Game = { store, saveGame };
