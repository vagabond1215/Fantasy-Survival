// @ts-nocheck
import { biomes, getBiome } from '../biomes.js';
import {
  difficulties,
  difficultySettings,
  defaultWorldParameters,
  resolveWorldParameters,
  difficultyScore,
  getDifficultyPreset
} from '../difficulty.js';
import {
  computeCenteredStart,
  DEFAULT_MAP_HEIGHT,
  DEFAULT_MAP_WIDTH,
  generateColorMap,
  isWaterTerrain
} from '../map.js';
import { createMapView } from '../mapView.js';
import { ensureSanityCheckToasts } from '../notifications.js';
import {
  getAvailableThemes,
  getTheme,
  getThemeDefinition,
  getThemeAppearance,
  onThemeChange,
  setTheme,
  setThemeAppearance
} from '../theme.js';
import store, {
  getWorldConfig,
  onWorldConfigChange,
  updateWorldConfig
} from '../state.js';
import { BIOME_STARTER_OPTIONS } from '../world/biome/startingBiomes.js';
import { WheelSelect } from './components/WheelSelect.ts';

const seasons = [
  { id: 'Thawbound', label: 'Spring', icon: '🌱' },
  { id: 'Sunheight', label: 'Summer', icon: '☀️' },
  { id: 'Emberwane', label: 'Autumn', icon: '🍂' },
  { id: 'Frostshroud', label: 'Winter', icon: '❄️' },
  { id: 'random', label: 'Random', icon: '❔' }
];

const mapTypes = [
  {
    id: 'continent',
    label: 'Continent',
    description: 'Balanced land and water across a broad landmass.'
  },
  {
    id: 'island',
    label: 'Island',
    description: 'Single island surrounded by deep ocean and dramatic coasts.'
  },
  {
    id: 'archipelago',
    label: 'Archipelago',
    description: 'Scattered islands with wide sea lanes and sheltered bays.'
  },
  {
    id: 'coastal',
    label: 'Coastal',
    description: 'Continental shores etched with peninsulas, deltas and inlets.'
  },
  {
    id: 'pangea',
    label: 'Pangea',
    description: 'A near-unbroken supercontinent with sparse open ocean.'
  },
  {
    id: 'inland',
    label: 'Inland',
    description: 'Landlocked expanse dotted with inland seas and great lakes.'
  }
];

const RANDOM_SEASON_ID = 'random';
const RANDOM_BIOME_ID = 'random';

const DEFAULT_MAP_TYPE = mapTypes[0]?.id || 'continent';

function getNonRandomBiomes() {
  return biomes.filter(biome => biome.id !== RANDOM_BIOME_ID);
}

function resolveBiomeId(id, options = {}) {
  const { mode = 'stable', seed } = options;
  if (!id || id !== RANDOM_BIOME_ID) {
    return id;
  }
  const available = getNonRandomBiomes();
  if (!available.length) {
    return biomes[0]?.id || id;
  }
  if (mode === 'random') {
    const index = Math.floor(Math.random() * available.length);
    return available[index].id;
  }
  const source = seed != null ? String(seed) : '';
  if (!source) {
    return available[0].id;
  }
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) >>> 0;
  }
  return available[hash % available.length].id;
}

function getNonRandomSeasons() {
  return seasons.filter(season => season.id !== RANDOM_SEASON_ID);
}

function resolveSeasonId(id, options = {}) {
  const { mode = 'stable', seed } = options;
  if (!id || id !== RANDOM_SEASON_ID) {
    return id;
  }
  const available = getNonRandomSeasons();
  if (!available.length) {
    return seasons[0]?.id || id;
  }
  if (mode === 'random') {
    const index = Math.floor(Math.random() * available.length);
    return available[index].id;
  }
  const source = seed != null ? String(seed) : '';
  if (!source) {
    return available[0].id;
  }
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) >>> 0;
  }
  return available[hash % available.length].id;
}

