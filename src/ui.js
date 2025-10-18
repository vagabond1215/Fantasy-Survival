// @ts-nocheck
import { biomes, getBiome } from './biomes.js';
import { difficulties, difficultySettings } from './difficulty.js';
import {
  computeCenteredStart,
  DEFAULT_MAP_HEIGHT,
  DEFAULT_MAP_WIDTH,
  generateColorMap,
  TERRAIN_COLORS
} from './map.js';
import { createMapView } from './mapView.js';
import {
  getAvailableThemes,
  getTheme,
  getThemeDefinition,
  onThemeChange,
  setTheme
} from './theme.js';

const seasons = [
  { id: 'Thawbound', label: 'Thawbound', hint: 'emergent thaw' },
  { id: 'Sunheight', label: 'Sunheight', hint: 'high sun' },
  { id: 'Emberwane', label: 'Emberwane', hint: 'fading ember' },
  { id: 'Frostshroud', label: 'Frostshroud', hint: 'deep chill' }
];

const difficultyFlavors = {
  easy: 'forgiving',
  normal: 'balanced',
  hard: 'brutal'
};

const DARK_TILE_BASE_COLOR = '#7d7f81';
const DARK_TILE_HOVER_LIFT = 0.08;
const DARK_TILE_ACTIVE_SHADE = 0.16;

const BIOME_SWATCHES = [
  'linear-gradient(135deg, rgba(96, 115, 255, 0.45), rgba(136, 69, 255, 0.18))',
  'linear-gradient(135deg, rgba(92, 214, 255, 0.45), rgba(73, 116, 255, 0.2))',
  'linear-gradient(135deg, rgba(255, 191, 113, 0.45), rgba(255, 137, 191, 0.2))',
  'linear-gradient(135deg, rgba(96, 255, 182, 0.45), rgba(60, 145, 255, 0.18))',
  'linear-gradient(135deg, rgba(255, 120, 120, 0.45), rgba(255, 215, 132, 0.18))',
  'linear-gradient(135deg, rgba(150, 107, 255, 0.45), rgba(255, 158, 243, 0.18))',
  'linear-gradient(135deg, rgba(132, 232, 255, 0.45), rgba(170, 122, 255, 0.18))',
  'linear-gradient(135deg, rgba(255, 165, 92, 0.45), rgba(109, 227, 243, 0.18))'
];

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

function getBiomeSwatch(id) {
  if (!id) return BIOME_SWATCHES[0];
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) & 0xffffffff;
  }
  const index = Math.abs(hash) % BIOME_SWATCHES.length;
  return BIOME_SWATCHES[index];
}

