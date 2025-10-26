// @ts-nocheck
import { biomes, getBiome } from './biomes.js';
import {
  difficulties,
  difficultySettings,
  defaultWorldParameters,
  resolveWorldParameters,
  difficultyScore,
  getDifficultyPreset
} from './difficulty.js';
import {
  computeCenteredStart,
  DEFAULT_MAP_HEIGHT,
  DEFAULT_MAP_WIDTH,
  generateColorMap,
  isWaterTerrain
} from './map.js';
import { createMapView } from './mapView.js';
import { ensureSanityCheckToasts } from './notifications.js';
import {
  getAvailableThemes,
  getTheme,
  getThemeDefinition,
  getThemeAppearance,
  onThemeChange,
  setTheme,
  setThemeAppearance
} from './theme.js';
import {
  getWorldConfig,
  onWorldConfigChange,
  updateWorldConfig
} from './state.js';

const seasons = [
  { id: 'Thawbound', label: 'Spring', icon: '🌱' },
  { id: 'Sunheight', label: 'Summer', icon: '☀️' },
  { id: 'Emberwane', label: 'Autumn', icon: '🍂' },
  { id: 'Frostshroud', label: 'Winter', icon: '❄️' }
];

const difficultyFlavors = {
  easy: 'forgiving',
  normal: 'balanced',
  hard: 'brutal',
  custom: 'tailored'
};

const PREVIEW_MAP_SIZE = 128;

const DARK_TILE_BASE_COLOR = '#7d7f81';
const DARK_TILE_HOVER_LIFT = 0.08;
const LIGHT_TILE_BASE_COLOR = '#f2f4ff';
const LIGHT_TILE_HOVER_LIFT = 0.08;

const PRIMARY_WORLD_PARAMETERS = [
  {
    id: 'oreDensity',
    path: ['oreDensity'],
    label: 'Ore Density',
    hint: 'Likelihood of exposed ore veins.',
    min: 0,
    max: 100,
    step: 1
  },
  {
    id: 'waterTable',
    path: ['waterTable'],
    label: 'Water Table',
    hint: 'Baseline access to groundwater and springs.',
    min: 0,
    max: 100,
    step: 1
  },
  {
    id: 'temperature',
    path: ['temperature'],
    label: 'Temperature',
    hint: 'Relative warmth influencing open ground.',
    min: 0,
    max: 100,
    step: 1
  },
  {
    id: 'rainfall',
    path: ['rainfall'],
    label: 'Rainfall',
    hint: 'Moisture levels that drive vegetation density.',
    min: 0,
    max: 100,
    step: 1
  },
  {
    id: 'mountains',
    path: ['mountains'],
    label: 'Mountains',
    hint: 'Terrain ruggedness and elevation swings.',
    min: 0,
    max: 100,
    step: 1
  },
  {
    id: 'rivers100',
    path: ['rivers100'],
    label: 'Rivers (100 tiles)',
    hint: 'Presence of flowing water near the start.',
    min: 0,
    max: 100,
    step: 1
  },
  {
    id: 'lakes100',
    path: ['lakes100'],
    label: 'Lakes (100 tiles)',
    hint: 'Probability of still water nearby.',
    min: 0,
    max: 100,
    step: 1
  }
];

const ADVANCED_WORLD_PARAMETERS = [
  {
    id: 'advanced.elevationBase',
    path: ['advanced', 'elevationBase'],
    label: 'Elevation Base',
    hint: 'Adjusts the average terrain height.',
    min: 0,
    max: 100,
    step: 1
  },
  {
    id: 'advanced.elevationVariance',
    path: ['advanced', 'elevationVariance'],
    label: 'Elevation Variance',
    hint: 'Controls how steep or flat the landscape feels.',
    min: 0,
    max: 100,
    step: 1
  },
  {
    id: 'advanced.elevationScale',
    path: ['advanced', 'elevationScale'],
    label: 'Elevation Scale',
    hint: 'Sets the scale of elevation noise patterns.',
    min: 0,
    max: 100,
    step: 1
  },
  {
    id: 'advanced.vegetationScale',
    path: ['advanced', 'vegetationScale'],
    label: 'Vegetation Scale',
    hint: 'How clustered forests and clearings appear.',
    min: 0,
    max: 100,
    step: 1
  },
  {
    id: 'advanced.oreNoiseScale',
    path: ['advanced', 'oreNoiseScale'],
    label: 'Ore Noise Scale',
    hint: 'Controls size of ore-rich pockets.',
    min: 0,
    max: 100,
    step: 1
  },
  {
    id: 'advanced.oreThresholdOffset',
    path: ['advanced', 'oreThresholdOffset'],
    label: 'Ore Threshold Offset',
    hint: 'Bias for how easily ore tiles appear.',
    min: 0,
    max: 100,
    step: 1
  },
  {
    id: 'advanced.waterGuaranteeRadius',
    path: ['advanced', 'waterGuaranteeRadius'],
    label: 'Water Guarantee Radius',
    hint: 'Radius checked to ensure starter water.',
    min: 0,
    max: 100,
    step: 1
  },
  {
    id: 'advanced.waterFlowMultiplier',
    path: ['advanced', 'waterFlowMultiplier'],
    label: 'Water Flow Multiplier',
    hint: 'Scales river strength and drainage (50 is balanced).',
    min: 0,
    max: 100,
    step: 1
  }
];

const ALL_WORLD_PARAMETERS = [...PRIMARY_WORLD_PARAMETERS, ...ADVANCED_WORLD_PARAMETERS];

const PARAMETER_CATEGORIES = [
  {
    id: 'water',
    label: 'Water',
    parameters: [
      'waterTable',
      'rivers100',
      'lakes100',
      'advanced.waterGuaranteeRadius',
      'advanced.waterFlowMultiplier'
    ]
  },
  { id: 'ore', label: 'Ore', parameters: ['oreDensity', 'advanced.oreNoiseScale', 'advanced.oreThresholdOffset'] },
  { id: 'fauna', label: 'Fauna', parameters: ['advanced.elevationVariance'] },
  { id: 'flora', label: 'Flora', parameters: ['rainfall', 'advanced.vegetationScale'] },
  { id: 'climate', label: 'Climate', parameters: ['temperature', 'advanced.elevationBase'] },
  { id: 'events', label: 'Events', parameters: ['mountains'] },
  { id: 'misc', label: 'Misc', parameters: ['advanced.elevationScale'] }
];

function clampParameter(value, min = 0, max = 100) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return min;
  if (numeric < min) return min;
  if (numeric > max) return max;
  return Math.round(numeric);
}

function cloneWorldParameters(source = defaultWorldParameters) {
  const resolved = resolveWorldParameters(source);
  return {
    ...resolved,
    advanced: { ...resolved.advanced }
  };
}

function getPathValue(target, path = []) {
  return path.reduce((acc, key) => {
    if (!acc || typeof acc !== 'object') return undefined;
    return acc[key];
  }, target);
}

function setPathValue(target, path = [], value) {
  if (!path.length) return;
  let cursor = target;
  for (let index = 0; index < path.length - 1; index += 1) {
    const key = path[index];
    if (!cursor[key] || typeof cursor[key] !== 'object') {
      cursor[key] = {};
    }
    cursor = cursor[key];
  }
  cursor[path[path.length - 1]] = value;
}

function parameterKeyFromPath(path = []) {
  return path.join('.');
}

function getFocusableElements(container) {
  if (!container) return [];
  const selectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',');
  return Array.from(container.querySelectorAll(selectors)).filter(element => {
    if (!(element instanceof HTMLElement)) return false;
    if (element.hidden) return false;
    const ariaHidden = element.getAttribute('aria-hidden');
    return ariaHidden !== 'true';
  });
}