function normalizeMapType(id) {
  if (!id) {
    return DEFAULT_MAP_TYPE;
  }
  const match = mapTypes.find(type => type.id === id);
  return match ? match.id : DEFAULT_MAP_TYPE;
}

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
  },
  {
    id: 'streams100',
    path: ['streams100'],
    label: 'Streams (100 tiles)',
    hint: 'Small flowing watercourses weaving through the start area.',
    min: 0,
    max: 100,
    step: 1
  },
  {
    id: 'ponds100',
    path: ['ponds100'],
    label: 'Ponds (100 tiles)',
    hint: 'Chance of shallow pond basins and vernal pools forming nearby.',
    min: 0,
    max: 100,
    step: 1
  },
  {
    id: 'marshSwamp',
    path: ['marshSwamp'],
    label: 'Marsh & Swamp',
    hint: 'Bias toward saturated marsh flats and wooded swampland.',
    min: 0,
    max: 100,
    step: 1
  },
  {
    id: 'bogFen',
    path: ['bogFen'],
    label: 'Bog & Fen',
    hint: 'Preference for peat bogs and spring-fed fens in lowlands.',
    min: 0,
    max: 100,
    step: 1
  },
  {
    id: 'mapIslands',
    path: ['mapIslands'],
    label: 'Island Density',
    hint: 'Adjusts how broken apart coastlines and land bridges become.',
    min: 0,
    max: 100,
    step: 1
  }
];