export function initSetupUI(onStart) {
  const container = document.getElementById('setup') || document.body;
  container.innerHTML = '';

  document.body.classList.add('landing-active');

  const template = document.createElement('template');
  template.innerHTML = `
    <div class="wrap">
      <div class="setup">
        <div class="card hero">
          <div>
            <div class="brand">Fantasy Survival</div>
            <div class="sub">Settle a harsh land. Thrive through seasons. Adapt or vanish.</div>
          </div>
          <div class="hero-settings">
            <button
              id="landing-settings-btn"
              type="button"
              class="hero-settings__trigger"
              aria-haspopup="true"
              aria-expanded="false"
              aria-label="Settings"
              title="Settings"
            >
              ⚙️
            </button>
            <div
              id="landing-settings-panel"
              class="hero-settings__panel"
              role="dialog"
              aria-hidden="true"
              aria-labelledby="landing-settings-title"
            >
              <div class="hero-settings__header">
                <div class="badge badge--ok">Alpha</div>
                <div class="hero-settings__title" id="landing-settings-title">Settings</div>
              </div>
          <div class="hero-settings__section">
            <div class="hero-settings__section-title">Theme</div>
            <div class="hero-settings__theme-row" id="landing-theme-grid"></div>
          </div>
            </div>
          </div>
        </div>

        <div class="card section" id="biome-card">
          <div class="section__title">Biome</div>
          <div class="grid" id="biome-grid"></div>
          <div class="mini-map" id="biome-mini-map" aria-hidden="true"></div>
          <div class="sub" id="biome-details"></div>
        </div>

        <div class="card section">
          <div class="section__title">Starting Season</div>
          <div class="segment" id="season-seg"></div>
        </div>

        <div class="card section">
          <div class="section__title">Difficulty</div>
          <div class="segment" id="difficulty-seg"></div>
          <div class="difficulty-tip" id="difficulty-tip"></div>
        </div>

        <div class="card section">
          <div class="section__title">World Seed</div>
          <div class="seed-row">
            <input id="seed-input" class="input" placeholder="Enter seed or leave blank for random" autocomplete="off">
            <button id="seed-apply" type="button" class="btn btn--ghost">Apply</button>
            <button id="seed-rand" type="button" class="btn btn--ghost" aria-label="Randomize seed">🎲 Random</button>
          </div>
        </div>

        <div class="card section map-section">
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
  `;

  const wrap = template.content.firstElementChild;
  container.appendChild(wrap);

  const biomeGrid = wrap.querySelector('#biome-grid');
  const biomeDetails = wrap.querySelector('#biome-details');
  const biomeMiniMap = wrap.querySelector('#biome-mini-map');
  const seasonSeg = wrap.querySelector('#season-seg');
  const difficultySeg = wrap.querySelector('#difficulty-seg');
  const difficultyTip = wrap.querySelector('#difficulty-tip');
  const seedInput = wrap.querySelector('#seed-input');
  const seedApplyBtn = wrap.querySelector('#seed-apply');
  const seedRandomBtn = wrap.querySelector('#seed-rand');
  const mapPreview = wrap.querySelector('#map-preview');
  const spawnInfo = wrap.querySelector('#spawn-info');
  const randomizeAllBtn = wrap.querySelector('#randomize-all');
  const startBtn = wrap.querySelector('#start-btn');
  const landingSettingsTrigger = wrap.querySelector('#landing-settings-btn');
  const landingSettingsPanel = wrap.querySelector('#landing-settings-panel');
  const heroSettings = wrap.querySelector('.hero-settings');
  const landingThemeContainer = landingSettingsPanel?.querySelector('#landing-theme-grid');

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

    function setLandingPreviewContrast(nextContrast) {
      if (nextContrast !== 'light' && nextContrast !== 'dark') {
        return;
      }
      landingThemeGrid.dataset.contrast = nextContrast;
      landingLightToggle.classList.toggle('is-active', nextContrast === 'light');
      landingDarkToggle.classList.toggle('is-active', nextContrast === 'dark');
      landingLightToggle.setAttribute('aria-pressed', String(nextContrast === 'light'));
      landingDarkToggle.setAttribute('aria-pressed', String(nextContrast === 'dark'));
    }

    landingLightToggle.addEventListener('click', () => {
      setLandingPreviewContrast('light');
    });
    landingDarkToggle.addEventListener('click', () => {
      setLandingPreviewContrast('dark');
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
        closeLandingSettings();
      });

      landingThemeGrid.appendChild(button);
      landingThemeButtons.set(theme.id, button);
    });

    setLandingPreviewContrast('light');
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

  function closeLandingSettings() {
    if (!landingSettingsPanel || !landingSettingsTrigger) return;
    landingSettingsPanel.classList.remove('is-open');
    landingSettingsPanel.setAttribute('aria-hidden', 'true');
    landingSettingsTrigger.setAttribute('aria-expanded', 'false');
  }

  if (landingSettingsTrigger && landingSettingsPanel && heroSettings) {
    landingSettingsTrigger.addEventListener('click', event => {
      event.stopPropagation();
      if (landingSettingsPanel.classList.contains('is-open')) {
        closeLandingSettings();
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
        closeLandingSettings();
      }
    });
  }

  const biomeTiles = [];
  const seasonButtons = [];
  const difficultyButtons = [];

  let currentThemeInfo = getThemeDefinition();

  onThemeChange((themeId, themeDefinition) => {
    currentThemeInfo = themeDefinition || getThemeDefinition(themeId);
    updateLandingThemeButtons(themeId);
    biomeTiles.forEach(applyTileBackground);
  }, {
    immediate: true
  });

  const defaultBiome = biomes.find(b => b.id === 'temperate-deciduous') || biomes[0];
  const defaultSeason = seasons[0];
  const defaultDifficulty = difficulties.find(d => d.id === 'normal') || difficulties[0];

  let selectedBiome = defaultBiome?.id || '';
  let selectedSeason = defaultSeason?.id || '';
  let selectedDifficulty = defaultDifficulty?.id || '';
  let mapSeed = createSeed();
  let mapData = null;
  let mapView = null;
  let spawnCoords = null;
  let spawnPrompt = null;
  let pendingSpawn = null;
  const spawnMarkerId = 'setup-spawn-marker';

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
    if (currentThemeInfo?.appearance === 'dark') {
      const baseHex =
        currentThemeInfo?.colors?.neutral?.dark || currentThemeInfo?.colors?.background?.light || DARK_TILE_BASE_COLOR;
      const baseColor = parseColor(baseHex || DARK_TILE_BASE_COLOR);
      if (baseColor) {
        const hoverColor = lightenColor(baseColor, DARK_TILE_HOVER_LIFT);
        const activeColor = darkenColor(baseColor, DARK_TILE_ACTIVE_SHADE);
        button.style.setProperty('--tile-base-bg', formatColor(baseColor));
        if (hoverColor) {
          button.style.setProperty('--tile-hover-bg', formatColor(hoverColor));
        }
        if (activeColor) {
          button.style.setProperty('--tile-active-bg', formatColor(activeColor));
        }
      }
      return;
    }
    const grandparent = button.parentElement?.parentElement;
    let baseColor = grandparent ? resolveBackgroundColor(grandparent, 0, 0) : null;
    if (!baseColor || baseColor.a === 0) {
      baseColor = resolveBackgroundColor(document.body) || parseColor(getComputedStyle(document.body).backgroundColor);
    }
    if (!baseColor) return;
    const hoverColor = lightenColor(baseColor, 0.06);
    const activeColor = darkenColor(baseColor, 0.12);
    button.style.setProperty('--tile-base-bg', formatColor(baseColor));
    if (hoverColor) {
      button.style.setProperty('--tile-hover-bg', formatColor(hoverColor));
    }
    if (activeColor) {
      button.style.setProperty('--tile-active-bg', formatColor(activeColor));
    }
  }

  function updateBiomeDetails() {
    const biome = getBiome(selectedBiome);
    if (!biome) {
      biomeDetails.textContent = '';
      return;
    }
    const features = biome.features?.length ? `Features: ${biome.features.join(', ')}.` : '';
    biomeDetails.textContent = `${biome.name}${biome.description ? ` – ${biome.description}` : ''} ${features}`.trim();
  }

  function updateBiomePreview() {
    biomeMiniMap.style.background = getBiomeSwatch(selectedBiome);
  }

  function updateDifficultyInfo() {
    if (!selectedDifficulty) {
      difficultyTip.textContent = '';
      return;
    }
    const diff = difficultySettings[selectedDifficulty];
    const name = difficulties.find(d => d.id === selectedDifficulty)?.name || selectedDifficulty;
    if (diff) {
      difficultyTip.textContent = `${name}: ${diff.people} settlers, ${diff.foodDays} days of food, ${diff.firewoodDays} days of firewood.`;
    } else {
      difficultyTip.textContent = name;
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
        if (type === 'water') continue;
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
    if (terrain && terrain !== 'water') {
      return { x, y, terrain, relocated: false };
    }
    const nearest = findNearestNonWater(mapData, { x, y });
    if (!nearest) return null;
    const fallbackTerrain = nearest.type || getTerrainAt(mapData, nearest);
    return { x: nearest.x, y: nearest.y, terrain: fallbackTerrain || null, relocated: true };
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
      const color = TERRAIN_COLORS[entry.type] || '#ffffff';
      swatch.style.background = color;
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

  function updateSpawnMarker() {
    if (!mapView || typeof mapView.setMarkers !== 'function') return;
    const markers = spawnCoords
      ? [
          {
            id: spawnMarkerId,
            x: spawnCoords.x,
            y: spawnCoords.y,
            icon: '🧍',
            className: 'map-marker--spawn',
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
    const width = DEFAULT_MAP_WIDTH;
    const height = DEFAULT_MAP_HEIGHT;
    const { xStart, yStart } = computeCenteredStart(width, height);
    mapData = generateColorMap(
      selectedBiome,
      mapSeed,
      xStart,
      yStart,
      width,
      height,
      selectedSeason
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

  function applySelection(key, value) {
    if (!value) return;
    switch (key) {
      case 'biome':
        if (value === selectedBiome) return;
        selectedBiome = value;
        updateBiomeDetails();
        updateBiomePreview();
        generatePreview();
        break;
      case 'season':
        if (value === selectedSeason) return;
        selectedSeason = value;
        generatePreview();
        break;
      case 'diff':
        if (value === selectedDifficulty) return;
        selectedDifficulty = value;
        updateDifficultyInfo();
        break;
      case 'seed':
        mapSeed = value;
        seedInput.value = mapSeed;
        generatePreview();
        break;
      default:
        break;
    }
  }

  mapView = createMapView(mapPreview, {
    legendLabels: legendLabelMap,
    showControls: true,
    showLegend: false,
    idPrefix: 'setup-map',
    useTerrainColors: true,
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
        viewport
      );
    },
    onMapUpdate: updated => {
      mapData = { ...updated };
      updateSpawnMarker();
      updateSpawnInfo();
    },
    onTileClick: detail => {
      showSpawnPrompt(detail);
    }
  });

  attachSetupLegend();

  biomes.forEach((biome, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tile col-4';
    button.dataset.biome = biome.id;
    button.innerHTML = `
      <div class="tile__name">${biome.name}</div>
      <div class="tile__desc">${biome.description || ''}</div>
    `;
    button.addEventListener('click', () => {
      setActive(biomeTiles, button);
      applySelection('biome', biome.id);
    });
    if (!selectedBiome && index === 0) {
      selectedBiome = biome.id;
    }
    biomeTiles.push(button);
    biomeGrid.appendChild(button);
    applyTileBackground(button);
  });

  seasons.forEach((season, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'seg';
    button.dataset.season = season.id;
    button.innerHTML = season.hint
      ? `${season.label} <span class="hint">${season.hint}</span>`
      : season.label;
    button.addEventListener('click', () => {
      setActive(seasonButtons, button);
      applySelection('season', season.id);
    });
    if (!selectedSeason && index === 0) {
      selectedSeason = season.id;
    }
    seasonButtons.push(button);
    seasonSeg.appendChild(button);
  });

  difficulties.forEach((diff, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'seg';
    button.dataset.diff = diff.id;
    const flavor = difficultyFlavors[diff.id] || '';
    button.innerHTML = flavor
      ? `${diff.name} <span class="hint">${flavor}</span>`
      : diff.name;
    button.addEventListener('click', () => {
      setActive(difficultyButtons, button);
      applySelection('diff', diff.id);
    });
    if (!selectedDifficulty && index === 0) {
      selectedDifficulty = diff.id;
    }
    difficultyButtons.push(button);
    difficultySeg.appendChild(button);
  });

  onThemeChange(() => {
    biomeTiles.forEach(applyTileBackground);
  });

  function selectBiome(id) {
    const tile = biomeTiles.find(item => item.dataset.biome === id) || biomeTiles[0];
    if (!tile) return;
    setActive(biomeTiles, tile);
    applySelection('biome', tile.dataset.biome);
  }

  function selectSeason(id) {
    const seg = seasonButtons.find(item => item.dataset.season === id) || seasonButtons[0];
    if (!seg) return;
    setActive(seasonButtons, seg);
    applySelection('season', seg.dataset.season);
  }

  function selectDifficulty(id) {
    const seg = difficultyButtons.find(item => item.dataset.diff === id) || difficultyButtons[0];
    if (!seg) return;
    setActive(difficultyButtons, seg);
    applySelection('diff', seg.dataset.diff);
  }

  function selectSeed(seed) {
    applySelection('seed', seed);
  }

  selectBiome(selectedBiome);
  selectSeason(selectedSeason);
  selectDifficulty(selectedDifficulty);
  updateBiomeDetails();
  updateBiomePreview();
  updateDifficultyInfo();
  selectSeed(mapSeed);

  seedApplyBtn.addEventListener('click', () => {
    const value = seedInput.value.trim();
    selectSeed(value || createSeed());
  });

  seedRandomBtn.addEventListener('click', () => {
    const seed = createSeed();
    selectSeed(seed);
  });

  seedInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      seedApplyBtn.click();
    }
  });

  randomizeAllBtn.addEventListener('click', () => {
    if (biomeTiles.length) {
      const pick = biomeTiles[Math.floor(Math.random() * biomeTiles.length)];
      setActive(biomeTiles, pick);
      applySelection('biome', pick.dataset.biome);
    }

    if (seasonButtons.length) {
      const pick = seasonButtons[Math.floor(Math.random() * seasonButtons.length)];
      setActive(seasonButtons, pick);
      applySelection('season', pick.dataset.season);
    }

    if (difficultyButtons.length) {
      const pick = difficultyButtons[Math.floor(Math.random() * difficultyButtons.length)];
      setActive(difficultyButtons, pick);
      applySelection('diff', pick.dataset.diff);
    }

    selectSeed(createSeed());
  });

  startBtn.addEventListener('click', () => {
    const seed = seedInput.value.trim();
    if (seed && seed !== mapSeed) {
      selectSeed(seed);
    }
    onStart({
      biome: selectedBiome,
      season: selectedSeason,
      difficulty: selectedDifficulty,
      seed: mapSeed,
      spawn: spawnCoords ? { ...spawnCoords } : null
    });
  });
}