function formatThemeLabel(id, fallback = '') {
  if (!id || typeof id !== 'string') {
    return fallback;
  }
  return id
    .split('-')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function createSeed() {
  if (typeof crypto !== 'undefined' && crypto?.getRandomValues) {
    return crypto.getRandomValues(new Uint32Array(1))[0].toString(36);
  }
  return Math.trunc(Date.now() * Math.random()).toString(36);
}

export function initSetupUI(onStart) {
  ensureSanityCheckToasts();
  const rootCandidate = document.getElementById('content');
  const placeholder = document.getElementById('setup');
  const contentRoot = rootCandidate || placeholder || document.body;

  if (placeholder && contentRoot !== placeholder && placeholder.parentElement) {
    placeholder.parentElement.removeChild(placeholder);
  } else if (placeholder) {
    placeholder.innerHTML = '';
  }

  const existingNav = contentRoot.querySelector('.create-steps');
  if (existingNav?.parentElement === contentRoot) {
    existingNav.parentElement.removeChild(existingNav);
  }
  const existingSection = contentRoot.querySelector('#create-step-content');
  if (existingSection?.parentElement === contentRoot) {
    existingSection.parentElement.removeChild(existingSection);
  }

  document.body.classList.add('landing-active');

  const gameMount = contentRoot.querySelector('#game');
  const insertionPoint = gameMount && contentRoot.contains(gameMount) ? gameMount : null;

  // MIGRATION: Setup UI now mounts navigation and content directly inside #content.
  const template = document.createElement('template');
  template.innerHTML = `
    <header class="setup-appbar" role="banner">
      <div class="setup-appbar__title">World Setup</div>
      <button
        id="difficulty-toggle"
        type="button"
        class="icon-ghost"
        aria-haspopup="dialog"
        aria-expanded="false"
        aria-controls="difficulty-modal"
        aria-label="Adjust difficulty"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          focusable="false"
          class="icon-ghost__glyph"
        >
          <path
            d="M4 6h16M4 12h16M4 18h16"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          ></path>
          <circle cx="9" cy="6" r="2" fill="currentColor"></circle>
          <circle cx="15" cy="12" r="2" fill="currentColor"></circle>
          <circle cx="12" cy="18" r="2" fill="currentColor"></circle>
        </svg>
      </button>
    </header>
    <dialog
      id="difficulty-modal"
      class="modal"
      aria-labelledby="difficulty-modal-title"
    >
      <div class="modal__card difficulty-modal">
        <header class="modal__header">
          <div class="modal__title">
            <h2 class="difficulty-modal__title" id="difficulty-modal-title">Difficulty</h2>
            <div class="difficulty-modal__meta">
              <div class="difficulty-score" id="difficulty-score" role="status" aria-live="polite"></div>
              <div class="difficulty-tip" id="difficulty-tip"></div>
            </div>
          </div>
          <button
            id="difficulty-close"
            type="button"
            class="modal__close"
            aria-label="Close difficulty settings"
          >
            ✕
          </button>
        </header>
        <div class="modal__body">
          <div class="difficulty-modal__preset-field">
            <label class="difficulty-modal__preset-label" for="difficulty-preset">Preset</label>
            <select id="difficulty-preset" class="difficulty-modal__preset"></select>
          </div>
          <div
            class="difficulty-modal__tabs"
            role="tablist"
            aria-label="Difficulty parameter categories"
            data-role="difficulty-tabs"
          ></div>
          <div class="difficulty-modal__panels" data-role="difficulty-panels"></div>
        </div>
        <footer class="modal__footer">
          <button id="difficulty-reset" type="button" class="btn btn--ghost">Reset</button>
          <div class="spacer" aria-hidden="true"></div>
          <button id="difficulty-apply" type="button" class="btn btn--primary">Apply</button>
        </footer>
      </div>
    </dialog>
    <section id="create-step-content" aria-live="polite">
      <div class="setup">
        <div class="setup__column setup__column--primary">
          <div class="card section" id="biome-card">
            <div class="section__title">Starting Season</div>
            <div class="segment" id="season-seg"></div>
            <div class="section__title">Biome</div>
            <div class="grid" id="biome-grid"></div>
            <div class="sub" id="biome-details"></div>
          </div>
        </div>
        <div class="setup__column setup__column--preview">
          <div class="card section map-section">
            <div class="map-seed">
              <label class="map-seed__label" for="seed-input">World Seed</label>
              <div class="seed-row">
                <input id="seed-input" class="input" placeholder="Enter seed or leave blank for random" autocomplete="off">
                <button id="seed-rand" type="button" class="btn btn--ghost" aria-label="Randomize seed">🎲 Random</button>
              </div>
            </div>
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
    </section>
  `;

  const fragment = template.content;
  contentRoot.insertBefore(fragment, insertionPoint);

  const stepContent = contentRoot.querySelector('#create-step-content');
  const setupRoot = stepContent?.querySelector('.setup');
  const appBar = contentRoot.querySelector('.setup-appbar');
  const difficultyModal = contentRoot.querySelector('#difficulty-modal');
  const difficultyToggle = contentRoot.querySelector('#difficulty-toggle');
  const difficultyCloseBtn = difficultyModal?.querySelector('#difficulty-close');
  const difficultyResetBtn = difficultyModal?.querySelector('#difficulty-reset');
  const difficultyApplyBtn = difficultyModal?.querySelector('#difficulty-apply');
  const difficultyTabsRoot = difficultyModal?.querySelector('[data-role="difficulty-tabs"]');
  const difficultyPanelsRoot = difficultyModal?.querySelector('[data-role="difficulty-panels"]');
  const difficultyTip = difficultyModal?.querySelector('#difficulty-tip');
  const difficultyScoreBadge = difficultyModal?.querySelector('#difficulty-score');
  const presetSelect = difficultyModal?.querySelector('#difficulty-preset');

  if (!stepContent || !setupRoot || !appBar || !difficultyModal || !difficultyToggle || !difficultyTabsRoot || !difficultyPanelsRoot) {
    throw new Error('Unable to initialize setup UI layout.');
  }

  stepContent.hidden = false;
  stepContent.style.display = '';

  const existingSettingsFloat = document.querySelector('.settings-float');
  if (existingSettingsFloat?.parentElement) {
    existingSettingsFloat.parentElement.removeChild(existingSettingsFloat);
  }

  const heroSettings = document.createElement('div');
  heroSettings.className = 'settings-float';

  const landingSettingsTrigger = document.createElement('button');
  landingSettingsTrigger.id = 'landing-settings-btn';
  landingSettingsTrigger.type = 'button';
  landingSettingsTrigger.className = 'icon-gear';
  landingSettingsTrigger.setAttribute('aria-haspopup', 'true');
  landingSettingsTrigger.setAttribute('aria-expanded', 'false');
  landingSettingsTrigger.setAttribute('aria-controls', 'landing-settings-panel');
  landingSettingsTrigger.setAttribute('aria-label', 'Settings');
  landingSettingsTrigger.title = 'Settings';

  const gearGlyph = document.createElement('span');
  gearGlyph.setAttribute('aria-hidden', 'true');
  gearGlyph.textContent = '⚙️';
  landingSettingsTrigger.appendChild(gearGlyph);

  const landingSettingsPanel = document.createElement('div');
  landingSettingsPanel.id = 'landing-settings-panel';
  landingSettingsPanel.className = 'hero-settings__panel';
  landingSettingsPanel.setAttribute('role', 'dialog');
  landingSettingsPanel.setAttribute('aria-hidden', 'true');
  landingSettingsPanel.setAttribute('aria-labelledby', 'landing-settings-title');
  landingSettingsPanel.innerHTML = `
    <div class="hero-settings__header">
      <div class="badge badge--ok">Alpha</div>
      <div class="hero-settings__title" id="landing-settings-title">Settings</div>
    </div>
    <div class="hero-settings__section">
      <div class="hero-settings__section-title">Theme</div>
      <div class="hero-settings__theme-row" id="landing-theme-grid"></div>
    </div>
  `;

  heroSettings.append(landingSettingsTrigger, landingSettingsPanel);

  const settingsMountTarget = document.body || contentRoot;
  settingsMountTarget.appendChild(heroSettings);

  const landingThemeContainer = landingSettingsPanel.querySelector('#landing-theme-grid');

  const biomeGrid = setupRoot.querySelector('#biome-grid');
  const biomeDetails = setupRoot.querySelector('#biome-details');
  const seasonSeg = setupRoot.querySelector('#season-seg');
  const seedInput = setupRoot.querySelector('#seed-input');
  const seedRandomBtn = setupRoot.querySelector('#seed-rand');
  const mapPreview = setupRoot.querySelector('#map-preview');
  const spawnInfo = setupRoot.querySelector('#spawn-info');
  const randomizeAllBtn = setupRoot.querySelector('#randomize-all');
  const startBtn = setupRoot.querySelector('#start-btn');

  if (!biomeGrid || !biomeDetails || !seasonSeg || !seedInput || !seedRandomBtn || !mapPreview || !spawnInfo || !randomizeAllBtn || !startBtn) {
    throw new Error('Missing setup UI elements.');
  }

  let syncLandingAppearance = () => {};

  const availableThemes = getAvailableThemes();
  const landingThemeButtons = new Map();
  if (landingThemeContainer) {
    landingThemeContainer.innerHTML = '';

    const landingContrastToggle = document.createElement('div');
    landingContrastToggle.className = 'hero-settings__theme-contrast';

    const landingContrastLabel = document.createElement('span');
    landingContrastLabel.className = 'hero-settings__theme-contrast-label';
    landingContrastLabel.textContent = 'Preview contrast';

    const landingContrastControls = document.createElement('div');
    landingContrastControls.className = 'hero-settings__theme-contrast-controls';

    const landingLightToggle = document.createElement('button');
    landingLightToggle.type = 'button';
    landingLightToggle.className = 'hero-settings__theme-contrast-btn';
    landingLightToggle.textContent = 'Light';
    landingLightToggle.setAttribute('aria-pressed', 'false');

    const landingDarkToggle = document.createElement('button');
    landingDarkToggle.type = 'button';
    landingDarkToggle.className = 'hero-settings__theme-contrast-btn';
    landingDarkToggle.textContent = 'Dark';
    landingDarkToggle.setAttribute('aria-pressed', 'false');

    landingContrastControls.append(landingLightToggle, landingDarkToggle);
    landingContrastToggle.append(landingContrastLabel, landingContrastControls);

    const landingThemeGrid = document.createElement('div');
    landingThemeGrid.className = 'hero-settings__theme-grid';

    landingThemeContainer.append(landingContrastToggle, landingThemeGrid);

    syncLandingAppearance = nextAppearance => {
      const contrast = nextAppearance === 'light' ? 'light' : 'dark';
      landingThemeGrid.dataset.contrast = contrast;
      landingLightToggle.classList.toggle('is-active', contrast === 'light');
      landingDarkToggle.classList.toggle('is-active', contrast === 'dark');
      landingLightToggle.setAttribute('aria-pressed', String(contrast === 'light'));
      landingDarkToggle.setAttribute('aria-pressed', String(contrast === 'dark'));
    };

    landingLightToggle.addEventListener('click', () => {
      setThemeAppearance('light');
    });
    landingDarkToggle.addEventListener('click', () => {
      setThemeAppearance('dark');
    });

    availableThemes.forEach(theme => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'hero-settings__theme-btn';
      button.dataset.themeId = theme.id;
      button.dataset.themeAppearance = theme.appearance;
      button.setAttribute('aria-pressed', 'false');
      const displayName = theme.meta?.label || formatThemeLabel(theme.id);
      const announcement = displayName || theme.meta?.emoji || theme.id;
      button.setAttribute('aria-label', `Switch to ${announcement}`);
      button.title = announcement;

      const icon = document.createElement('span');
      icon.className = 'hero-settings__theme-icon';
      icon.textContent = theme.meta?.emoji || '';
      icon.setAttribute('aria-hidden', 'true');

      const label = document.createElement('span');
      label.className = 'hero-settings__theme-label';
      label.textContent = displayName;

      const lightGradient = `linear-gradient(145deg, ${theme.colors.primary.light}, ${theme.colors.secondary.light})`;
      const darkGradient = `linear-gradient(145deg, ${theme.colors.primary.dark}, ${theme.colors.secondary.dark})`;

      button.style.setProperty('--preview-bg-light', lightGradient);
      button.style.setProperty('--preview-bg-dark', darkGradient);
      button.style.setProperty('--preview-border-light', theme.colors.primary.light);
      button.style.setProperty('--preview-border-dark', theme.colors.primary.dark);
      button.style.setProperty('--preview-fg-light', '#18202b');
      button.style.setProperty('--preview-fg-dark', '#f6f8ff');
      button.style.setProperty('--preview-shadow-light', '0 1px 1px rgba(255, 255, 255, 0.55)');
      button.style.setProperty('--preview-shadow-dark', '0 2px 8px rgba(0, 0, 0, 0.55)');

      button.append(icon, label);
      button.addEventListener('click', () => {
        setTheme(theme.id);
        closeLandingSettings({ returnFocus: true });
      });

      landingThemeGrid.appendChild(button);
      landingThemeButtons.set(theme.id, button);
    });

    syncLandingAppearance(getThemeAppearance());
  }

  function updateLandingThemeButtons(themeId = getTheme()) {
    landingThemeButtons.forEach((button, id) => {
      const isActive = id === themeId;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });
  }

  function openLandingSettings() {
    if (!landingSettingsPanel || !landingSettingsTrigger) return;
    landingSettingsPanel.classList.add('is-open');
    landingSettingsPanel.setAttribute('aria-hidden', 'false');
    landingSettingsTrigger.setAttribute('aria-expanded', 'true');
  }

  function closeLandingSettings(options = {}) {
    if (!landingSettingsPanel || !landingSettingsTrigger) return;
    landingSettingsPanel.classList.remove('is-open');
    landingSettingsPanel.setAttribute('aria-hidden', 'true');
    landingSettingsTrigger.setAttribute('aria-expanded', 'false');
    if (options.returnFocus) {
      landingSettingsTrigger.focus();
    }
  }

  if (landingSettingsTrigger && landingSettingsPanel && heroSettings) {
    landingSettingsTrigger.addEventListener('click', event => {
      event.stopPropagation();
      if (landingSettingsPanel.classList.contains('is-open')) {
        closeLandingSettings({ returnFocus: true });
      } else {
        openLandingSettings();
      }
    });

    landingSettingsPanel.addEventListener('click', event => {
      event.stopPropagation();
    });

    document.addEventListener('click', event => {
      if (!heroSettings.contains(event.target)) {
        closeLandingSettings();
      }
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        closeLandingSettings({ returnFocus: true });
      }
    });
  }

  const biomeTiles = [];
  const seasonButtons = [];
  const parameterControls = new Map();
  const categoryTabs = new Map();
  const categoryPanels = new Map();

  let activeCategoryId = PARAMETER_CATEGORIES[0]?.id || null;

  let currentThemeInfo = getThemeDefinition();
  let mapView = null;

  onThemeChange((themeId, themeDefinition) => {
    currentThemeInfo = themeDefinition || getThemeDefinition(themeId);
    syncLandingAppearance(currentThemeInfo?.activeAppearance || getThemeAppearance());
    updateLandingThemeButtons(themeId);
    biomeTiles.forEach(applyTileBackground);
    if (mapView?.setTerrainColors) {
      mapView.setTerrainColors(null, { forceRefresh: true });
    }
  }, {
    immediate: true
  });

  const defaultBiome = biomes.find(b => b.id === 'temperate-deciduous') || biomes[0];
  const defaultSeason = seasons[0];
  const defaultDifficulty = difficulties.find(d => d.id === 'normal') || difficulties[0];

  const parameterDefinitionsById = new Map(ALL_WORLD_PARAMETERS.map(def => [def.id, def]));

  let selectedBiome = defaultBiome?.id || '';
  let selectedSeason = defaultSeason?.id || '';
  let selectedDifficulty = defaultDifficulty?.id || '';
  let worldParameters = cloneWorldParameters(getDifficultyPreset(selectedDifficulty)?.world || defaultWorldParameters);
  let mapSeed = createSeed();
  let mapData = null;
  let spawnCoords = null;
  let spawnPrompt = null;
  let pendingSpawn = null;
  let worldPreviewTimer = null;
  let seedUpdateTimer = null;
  const spawnMarkerId = 'setup-spawn-marker';
  const worldConfigDebounceDelay = 180;
  const seedDispatchDelay = 200;

  const existingConfig = getWorldConfig();
  if (existingConfig?.biome) {
    selectedBiome = existingConfig.biome;
  }
  if (existingConfig?.season) {
    selectedSeason = existingConfig.season;
  }
  if (existingConfig?.difficulty) {
    selectedDifficulty = difficulties.some(item => item.id === existingConfig.difficulty)
      ? existingConfig.difficulty
      : 'custom';
  }
  if (existingConfig?.worldParameters) {
    worldParameters = cloneWorldParameters(existingConfig.worldParameters);
  }
  if (existingConfig?.seed) {
    mapSeed = String(existingConfig.seed);
  }

  const legendEntries = [
    { type: 'open', label: 'Open Land' },
    { type: 'forest', label: 'Forest' },
    { type: 'stone', label: 'Stone Outcrop' },
    { type: 'ore', label: 'Ore Deposits' },
    { type: 'water', label: 'Water' }
  ];
  const legendLabelMap = legendEntries.reduce((acc, entry) => {
    acc[entry.type] = entry.label;
    return acc;
  }, {});

  seedInput.value = mapSeed;

  function resolveBackgroundColor(element, depth = 0, maxDepth = 20) {
    if (!element || depth > maxDepth) return null;
    const styles = getComputedStyle(element);
    const directColor = parseColor(styles.backgroundColor);
    if (directColor && directColor.a > 0) return directColor;
    const imageColor = extractColorFromBackgroundImage(styles.backgroundImage);
    if (imageColor && imageColor.a > 0) return imageColor;
    const parent = element.parentElement;
    if (!parent || depth >= maxDepth) {
      return directColor && directColor.a > 0 ? directColor : imageColor;
    }
    return resolveBackgroundColor(parent, depth + 1, maxDepth);
  }

  function extractColorFromBackgroundImage(backgroundImage) {
    if (!backgroundImage || backgroundImage === 'none') return null;
    const match = backgroundImage.match(/rgba?\([^\)]+\)|#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})/);
    if (!match) return null;
    return parseColor(match[0]);
  }

  function parseColor(colorString) {
    if (!colorString) return null;
    const trimmed = colorString.trim().toLowerCase();
    if (!trimmed || trimmed === 'transparent') {
      return { r: 0, g: 0, b: 0, a: 0 };
    }
    const rgbaMatch = trimmed.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/);
    if (rgbaMatch) {
      const [, r, g, b, a] = rgbaMatch;
      return {
        r: Number(r),
        g: Number(g),
        b: Number(b),
        a: a !== undefined ? Number(a) : 1
      };
    }
    const hexMatch = trimmed.match(/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/);
    if (hexMatch) {
      const value = hexMatch[1];
      if (value.length === 3 || value.length === 4) {
        const [r, g, b, a] = value.split('').map(char => parseInt(char + char, 16));
        return {
          r,
          g,
          b,
          a: value.length === 4 ? a / 255 : 1
        };
      }
      if (value.length === 6 || value.length === 8) {
        const r = parseInt(value.slice(0, 2), 16);
        const g = parseInt(value.slice(2, 4), 16);
        const b = parseInt(value.slice(4, 6), 16);
        const a = value.length === 8 ? parseInt(value.slice(6, 8), 16) / 255 : 1;
        return { r, g, b, a };
      }
    }
    return null;
  }

  function formatColor(color) {
    if (!color) return '';
    const r = Math.round(Math.max(0, Math.min(255, color.r)));
    const g = Math.round(Math.max(0, Math.min(255, color.g)));
    const b = Math.round(Math.max(0, Math.min(255, color.b)));
    const a = typeof color.a === 'number' ? Math.max(0, Math.min(1, color.a)) : 1;
    if (a >= 1) {
      return `rgb(${r}, ${g}, ${b})`;
    }
    return `rgba(${r}, ${g}, ${b}, ${Number(a.toFixed(3))})`;
  }

  function mixColors(color, mixWith, amount) {
    if (!color) return null;
    const weight = Math.max(0, Math.min(1, amount ?? 0));
    const inverse = 1 - weight;
    const baseAlpha = typeof color.a === 'number' ? color.a : 1;
    const mixAlpha = typeof mixWith?.a === 'number' ? mixWith.a : baseAlpha;
    return {
      r: color.r * inverse + (mixWith?.r ?? color.r) * weight,
      g: color.g * inverse + (mixWith?.g ?? color.g) * weight,
      b: color.b * inverse + (mixWith?.b ?? color.b) * weight,
      a: baseAlpha * inverse + mixAlpha * weight
    };
  }

  function lightenColor(color, amount = 0.08) {
    const white = { r: 255, g: 255, b: 255, a: typeof color?.a === 'number' ? color.a : 1 };
    return mixColors(color, white, amount);
  }

  function darkenColor(color, amount = 0.1) {
    const black = { r: 0, g: 0, b: 0, a: typeof color?.a === 'number' ? color.a : 1 };
    return mixColors(color, black, amount);
  }

  function setActive(list, node) {
    list.forEach(item => {
      item.classList.toggle('is-active', item === node);
    });
  }

  function applyTileBackground(button) {
    if (!button) return;
    const appearance = currentThemeInfo?.activeAppearance || currentThemeInfo?.appearance;
    if (appearance === 'dark') {
      const baseHex =
        currentThemeInfo?.colors?.neutral?.dark || currentThemeInfo?.colors?.background?.light || DARK_TILE_BASE_COLOR;
      const baseColor = parseColor(baseHex || DARK_TILE_BASE_COLOR);
      if (baseColor) {
        const hoverColor = lightenColor(baseColor, DARK_TILE_HOVER_LIFT);
        button.style.setProperty('--tile-base-bg', formatColor(baseColor));
        if (hoverColor) {
          button.style.setProperty('--tile-hover-bg', formatColor(hoverColor));
        }
      }
      const accentHex =
        currentThemeInfo?.colors?.accent?.base || currentThemeInfo?.colors?.accent?.light || null;
      const accentColor = parseColor(accentHex);
      if (accentColor) {
        const activeColor = lightenColor(accentColor, 0.22);
        button.style.setProperty('--tile-active-bg', formatColor(activeColor));
      } else {
        button.style.removeProperty('--tile-active-bg');
      }
      return;
    }
    const backgroundHex =
      currentThemeInfo?.colors?.background?.light ||
      currentThemeInfo?.colors?.background?.base ||
      currentThemeInfo?.colors?.neutral?.light ||
      LIGHT_TILE_BASE_COLOR;
    const neutralHex =
      currentThemeInfo?.colors?.neutral?.base ||
      currentThemeInfo?.colors?.background?.base ||
      LIGHT_TILE_BASE_COLOR;
    const backgroundColor = parseColor(backgroundHex) || parseColor(LIGHT_TILE_BASE_COLOR);
    const neutralColor = parseColor(neutralHex);
    let baseColor = backgroundColor;
    if (baseColor && neutralColor) {
      baseColor = mixColors(baseColor, neutralColor, 0.28);
    }
    if (baseColor) {
      button.style.setProperty('--tile-base-bg', formatColor(baseColor));
      const hoverColor = lightenColor(baseColor, LIGHT_TILE_HOVER_LIFT);
      if (hoverColor) {
        button.style.setProperty('--tile-hover-bg', formatColor(hoverColor));
      }
    }
    const accentHex =
      currentThemeInfo?.colors?.accent?.light || currentThemeInfo?.colors?.accent?.base || null;
    const accentColor = parseColor(accentHex);
    if (accentColor) {
      const accentLift = lightenColor(accentColor, 0.25);
      const activeColor = accentLift ? mixColors(accentColor, accentLift, 0.4) : accentColor;
      button.style.setProperty('--tile-active-bg', formatColor(activeColor));
    } else {
      button.style.removeProperty('--tile-active-bg');
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
    const safe = sanitizeSpawnCoords(detail || {});
    if (!safe) return;
    pendingSpawn = { x: safe.x, y: safe.y };
    const question = prompt.querySelector('[data-role="spawn-question"]');
    if (question) {
      question.textContent = safe.relocated
        ? `Water tile unavailable. Spawn at nearest land (${safe.x}, ${safe.y})?`
        : `Spawn here at (${safe.x}, ${safe.y})?`;
    }

    const wrapper = mapView?.elements?.wrapper;
    let anchor = detail?.element || null;
    if (safe.relocated && wrapper) {
      const selector = `[data-world-x="${safe.x}"][data-world-y="${safe.y}"]`;
      const fallbackEl = wrapper.querySelector(selector);
      if (fallbackEl) {
        anchor = fallbackEl;
      }
    }

    if (wrapper && anchor?.getBoundingClientRect) {
      const wrapperRect = wrapper.getBoundingClientRect();
      const tileRect = anchor.getBoundingClientRect();
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

  function findNearestNonWater(map, coords = {}) {
    if (!map?.types?.length) return null;
    const xStart = Number.isFinite(map.xStart) ? Math.trunc(map.xStart) : 0;
    const yStart = Number.isFinite(map.yStart) ? Math.trunc(map.yStart) : 0;
    const height = map.types.length;
    if (!height) return null;
    const targetX = Number.isFinite(coords?.x) ? Math.trunc(coords.x) : null;
    const targetY = Number.isFinite(coords?.y) ? Math.trunc(coords.y) : null;
    let best = null;

    for (let row = 0; row < height; row += 1) {
      const rowData = map.types[row];
      if (!rowData) continue;
      for (let col = 0; col < rowData.length; col += 1) {
        const type = rowData[col];
        if (isWaterTerrain(type)) continue;
        const worldX = xStart + col;
        const worldY = yStart + row;
        const dx = targetX !== null ? worldX - targetX : worldX;
        const dy = targetY !== null ? worldY - targetY : worldY;
        const distance = Math.hypot(dx, dy);
        if (
          !best ||
          distance < best.distance ||
          (distance === best.distance &&
            (Math.abs(worldY) < Math.abs(best.y) ||
              (Math.abs(worldY) === Math.abs(best.y) && Math.abs(worldX) < Math.abs(best.x))))
        ) {
          best = { x: worldX, y: worldY, type, distance };
        }
      }
    }

    return best;
  }

  function sanitizeSpawnCoords(coords = {}) {
    const x = Number.isFinite(coords.x) ? Math.trunc(coords.x) : null;
    const y = Number.isFinite(coords.y) ? Math.trunc(coords.y) : null;
    if (x === null || y === null) return null;
    if (!mapData?.types?.length) {
      return { x, y, terrain: null, relocated: false };
    }
    const terrain = getTerrainAt(mapData, { x, y });
    if (terrain && !isWaterTerrain(terrain)) {
      return { x, y, terrain, relocated: false };
    }
    const nearest = findNearestNonWater(mapData, { x, y });
    if (!nearest) return null;
    const fallbackTerrain = nearest.type || getTerrainAt(mapData, nearest);
    return { x: nearest.x, y: nearest.y, terrain: fallbackTerrain || null, relocated: true };
  }

  function setSpawnCoords(coords = {}, options = {}) {
    if (!coords) return;
    const safe = sanitizeSpawnCoords(coords);
    if (!safe) return;
    spawnCoords = { x: safe.x, y: safe.y };
    if (!options.silent) {
      hideSpawnPrompt();
    }
    updateSpawnMarker();
    updateSpawnInfo();
  }

  function updateSpawnMarker() {
    if (!mapView || typeof mapView.setMarkers !== 'function') return;
    const markers = spawnCoords
      ? [
          {
            id: spawnMarkerId,
            x: spawnCoords.x,
            y: spawnCoords.y,
            icon: '',
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
      spawnInfo.hidden = false;
      spawnInfo.textContent = 'Click the map to choose your starting position.';
      return;
    }
    spawnInfo.textContent = '';
    spawnInfo.hidden = true;
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
    const width = PREVIEW_MAP_SIZE;
    const height = PREVIEW_MAP_SIZE;
    const { xStart, yStart } = computeCenteredStart(width, height);
    mapData = generateColorMap(
      selectedBiome,
      mapSeed,
      xStart,
      yStart,
      width,
      height,
      selectedSeason,
      undefined,
      undefined,
      worldParameters
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

  function attachSetupLegend() {
    if (!mapView?.elements?.controls) return;
    const controlsRoot = mapView.elements.controls;
    const navGrid = controlsRoot.querySelector('.map-nav-grid');
    if (!navGrid) return;
    const host = navGrid.parentElement || controlsRoot;
    const existing = host.querySelector('.map-legend');
    if (existing?.parentElement) {
      existing.parentElement.removeChild(existing);
    }

    const legend = document.createElement('div');
    legend.className = 'map-legend';
    legend.setAttribute('aria-label', 'Terrain legend');
    legend.dataset.role = 'map-legend';
    if (navGrid.style.width) {
      legend.style.width = navGrid.style.width;
      legend.style.maxWidth = navGrid.style.width;
    } else {
      legend.style.width = '100%';
    }

    const title = document.createElement('div');
    title.className = 'map-legend__title';
    title.textContent = 'Terrain Legend';
    legend.appendChild(title);

    const list = document.createElement('div');
    list.className = 'map-legend__list';
    legendEntries.forEach(entry => {
      const item = document.createElement('div');
      item.className = 'map-legend__item';

      const swatch = document.createElement('span');
      swatch.className = 'map-legend__swatch';
      if (entry.type) {
        swatch.dataset.type = entry.type;
      }
      item.appendChild(swatch);

      const label = document.createElement('span');
      label.className = 'map-legend__label';
      label.textContent = entry.label;
      item.appendChild(label);

      list.appendChild(item);
    });
    legend.appendChild(list);

    navGrid.insertAdjacentElement('afterend', legend);
  }

  function activateDifficultyCategory(categoryId) {
    if (!categoryId || !categoryTabs.has(categoryId)) return;
    categoryTabs.forEach((tab, id) => {
      const isActive = id === categoryId;
      tab.classList.toggle('is-active', isActive);
      tab.setAttribute('aria-selected', String(isActive));
      tab.tabIndex = isActive ? 0 : -1;
    });
    categoryPanels.forEach((panel, id) => {
      const isActive = id === categoryId;
      panel.hidden = !isActive;
      panel.setAttribute('aria-hidden', String(!isActive));
    });
    activeCategoryId = categoryId;
  }

  function initializeDifficultyDrawer() {
    if (!difficultyTabsRoot || !difficultyPanelsRoot) return;
    const categories = PARAMETER_CATEGORIES.filter(category => Array.isArray(category.parameters) && category.parameters.length);

    categoryTabs.clear();
    categoryPanels.clear();
    parameterControls.clear();

    difficultyTabsRoot.innerHTML = '';
    difficultyPanelsRoot.innerHTML = '';

    if (presetSelect) {
      presetSelect.innerHTML = '';
      const presetOptions = [...difficulties, { id: 'custom', name: 'Custom' }];
      presetOptions.forEach(option => {
        const opt = document.createElement('option');
        opt.value = option.id;
        const flavor = difficultyFlavors[option.id];
        opt.textContent = flavor ? `${option.name} — ${flavor}` : option.name;
        presetSelect.appendChild(opt);
      });
      presetSelect.addEventListener('change', () => {
        setPreset(presetSelect.value);
      });
    }

    categories.forEach(category => {
      const tabId = `difficulty-tab-${category.id}`;
      const panelId = `difficulty-panel-${category.id}`;

      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'difficulty-modal__tab';
      tab.id = tabId;
      tab.dataset.categoryId = category.id;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-controls', panelId);
      tab.setAttribute('aria-selected', 'false');
      tab.tabIndex = -1;
      tab.textContent = category.label;

      tab.addEventListener('click', () => {
        activateDifficultyCategory(category.id);
        tab.focus();
      });

      tab.addEventListener('keydown', event => {
        if (!categories.length) return;
        const currentIndex = categories.findIndex(item => item.id === category.id);
        if (currentIndex < 0) return;
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
          event.preventDefault();
          const nextCategory = categories[(currentIndex + 1) % categories.length];
          activateDifficultyCategory(nextCategory.id);
          categoryTabs.get(nextCategory.id)?.focus();
        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
          event.preventDefault();
          const prevCategory = categories[(currentIndex - 1 + categories.length) % categories.length];
          activateDifficultyCategory(prevCategory.id);
          categoryTabs.get(prevCategory.id)?.focus();
        } else if (event.key === 'Home') {
          event.preventDefault();
          const firstCategory = categories[0];
          activateDifficultyCategory(firstCategory.id);
          categoryTabs.get(firstCategory.id)?.focus();
        } else if (event.key === 'End') {
          event.preventDefault();
          const lastCategory = categories[categories.length - 1];
          activateDifficultyCategory(lastCategory.id);
          categoryTabs.get(lastCategory.id)?.focus();
        }
      });

      const panel = document.createElement('div');
      panel.id = panelId;
      panel.className = 'difficulty-modal__panel';
      panel.dataset.categoryId = category.id;
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', tabId);
      panel.setAttribute('aria-hidden', 'true');
      panel.hidden = true;

      category.parameters.forEach(parameterId => {
        const def = parameterDefinitionsById.get(parameterId);
        if (!def) return;
        const control = createDifficultyControl(def);
        if (control?.element) {
          panel.appendChild(control.element);
        }
      });

      difficultyTabsRoot.appendChild(tab);
      difficultyPanelsRoot.appendChild(panel);
      categoryTabs.set(category.id, tab);
      categoryPanels.set(category.id, panel);
    });

    const initialCategory =
      (activeCategoryId && categoryTabs.has(activeCategoryId) && activeCategoryId) || categories[0]?.id || null;
    if (initialCategory) {
      activateDifficultyCategory(initialCategory);
    }
    if (presetSelect && selectedDifficulty) {
      presetSelect.value = selectedDifficulty;
    }
  }

  function renderSeasonButtons() {
    if (!seasonSeg) return;
    seasonSeg.innerHTML = '';
    seasonButtons.length = 0;
    seasons.forEach(season => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'seg seg--icon';
      button.dataset.season = season.id;
      const label = season.label || season.id;
      if (label) {
        button.setAttribute('aria-label', label);
        button.title = label;
      }
      button.textContent = season.icon || label;
      button.addEventListener('click', () => {
        updateWorldConfig({ season: season.id });
      });
      seasonButtons.push(button);
      seasonSeg.appendChild(button);
    });
  }

  function renderBiomeTiles() {
    if (!biomeGrid) return;
    biomeGrid.innerHTML = '';
    biomeTiles.length = 0;
    biomes.forEach(biome => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'tile col-4';
      button.dataset.biome = biome.id;
      button.innerHTML = `
        <div class="tile__name">${biome.name}</div>
        <div class="tile__desc">${biome.description || ''}</div>
      `;
      button.addEventListener('click', () => {
        updateWorldConfig({ biome: biome.id });
      });
      biomeTiles.push(button);
      biomeGrid.appendChild(button);
      applyTileBackground(button);
    });
  }

  renderSeasonButtons();
  renderBiomeTiles();
  initializeDifficultyDrawer();

  mapView = createMapView(mapPreview, {
    legendLabels: legendLabelMap,
    showControls: true,
    showLegend: false,
    idPrefix: 'setup-map',
    useTerrainColors: true,
    bufferMargin: 8,
    minZoom: 0.4,
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
        viewport,
        worldParameters
      );
    },
    onMapUpdate: updated => {
      mapData = { ...updated, worldSettings: updated.worldSettings || worldParameters };
      updateSpawnMarker();
      updateSpawnInfo();
    },
    onTileClick: detail => {
      showSpawnPrompt(detail);
    }
  });

  attachSetupLegend();

  let releaseDifficultyFocusTrap = null;
  let lastDifficultyFocus = null;

  const isDifficultyModalOpen = () => {
    if (!difficultyModal) return false;
    if (typeof difficultyModal.open === 'boolean') {
      return difficultyModal.open;
    }
    return difficultyModal.hasAttribute('open');
  };

  const handleDifficultyModalClosed = () => {
    releaseDifficultyFocusTrap?.();
    releaseDifficultyFocusTrap = null;
    difficultyToggle?.setAttribute('aria-expanded', 'false');
    const target = lastDifficultyFocus && 'focus' in lastDifficultyFocus ? lastDifficultyFocus : difficultyToggle;
    if (target && typeof target.focus === 'function') {
      target.focus();
    }
    lastDifficultyFocus = null;
  };

  const trapFocusWithin = container => {
    const handleKeydown = event => {
      if (event.key !== 'Tab') return;
      const focusable = getFocusableElements(container);
      if (!focusable.length) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey) {
        if (!container.contains(active) || active === first) {
          event.preventDefault();
          last.focus();
        }
      } else if (!container.contains(active) || active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    container.addEventListener('keydown', handleKeydown);
    return () => {
      container.removeEventListener('keydown', handleKeydown);
    };
  };

  const openDifficultyModal = () => {
    if (!difficultyModal || !difficultyToggle) return;
    if (isDifficultyModalOpen()) return;
    lastDifficultyFocus = document.activeElement instanceof HTMLElement ? document.activeElement : difficultyToggle;
    if (typeof difficultyModal.showModal === 'function') {
      try {
        difficultyModal.showModal();
      } catch (error) {
        difficultyModal.setAttribute('open', '');
      }
    } else {
      difficultyModal.setAttribute('open', '');
    }
    difficultyToggle.setAttribute('aria-expanded', 'true');
    releaseDifficultyFocusTrap = trapFocusWithin(difficultyModal);
    const focusable = getFocusableElements(difficultyModal);
    (focusable[0] || difficultyCloseBtn || difficultyModal).focus();
  };

  const closeDifficultyModal = () => {
    if (!difficultyModal || !isDifficultyModalOpen()) return;
    if (typeof difficultyModal.close === 'function') {
      try {
        difficultyModal.close();
      } catch (error) {
        difficultyModal.removeAttribute('open');
        handleDifficultyModalClosed();
      }
    } else {
      difficultyModal.removeAttribute('open');
      handleDifficultyModalClosed();
    }
  };

  difficultyToggle.addEventListener('click', () => {
    if (isDifficultyModalOpen()) {
      closeDifficultyModal();
    } else {
      openDifficultyModal();
    }
  });

  difficultyCloseBtn?.addEventListener('click', () => {
    closeDifficultyModal();
  });

  difficultyModal?.addEventListener('cancel', event => {
    event.preventDefault();
    closeDifficultyModal();
  });

  difficultyModal?.addEventListener('click', event => {
    if (event.target === difficultyModal) {
      closeDifficultyModal();
    }
  });

  difficultyModal?.addEventListener('close', handleDifficultyModalClosed);

  difficultyResetBtn?.addEventListener('click', () => {
    const presetId = presetSelect?.value || selectedDifficulty || 'custom';
    setPreset(presetId);
    syncWorldControls();
    updateDifficultyScore();
    updateDifficultyInfo();
    scheduleWorldPreview();
  });

  difficultyApplyBtn?.addEventListener('click', () => {
    updateWorldConfig({
      difficulty: selectedDifficulty,
      worldParameters: cloneWorldParameters(worldParameters)
    });
    closeDifficultyModal();
  });

  syncBiomeSelection(selectedBiome);
  syncSeasonSelection(selectedSeason);
  syncDifficultySelection(selectedDifficulty);
  updateBiomeDetails();
  updateDifficultyInfo();
  updateDifficultyScore();

  function updateBiomeDetails() {
    if (!biomeDetails) return;
    const biome = getBiome(selectedBiome);
    if (!biome) {
      biomeDetails.textContent = '';
      return;
    }
    const features = biome.features?.length ? `Features: ${biome.features.join(', ')}.` : '';
    biomeDetails.textContent = `${biome.name}${biome.description ? ` – ${biome.description}` : ''} ${features}`.trim();
  }

  function updateDifficultyInfo() {
    if (!difficultyTip) return;
    if (!selectedDifficulty) {
      difficultyTip.textContent = '';
      difficultyToggle?.setAttribute('aria-label', 'Difficulty');
      return;
    }
    const preset = getDifficultyPreset(selectedDifficulty);
    const name =
      difficulties.find(d => d.id === selectedDifficulty)?.name ||
      (selectedDifficulty === 'custom' ? 'Custom' : selectedDifficulty);
    if (preset?.start) {
      const { people = 0, foodDays = 0, firewoodDays = 0 } = preset.start;
      difficultyTip.textContent = `${name}: ${people} settlers, ${foodDays} days of food, ${firewoodDays} days of firewood.`;
    } else {
      difficultyTip.textContent = name;
    }
    difficultyToggle?.setAttribute('aria-label', `Adjust difficulty (current: ${name})`);
  }

  function updateDifficultyScore() {
    if (!difficultyScoreBadge) return;
    const score = difficultyScore(worldParameters);
    difficultyScoreBadge.textContent = `Score: ${score}`;
    difficultyScoreBadge.dataset.score = String(score);
  }

  function scheduleWorldPreview() {
    if (worldPreviewTimer) {
      clearTimeout(worldPreviewTimer);
    }
    worldPreviewTimer = setTimeout(() => {
      worldPreviewTimer = null;
      generatePreview();
    }, worldConfigDebounceDelay);
  }

  function syncWorldControls() {
    parameterControls.forEach(control => {
      const value = getPathValue(worldParameters, control.path);
      control.update(value);
    });
  }

  function setPreset(id, options = {}) {
    const { preserveWorld = false, world } = options;
    const nextId = difficultySettings[id] ? id : 'custom';
    let nextWorld;
    if (world) {
      nextWorld = cloneWorldParameters(world);
    } else if (nextId === 'custom' && preserveWorld) {
      nextWorld = cloneWorldParameters(worldParameters);
    } else {
      nextWorld = cloneWorldParameters(getDifficultyPreset(nextId).world);
    }
    const resolved = resolveWorldParameters(nextWorld);
    selectedDifficulty = nextId;
    worldParameters = resolved;
    if (presetSelect && presetSelect.value !== nextId) {
      presetSelect.value = nextId;
    }
    updateWorldConfig({
      difficulty: nextId,
      worldParameters: resolved
    });
  }

  function handleWorldParameterChange(control, rawValue) {
    const { def } = control;
    const value = clampParameter(rawValue, def.min, def.max);
    const next = cloneWorldParameters(worldParameters);
    setPathValue(next, def.path, value);
    const resolved = resolveWorldParameters(next);
    worldParameters = resolved;
    selectedDifficulty = 'custom';
    if (presetSelect && presetSelect.value !== 'custom') {
      presetSelect.value = 'custom';
    }
    control.update(value);
    updateWorldConfig({
      difficulty: 'custom',
      worldParameters: resolved
    });
  }

  function createDifficultyControl(def) {
    const key = parameterKeyFromPath(def.path);
    const wrapper = document.createElement('div');
    wrapper.className = 'difficulty-param';

    const header = document.createElement('div');
    header.className = 'difficulty-param__header';

    const label = document.createElement('label');
    label.className = 'difficulty-param__label';
    const sliderId = `difficulty-slider-${key}`;
    label.setAttribute('for', sliderId);
    label.textContent = def.label;

    const number = document.createElement('input');
    number.type = 'number';
    number.inputMode = 'numeric';
    number.min = String(def.min);
    number.max = String(def.max);
    number.step = String(def.step ?? 1);
    number.className = 'difficulty-param__number';

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.id = sliderId;
    slider.min = String(def.min);
    slider.max = String(def.max);
    slider.step = String(def.step ?? 1);
    slider.className = 'difficulty-param__slider range range__input';

    const rangeWrapper = document.createElement('div');
    rangeWrapper.className = 'difficulty-param__range';
    rangeWrapper.appendChild(slider);

    const valueBadge = document.createElement('button');
    valueBadge.type = 'button';
    valueBadge.className = 'range__value';
    valueBadge.addEventListener('click', () => {
      number.focus();
    });

    const rangeGroup = document.createElement('div');
    rangeGroup.className = 'difficulty-param__range-group';
    rangeGroup.appendChild(rangeWrapper);
    rangeGroup.appendChild(valueBadge);

    const quickValues = Array.from(
      new Set([
        def.min,
        Math.round((def.min + def.max) / 2),
        def.max
      ])
    );
    const quickButtons = [];
    const quickContainer = document.createElement('div');
    quickContainer.className = 'range__chips';
    quickValues.forEach(value => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'range__chip';
      chip.dataset.value = String(value);
      chip.textContent = String(value);
      chip.setAttribute('aria-label', `Set ${def.label} to ${value}`);
      chip.addEventListener('click', () => {
        slider.value = String(value);
        number.value = String(value);
        updateRangeVisuals(value);
        onChange(Number(value));
      });
      quickButtons.push(chip);
      quickContainer.appendChild(chip);
    });

    const hintId = `difficulty-hint-${key}`;
    let hintElement = null;
    if (def.hint) {
      hintElement = document.createElement('div');
      hintElement.className = 'difficulty-param__hint';
      hintElement.id = hintId;
      hintElement.textContent = def.hint;
      slider.setAttribute('aria-describedby', hintId);
      number.setAttribute('aria-describedby', hintId);
    }

    let isSyncing = false;

    const control = {
      def,
      path: def.path,
      element: wrapper,
      update(nextValue) {
        const normalized = clampParameter(nextValue, def.min, def.max);
        const stringValue = String(normalized);
        isSyncing = true;
        slider.value = stringValue;
        number.value = stringValue;
        updateRangeVisuals(normalized);
        isSyncing = false;
      }
    };

    const onChange = value => {
      if (isSyncing) return;
      handleWorldParameterChange(control, value);
    };

    const updateRangeVisuals = value => {
      const resolvedValue = clampParameter(value, def.min, def.max);
      const percentDenominator = def.max - def.min || 1;
      const percent = ((resolvedValue - def.min) / percentDenominator) * 100;
      slider.style.setProperty('--range-progress', `${percent}%`);
      valueBadge.textContent = String(resolvedValue);
      quickButtons.forEach(button => {
        const buttonValue = Number(button.dataset.value);
        if (buttonValue === resolvedValue) {
          button.classList.add('is-active');
        } else {
          button.classList.remove('is-active');
        }
      });
    };

    slider.addEventListener('input', () => {
      const nextValue = Number(slider.value);
      updateRangeVisuals(nextValue);
      onChange(nextValue);
    });
    number.addEventListener('change', () => {
      const nextValue = Number(number.value);
      updateRangeVisuals(nextValue);
      onChange(nextValue);
    });
    number.addEventListener('input', () => {
      if (isSyncing) return;
      if (number.value === '') return;
      const nextValue = Number(number.value);
      updateRangeVisuals(nextValue);
      onChange(nextValue);
    });

    header.appendChild(label);
    header.appendChild(number);
    wrapper.appendChild(header);
    wrapper.appendChild(rangeGroup);
    wrapper.appendChild(quickContainer);
    if (hintElement) {
      wrapper.appendChild(hintElement);
    }

    control.update(getPathValue(worldParameters, def.path));
    parameterControls.set(parameterKeyFromPath(def.path), control);
    return control;
  }

  function randomizeWorldParameters() {
    const next = cloneWorldParameters(defaultWorldParameters);
    ALL_WORLD_PARAMETERS.forEach(def => {
      const span = def.max - def.min;
      const randomValue = def.min + Math.round(Math.random() * span);
      setPathValue(next, def.path, clampParameter(randomValue, def.min, def.max));
    });
    return resolveWorldParameters(next);
  }

  if (!selectedDifficulty) {
    selectedDifficulty = defaultDifficulty?.id || 'custom';
  }
  if (presetSelect) {
    presetSelect.value = selectedDifficulty;
  }

  onThemeChange(() => {
    biomeTiles.forEach(applyTileBackground);
  });

  function syncBiomeSelection(id) {
    const tile = biomeTiles.find(item => item.dataset.biome === id);
    if (tile) {
      setActive(biomeTiles, tile);
    }
  }

  function syncSeasonSelection(id) {
    const seg = seasonButtons.find(item => item.dataset.season === id);
    if (seg) {
      setActive(seasonButtons, seg);
    }
  }

  function syncDifficultySelection(id) {
    if (!presetSelect || !id) return;
    if (presetSelect.value !== id) {
      presetSelect.value = id;
    }
  }

  function syncSeedInput(value) {
    if (typeof value === 'string' && seedInput.value !== value) {
      seedInput.value = value;
    }
  }

  function dispatchSeedChange(value, options = {}) {
    const { immediate = false } = options;
    if (seedUpdateTimer) {
      clearTimeout(seedUpdateTimer);
      seedUpdateTimer = null;
    }
    const trimmed = typeof value === 'string' ? value.trim() : String(value ?? '');
    if (immediate) {
      const nextSeed = trimmed || createSeed();
      mapSeed = nextSeed;
      seedInput.value = nextSeed;
      updateWorldConfig({ seed: nextSeed });
      return;
    }
    if (!trimmed) {
      return;
    }
    seedUpdateTimer = setTimeout(() => {
      seedUpdateTimer = null;
      mapSeed = trimmed;
      updateWorldConfig({ seed: trimmed });
    }, seedDispatchDelay);
  }

  function handleWorldConfigUpdate(config = {}) {
    const { biome, season, difficulty, seed, worldParameters: nextWorld } = config;
    if (biome) {
      selectedBiome = biome;
      syncBiomeSelection(biome);
      updateBiomeDetails();
    }
    if (season) {
      selectedSeason = season;
      syncSeasonSelection(season);
    }
    if (difficulty) {
      selectedDifficulty = difficulty;
      syncDifficultySelection(difficulty);
    }
    if (typeof seed === 'string' && seed && seed !== mapSeed) {
      mapSeed = seed;
      syncSeedInput(seed);
    }
    if (nextWorld) {
      worldParameters = cloneWorldParameters(nextWorld);
      syncWorldControls();
    }
    updateDifficultyInfo();
    updateDifficultyScore();
    scheduleWorldPreview();
  }

  onWorldConfigChange(handleWorldConfigUpdate, { immediate: true });

  updateWorldConfig(
    {
      biome: selectedBiome,
      season: selectedSeason,
      difficulty: selectedDifficulty,
      seed: mapSeed,
      worldParameters
    },
    { force: true }
  );

  seedInput.addEventListener('input', () => {
    const value = seedInput.value;
    if (value.trim()) {
      dispatchSeedChange(value);
    }
  });

  seedInput.addEventListener('change', () => {
    dispatchSeedChange(seedInput.value, { immediate: true });
  });

  seedInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      dispatchSeedChange(seedInput.value, { immediate: true });
    }
  });

  seedRandomBtn.addEventListener('click', () => {
    dispatchSeedChange(createSeed(), { immediate: true });
  });

  randomizeAllBtn.addEventListener('click', () => {
    if (biomeTiles.length) {
      const pick = biomeTiles[Math.floor(Math.random() * biomeTiles.length)];
      selectedBiome = pick.dataset.biome;
      setActive(biomeTiles, pick);
      updateBiomeDetails();
    }

    if (seasonButtons.length) {
      const pick = seasonButtons[Math.floor(Math.random() * seasonButtons.length)];
      selectedSeason = pick.dataset.season;
      setActive(seasonButtons, pick);
    }

    const presetIds = [...difficulties.map(item => item.id), 'custom'];
    const choice = presetIds[Math.floor(Math.random() * presetIds.length)];
    selectedDifficulty = difficultySettings[choice] ? choice : 'custom';
    syncDifficultySelection(selectedDifficulty);

    let nextWorld;
    if (selectedDifficulty === 'custom') {
      nextWorld = randomizeWorldParameters();
    } else {
      nextWorld = cloneWorldParameters(getDifficultyPreset(selectedDifficulty).world);
    }
    worldParameters = resolveWorldParameters(nextWorld);
    syncWorldControls();

    const nextSeed = createSeed();
    seedInput.value = nextSeed;
    mapSeed = nextSeed;

    updateWorldConfig({
      biome: selectedBiome,
      season: selectedSeason,
      difficulty: selectedDifficulty,
      seed: nextSeed,
      worldParameters
    });
  });

  startBtn.addEventListener('click', () => {
    const seedValue = seedInput.value.trim();
    if (seedValue && seedValue !== mapSeed) {
      dispatchSeedChange(seedValue, { immediate: true });
    }
    const snapshot = getWorldConfig();
    onStart({
      biome: snapshot.biome || selectedBiome,
      season: snapshot.season || selectedSeason,
      difficulty: snapshot.difficulty || selectedDifficulty,
      seed: snapshot.seed || mapSeed,
      world: cloneWorldParameters(snapshot.worldParameters || worldParameters),
      spawn: spawnCoords ? { ...spawnCoords } : null
    });
  });
}