const ADVANCED_WORLD_PARAMETERS = [
  {
    id: 'mapElevationMax',
    path: ['mapElevationMax'],
    label: 'Elevation Bias',
    hint: 'Raises or lowers the overall terrain height relative to sea level.',
    min: 0,
    max: 100,
    step: 1
  },
  {
    id: 'mapElevationVariance',
    path: ['mapElevationVariance'],
    label: 'Terrain Variance',
    hint: 'Controls the contrast between lowlands and peaks across the world.',
    min: 0,
    max: 100,
    step: 1
  },
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
    id: 'landmass',
    label: 'Landmass',
    parameters: [
      'mountains',
      'mapIslands',
      'mapElevationMax',
      'mapElevationVariance',
      'advanced.elevationBase',
      'advanced.elevationVariance',
      'advanced.elevationScale'
    ]
  },
  {
    id: 'water',
    label: 'Water',
    parameters: [
      'waterTable',
      'rivers100',
      'lakes100',
      'streams100',
      'ponds100',
      'marshSwamp',
      'bogFen',
      'advanced.waterGuaranteeRadius',
      'advanced.waterFlowMultiplier'
    ]
  },
  { id: 'ore', label: 'Ore', parameters: ['oreDensity', 'advanced.oreNoiseScale', 'advanced.oreThresholdOffset'] },
  { id: 'flora', label: 'Flora', parameters: ['rainfall', 'advanced.vegetationScale'] },
  { id: 'climate', label: 'Climate', parameters: ['temperature'] }
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
      <label class="setup-appbar__title" for="seed-input">World Seed</label>
      <div class="setup-appbar__seed">
        <div class="seed-row">
          <input id="seed-input" class="input" placeholder="Enter seed or leave blank for random" autocomplete="off">
          <button id="seed-rand" type="button" class="icon-ghost" aria-label="Randomize seed">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              focusable="false"
              class="icon-ghost__glyph"
            >
              <rect
                x="5"
                y="5"
                width="14"
                height="14"
                rx="3"
                ry="3"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
              ></rect>
              <circle cx="9" cy="9" r="1.5" fill="currentColor"></circle>
              <circle cx="15" cy="9" r="1.5" fill="currentColor"></circle>
              <circle cx="9" cy="15" r="1.5" fill="currentColor"></circle>
              <circle cx="15" cy="15" r="1.5" fill="currentColor"></circle>
              <circle cx="12" cy="12" r="1.5" fill="currentColor"></circle>
            </svg>
          </button>
        </div>
      </div>
      <div class="setup-appbar__actions">
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
        <button id="start-btn" type="button" class="btn btn--primary">Start</button>
      </div>
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
            <div class="season-row">
              <div class="season-label section__title">Starting Season</div>
              <div class="season-switch" id="season-seg"></div>
            </div>
            <div class="section__title" id="biome-wheel-label">Biome</div>
            <div class="wheel-select-host" id="biome-wheel" aria-describedby="biome-details"></div>
            <div class="sub" id="biome-details"></div>
          </div>
        </div>
        <div class="setup__column setup__column--preview">
          <div class="card section map-section">
            <div class="maptype-row">
              <div class="section__title maptype-label" id="maptype-wheel-label">Map Type</div>
              <div class="wheel-select-host maptype-wheel" id="maptype-wheel" aria-describedby="maptype-details"></div>
            </div>
            <div class="sub" id="maptype-details"></div>
            <div class="map-preview-layout">
              <div id="map-preview" class="map-preview" aria-label="World map preview"></div>
              <div id="map-preview-sidebar" class="map-preview-sidebar"></div>
            </div>
            <p class="sub" id="spawn-info"></p>
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

  const biomeWheelRoot = setupRoot.querySelector('#biome-wheel');
  const biomeDetails = setupRoot.querySelector('#biome-details');
  const seasonSeg = setupRoot.querySelector('#season-seg');
  const mapTypeWheelRoot = setupRoot.querySelector('#maptype-wheel');
  const mapTypeDetails = setupRoot.querySelector('#maptype-details');
  const seedInput = contentRoot.querySelector('#seed-input');
  const seedRandomBtn = contentRoot.querySelector('#seed-rand');
  const mapPreview = setupRoot.querySelector('#map-preview');
  const mapPreviewSidebar = setupRoot.querySelector('#map-preview-sidebar');
  const spawnInfo = setupRoot.querySelector('#spawn-info');
  const startBtn = contentRoot.querySelector('#start-btn');

  if (
    !biomeWheelRoot ||
    !biomeDetails ||
    !seasonSeg ||
    !mapTypeWheelRoot ||
    !mapTypeDetails ||
    !seedInput ||
    !seedRandomBtn ||
    !mapPreview ||
    !mapPreviewSidebar ||
    !spawnInfo ||
    !startBtn
  ) {
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

  const seasonButtons = [];
  const parameterControls = new Map();
  const categoryTabs = new Map();
  const categoryPanels = new Map();

  let activeCategoryId = PARAMETER_CATEGORIES[0]?.id || null;

  let currentThemeInfo = getThemeDefinition();
  let mapView = null;
  let biomeWheel = null;
  let mapTypeWheel = null;

  onThemeChange((themeId, themeDefinition) => {
    currentThemeInfo = themeDefinition || getThemeDefinition(themeId);
    syncLandingAppearance(currentThemeInfo?.activeAppearance || getThemeAppearance());
    updateLandingThemeButtons(themeId);
    if (mapView?.setTerrainColors) {
      mapView.setTerrainColors(null, { forceRefresh: true });
    }
  }, {
    immediate: true
  });

  const defaultBiome = biomes.find(b => b.id === 'temperate-broadleaf') || biomes[0];
  const defaultSeason = seasons[0];
  const defaultDifficulty = difficulties.find(d => d.id === 'normal') || difficulties[0];

  const parameterDefinitionsById = new Map(ALL_WORLD_PARAMETERS.map(def => [def.id, def]));

  let selectedBiome = defaultBiome?.id || '';
  let selectedSeason = defaultSeason?.id || '';
  let resolvedSeasonId = selectedSeason;
  let selectedDifficulty = defaultDifficulty?.id || '';
  let worldParameters = cloneWorldParameters(getDifficultyPreset(selectedDifficulty)?.world || defaultWorldParameters);
  let selectedMapType = normalizeMapType(worldParameters.mapType);
  let mapSeed = createSeed();
  let resolvedBiomeId = selectedBiome;
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
  const hasConfigStartingBiome = Object.prototype.hasOwnProperty.call(
    existingConfig ?? {},
    'startingBiomeId'
  );
  if (
    hasConfigStartingBiome &&
    existingConfig.startingBiomeId !== null &&
    existingConfig.startingBiomeId !== undefined
  ) {
    selectedBiome = existingConfig.startingBiomeId;
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
    selectedMapType = normalizeMapType(worldParameters.mapType);
  }
  if (existingConfig?.seed) {
    mapSeed = String(existingConfig.seed);
  }

  resolvedSeasonId = resolveSeasonId(selectedSeason, { mode: 'stable', seed: mapSeed });
  resolvedBiomeId = resolveBiomeId(selectedBiome, { mode: 'stable', seed: mapSeed });

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

  function relativeLuminance(color) {
    if (!color) return 0;
    const [r, g, b] = [color.r ?? 0, color.g ?? 0, color.b ?? 0].map(channel => {
      const value = channel / 255;
      if (value <= 0.03928) {
        return value / 12.92;
      }
      return Math.pow((value + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  function computeContrastRatio(foreground, background) {
    if (!foreground || !background) return 1;
    const fgLum = relativeLuminance(foreground);
    const bgLum = relativeLuminance(background);
    const lighter = Math.max(fgLum, bgLum);
    const darker = Math.min(fgLum, bgLum);
    return (lighter + 0.05) / (darker + 0.05);
  }

  function ensureContrastColor(preferredColor, backgroundColor, minimumRatio = 4.5) {
    if (!backgroundColor) {
      return preferredColor || parseColor('#ffffff');
    }

    const backgroundLum = relativeLuminance(backgroundColor);
    const preferredTarget = parseColor(backgroundLum > 0.5 ? '#111827' : '#f9fafb');
    const alternateTarget = parseColor(backgroundLum > 0.5 ? '#f9fafb' : '#111827');

    const candidates = [];
    if (preferredColor) {
      candidates.push({ color: preferredColor, ratio: computeContrastRatio(preferredColor, backgroundColor) });
    }
    if (preferredTarget) {
      candidates.push({ color: preferredTarget, ratio: computeContrastRatio(preferredTarget, backgroundColor) });
    }
    if (alternateTarget) {
      candidates.push({ color: alternateTarget, ratio: computeContrastRatio(alternateTarget, backgroundColor) });
    }

    let best = candidates.sort((a, b) => b.ratio - a.ratio)[0];
    if (!best) {
      return parseColor('#ffffff');
    }

    if (best.ratio >= minimumRatio) {
      return best.color;
    }

    const blendTarget = parseColor(backgroundLum > 0.5 ? '#000000' : '#ffffff');
    let adjusted = best.color;
    let ratio = best.ratio;
    for (let step = 0; step < 6 && ratio < minimumRatio; step += 1) {
      adjusted = mixColors(adjusted, blendTarget, 0.35);
      ratio = computeContrastRatio(adjusted, backgroundColor);
    }

    return ratio >= minimumRatio ? adjusted : best.color;
  }

  function setActive(list, node) {
    list.forEach(item => {
      item.classList.toggle('is-active', item === node);
    });
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
      biomeId: resolvedBiomeId || selectedBiome,
      seed: mapData?.seed ?? mapSeed,
      season: mapData?.season ?? resolvedSeasonId
    });
    updateSpawnMarker();
    updateSpawnInfo();
  }

  function generatePreview() {
    if (!selectedBiome || !mapPreview) return;
    const width = PREVIEW_MAP_SIZE;
    const height = PREVIEW_MAP_SIZE;
    const { xStart, yStart } = computeCenteredStart(width, height);
    const previewBiome = resolveBiomeId(selectedBiome, {
      mode: 'stable',
      seed: mapSeed
    });
    resolvedBiomeId = previewBiome;
    const previewSeason = resolveSeasonId(selectedSeason, {
      mode: 'stable',
      seed: mapSeed
    });
    resolvedSeasonId = previewSeason;
    mapData = generateColorMap(
      previewBiome,
      mapSeed,
      xStart,
      yStart,
      width,
      height,
      previewSeason,
      undefined,
      undefined,
      worldParameters,
      false
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
    updateBiomeDetails();
  }

  function attachSetupLegend() {
    const mapHost = mapView?.elements?.stage || mapView?.elements?.wrapper;
    if (!mapHost) return;

    const existingToggle = mapHost.querySelector('[data-role="legend-toggle"]');
    if (existingToggle?.parentElement) {
      existingToggle.parentElement.removeChild(existingToggle);
    }

    const existingOverlay = mapHost.querySelector('[data-role="map-legend-overlay"]');
    if (existingOverlay?.parentElement) {
      existingOverlay.parentElement.removeChild(existingOverlay);
    }

    const legendId = 'setup-map-legend';

    const overlay = document.createElement('div');
    overlay.className = 'map-legend-overlay';
    overlay.dataset.role = 'map-legend-overlay';
    overlay.id = legendId;
    overlay.hidden = true;
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Terrain legend');
    overlay.setAttribute('aria-hidden', 'true');
    overlay.tabIndex = -1;

    const overlayPanel = document.createElement('div');
    overlayPanel.className = 'map-legend-overlay__panel';

    const legendSurface = document.createElement('div');
    legendSurface.className = 'map-legend';
    legendSurface.dataset.role = 'map-legend';
    legendSurface.setAttribute('role', 'document');
    legendSurface.tabIndex = -1;

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'map-legend__close';
    closeButton.setAttribute('aria-label', 'Close terrain legend');
    closeButton.innerHTML = '<span aria-hidden="true">×</span>';
    legendSurface.appendChild(closeButton);

    const list = document.createElement('div');
    list.className = 'map-legend__list';
    list.setAttribute('role', 'list');
    legendEntries.forEach(entry => {
      const item = document.createElement('div');
      item.className = 'map-legend__item';
      item.setAttribute('role', 'listitem');

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
    legendSurface.appendChild(list);

    overlayPanel.appendChild(legendSurface);
    overlay.appendChild(overlayPanel);

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'map-legend-toggle';
    toggle.dataset.role = 'legend-toggle';
    toggle.setAttribute('aria-label', 'Show terrain legend');
    toggle.setAttribute('aria-controls', legendId);
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-haspopup', 'dialog');

    const toggleIcon = document.createElement('span');
    toggleIcon.className = 'map-legend-toggle__icon';
    toggleIcon.setAttribute('aria-hidden', 'true');
    toggleIcon.textContent = '?';
    toggle.appendChild(toggleIcon);

    const updateToggleState = isOpen => {
      toggle.setAttribute('aria-expanded', String(isOpen));
      toggle.setAttribute('aria-label', isOpen ? 'Hide terrain legend' : 'Show terrain legend');
      toggle.classList.toggle('is-active', isOpen);
      overlay.setAttribute('aria-hidden', String(!isOpen));
    };

    const focusableSelector = [
      'button:not([disabled])',
      '[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ].join(',');

    const getFocusableElements = () =>
      Array.from(overlay.querySelectorAll(focusableSelector)).filter(element => {
        return (
          element.offsetParent !== null ||
          element.getClientRects().length > 0 ||
          element === document.activeElement
        );
      });

    const focusFirstElement = () => {
      const focusable = getFocusableElements();
      const target = focusable.length ? focusable[0] : overlay;
      requestAnimationFrame(() => {
        target.focus();
      });
    };

    const closeLegend = () => {
      if (overlay.hidden) return;
      overlay.hidden = true;
      updateToggleState(false);
      toggle.focus();
    };

    const openLegend = () => {
      if (!overlay.hidden) return;
      overlay.hidden = false;
      updateToggleState(true);
      focusFirstElement();
    };

    const handleToggle = event => {
      if (event) {
        event.preventDefault();
      }
      if (overlay.hidden) {
        openLegend();
      } else {
        closeLegend();
      }
    };

    toggle.addEventListener('click', handleToggle);
    toggle.addEventListener('keydown', event => {
      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        handleToggle(event);
      }
    });

    closeButton.addEventListener('click', () => {
      closeLegend();
    });

    overlay.addEventListener('pointerdown', event => {
      if (event.target === overlay) {
        event.preventDefault();
        closeLegend();
      }
    });

    overlay.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeLegend();
        return;
      }
      if (event.key === 'Tab') {
        const focusable = getFocusableElements();
        if (!focusable.length) {
          event.preventDefault();
          overlay.focus();
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement;
        if (event.shiftKey) {
          if (active === first || !overlay.contains(active)) {
            event.preventDefault();
            last.focus();
          }
        } else if (active === last) {
          event.preventDefault();
          first.focus();
        }
      }
    });

    mapHost.appendChild(toggle);
    mapHost.appendChild(overlay);
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
      button.className = 'season-switch__button season-switch__button--icon';
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

  renderSeasonButtons();

  const biomeOptions = BIOME_STARTER_OPTIONS.map(option => ({
    id: option.id,
    label: option.label || option.id,
    description: option.description || '',
    color: option.color || null
  }));

  if (biomeWheelRoot) {
    biomeWheel = new WheelSelect(biomeWheelRoot, {
      options: biomeOptions,
      value: selectedBiome,
      ariaLabelledBy: 'biome-wheel-label',
      ariaDescribedBy: 'biome-details',
      onChange: (value, option) => {
        selectedBiome = value;
        updateBiomeDetails();
        scheduleWorldPreview();
        if (option?.description) {
          biomeWheelRoot.title = option.description;
        } else {
          biomeWheelRoot.removeAttribute('title');
        }
      },
      onCommit: value => {
        updateWorldConfig({ startingBiomeId: value });
      }
    });
  }

  const mapTypeOptions = mapTypes.map(type => ({
    id: type.id,
    label: type.label,
    description: type.description || ''
  }));

  if (mapTypeWheelRoot) {
    mapTypeWheel = new WheelSelect(mapTypeWheelRoot, {
      options: mapTypeOptions,
      value: selectedMapType,
      ariaLabelledBy: 'maptype-wheel-label',
      ariaDescribedBy: 'maptype-details',
      onChange: (value, _option) => {
        selectMapType(value, { persist: false });
        scheduleWorldPreview();
      },
      onCommit: value => {
        selectMapType(value, { persist: true });
      }
    });
  }

  initializeDifficultyDrawer();

  mapView = createMapView(mapPreview, {
    legendLabels: legendLabelMap,
    showControls: true,
    showLegend: false,
    idPrefix: 'setup-map',
    useTerrainColors: true,
    bufferMargin: 8,
    minZoom: 0.4,
    controlsContainer: mapPreviewSidebar,
    fetchMap: ({ xStart, yStart, width, height, seed, season, viewport, skipSanityChecks }) => {
      const nextSeed = seed ?? mapSeed;
      const biomeId = resolveBiomeId(selectedBiome, {
        mode: 'stable',
        seed: nextSeed
      });
      resolvedBiomeId = biomeId;
      const resolvedSeason = resolveSeasonId(season ?? selectedSeason, {
        mode: 'stable',
        seed: nextSeed
      });
      resolvedSeasonId = resolvedSeason;
      return generateColorMap(
        biomeId,
        nextSeed,
        xStart,
        yStart,
        width,
        height,
        resolvedSeason,
        mapData?.waterLevel,
        viewport,
        worldParameters,
        Boolean(skipSanityChecks)
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
    if (selectedBiome === RANDOM_BIOME_ID) {
      const parts = [];
      const summary = biome.description ? `${biome.name} – ${biome.description}` : biome.name;
      if (summary) {
        parts.push(summary);
      }
      const resolvedBiome =
        resolvedBiomeId && resolvedBiomeId !== RANDOM_BIOME_ID ? getBiome(resolvedBiomeId) : null;
      if (resolvedBiome) {
        const resolvedSummary = resolvedBiome.description
          ? `${resolvedBiome.name} – ${resolvedBiome.description}`
          : resolvedBiome.name;
        const resolvedFeatures = resolvedBiome.features?.length
          ? `Features: ${resolvedBiome.features.join(', ')}.`
          : '';
        const detailParts = [resolvedSummary, resolvedFeatures].filter(Boolean).join(' ');
        if (detailParts) {
          parts.push(`Currently previewing: ${detailParts}`);
        }
      }
      biomeDetails.textContent = parts.join(' ');
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
    selectedMapType = normalizeMapType(resolved.mapType);
    if (presetSelect && presetSelect.value !== nextId) {
      presetSelect.value = nextId;
    }
    syncMapTypeSelection(selectedMapType);
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
    if (def.hint) {
      label.title = def.hint;
    }

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

    const valueBadge = document.createElement('output');
    valueBadge.className = 'range__value';
    valueBadge.setAttribute('for', sliderId);
    valueBadge.setAttribute('aria-live', 'polite');

    const rangeGroup = document.createElement('div');
    rangeGroup.className = 'difficulty-param__range-group';
    rangeGroup.appendChild(rangeWrapper);
    rangeGroup.appendChild(valueBadge);

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
    };

    slider.addEventListener('input', () => {
      const nextValue = Number(slider.value);
      updateRangeVisuals(nextValue);
      onChange(nextValue);
    });

    header.appendChild(label);
    wrapper.appendChild(header);
    wrapper.appendChild(rangeGroup);

    control.update(getPathValue(worldParameters, def.path));
    parameterControls.set(parameterKeyFromPath(def.path), control);
    return control;
  }

  if (!selectedDifficulty) {
    selectedDifficulty = defaultDifficulty?.id || 'custom';
  }
  if (presetSelect) {
    presetSelect.value = selectedDifficulty;
  }

  function syncBiomeSelection(id) {
    if (biomeWheel) {
      biomeWheel.setValue(id, { silent: true });
      const option = biomeOptions.find(entry => entry.id === id);
      if (option?.description) {
        biomeWheelRoot?.setAttribute('title', option.description);
      } else {
        biomeWheelRoot?.removeAttribute('title');
      }
    }
  }

  function syncMapTypeSelection(id) {
    const normalized = normalizeMapType(id);
    selectedMapType = normalized;
    if (mapTypeWheel) {
      mapTypeWheel.setValue(normalized, { silent: true });
    }
    updateMapTypeDetails();
  }

  function updateMapTypeDetails() {
    if (!mapTypeDetails) return;
    const entry = mapTypes.find(type => type.id === selectedMapType);
    if (!entry) {
      mapTypeDetails.textContent = '';
      mapTypeWheelRoot?.removeAttribute('title');
      return;
    }
    mapTypeDetails.textContent = `${entry.label} – ${entry.description}`;
    if (entry.description) {
      mapTypeWheelRoot?.setAttribute('title', entry.description);
    } else {
      mapTypeWheelRoot?.removeAttribute('title');
    }
  }

  function selectMapType(id, options = {}) {
    const { persist = true } = options;
    const nextId = normalizeMapType(id);
    if (!nextId) return;
    const previousMapType = worldParameters.mapType;
    const next = cloneWorldParameters(worldParameters);
    next.mapType = nextId;
    const resolved = resolveWorldParameters(next);
    const changed = selectedMapType !== nextId || previousMapType !== nextId;
    selectedMapType = nextId;
    worldParameters = resolved;
    if (changed) {
      selectedDifficulty = 'custom';
      if (presetSelect && presetSelect.value !== 'custom') {
        presetSelect.value = 'custom';
      }
    }
    store.worldSettings = cloneWorldParameters(resolved);
    syncMapTypeSelection(nextId);
    if (persist) {
      updateWorldConfig({
        difficulty: selectedDifficulty,
        worldParameters: resolved
      });
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
    const { season, difficulty, seed, worldParameters: nextWorld } = config;
    const hasStartingBiome = Object.prototype.hasOwnProperty.call(config, 'startingBiomeId');
    const nextStartingBiomeId = hasStartingBiome ? config.startingBiomeId : undefined;
    let shouldRefreshBiome = false;
    if (hasStartingBiome && nextStartingBiomeId !== null && nextStartingBiomeId !== undefined) {
      selectedBiome = nextStartingBiomeId;
      syncBiomeSelection(nextStartingBiomeId);
      shouldRefreshBiome = true;
    }
    if (season) {
      selectedSeason = season;
      syncSeasonSelection(season);
      resolvedSeasonId = resolveSeasonId(selectedSeason, {
        mode: 'stable',
        seed: mapSeed
      });
    }
    if (difficulty) {
      selectedDifficulty = difficulty;
      syncDifficultySelection(difficulty);
    }
    if (typeof seed === 'string' && seed && seed !== mapSeed) {
      mapSeed = seed;
      syncSeedInput(seed);
      resolvedSeasonId = resolveSeasonId(selectedSeason, {
        mode: 'stable',
        seed: mapSeed
      });
      shouldRefreshBiome = true;
    }
    if (nextWorld) {
      const clonedWorld = cloneWorldParameters(nextWorld);
      worldParameters = clonedWorld;
      store.worldSettings = cloneWorldParameters(clonedWorld);
      syncWorldControls();
      const normalizedType = normalizeMapType(worldParameters.mapType);
      if (normalizedType !== selectedMapType) {
        selectedMapType = normalizedType;
      }
      syncMapTypeSelection(selectedMapType);
    } else {
      store.worldSettings = null;
    }
    if (shouldRefreshBiome) {
      resolvedBiomeId = resolveBiomeId(selectedBiome, { mode: 'stable', seed: mapSeed });
      updateBiomeDetails();
    }
    updateDifficultyInfo();
    updateDifficultyScore();
    scheduleWorldPreview();
  }

  onWorldConfigChange(handleWorldConfigUpdate, { immediate: true });

  updateWorldConfig(
    {
      startingBiomeId: selectedBiome,
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

  startBtn.addEventListener('click', () => {
    const seedValue = seedInput.value.trim();
    if (seedValue && seedValue !== mapSeed) {
      dispatchSeedChange(seedValue, { immediate: true });
    }
    const snapshot = getWorldConfig();
    const snapshotSeason = snapshot.season || selectedSeason;
    const effectiveSeason = resolveSeasonId(snapshotSeason, {
      mode: snapshotSeason === RANDOM_SEASON_ID ? 'random' : 'stable',
      seed: mapSeed
    });
    resolvedSeasonId = effectiveSeason;
    const hasSnapshotStartingBiome = Object.prototype.hasOwnProperty.call(
      snapshot,
      'startingBiomeId'
    );
    const snapshotStartingBiome = hasSnapshotStartingBiome ? snapshot.startingBiomeId : undefined;
    const baseStartingBiome =
      snapshotStartingBiome !== null && snapshotStartingBiome !== undefined
        ? snapshotStartingBiome
        : selectedBiome;
    const effectiveBiome =
      baseStartingBiome === RANDOM_BIOME_ID
        ? resolvedBiomeId || resolveBiomeId(baseStartingBiome, { mode: 'stable', seed: mapSeed })
        : baseStartingBiome;
    const effectiveBiomeColor = getBiome(effectiveBiome)?.color || null;
    onStart({
      startingBiomeId: effectiveBiome,
      biomeColor: effectiveBiomeColor,
      season: effectiveSeason,
      difficulty: snapshot.difficulty || selectedDifficulty,
      seed: snapshot.seed || mapSeed,
      world: cloneWorldParameters(snapshot.worldParameters || worldParameters),
      spawn: spawnCoords ? { ...spawnCoords } : null
    });
  });
}
