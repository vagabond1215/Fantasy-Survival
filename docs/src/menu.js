import {
  getAvailableThemes,
  getTheme,
  getThemeAppearance,
  initTheme,
  onThemeChange,
  setTheme,
  setThemeAppearance
} from './theme.js';

let zoomLevel = 1;

let actionBar = null;
let settingsWrapper = null;
let menuWrapper = null;
let settingsPanel = null;
let menuPanel = null;
let settingsTrigger = null;
let menuTrigger = null;
let themeButtons = new Map();
let zoomDisplayButton = null;
let backMenuButton = null;
let constructionMenuButton = null;
let listenersBound = false;
let removeThemeListener = null;

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

function applyZoom() {
  const content = document.getElementById('content');
  if (content) {
    content.style.transform = `scale(${zoomLevel})`;
    content.style.transformOrigin = 'top left';
  }
  updateZoomDisplay();
}

function updateThemeButtonVisuals(themeId = getTheme()) {
  themeButtons.forEach((button, id) => {
    const isActive = id === themeId;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });
}

function applyTheme() {
  initTheme();
  updateThemeButtonVisuals();
}

function updateZoomDisplay() {
  if (!zoomDisplayButton) return;
  const percent = Math.round(zoomLevel * 100);
  zoomDisplayButton.textContent = `${percent}%`;
  zoomDisplayButton.setAttribute(
    'aria-label',
    `Reset zoom to 100% (current ${percent}%)`
  );
}

function createIconTrigger(icon, label) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = icon;
  button.setAttribute('aria-label', label);
  button.title = label;
  button.className = 'menu-trigger';
  return button;
}

function createPanelButton(icon, label, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  const iconSpan = document.createElement('span');
  iconSpan.className = 'panel-icon';
  iconSpan.textContent = icon;
  const labelSpan = document.createElement('span');
  labelSpan.className = 'panel-label';
  labelSpan.textContent = label;
  button.append(iconSpan, labelSpan);
  if (typeof onClick === 'function') {
    button.addEventListener('click', onClick);
  }
  return { button, iconSpan, labelSpan };
}

function createIconControl(icon, label, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = icon;
  button.setAttribute('aria-label', label);
  button.title = label;
  button.classList.add('menu-icon-button');
  if (typeof onClick === 'function') {
    button.addEventListener('click', onClick);
  }
  return button;
}

function closePanels() {
  if (settingsPanel) {
    settingsPanel.classList.remove('open');
    settingsPanel.setAttribute('aria-hidden', 'true');
  }
  if (menuPanel) {
    menuPanel.classList.remove('open');
    menuPanel.setAttribute('aria-hidden', 'true');
  }
  if (settingsTrigger) {
    settingsTrigger.setAttribute('aria-expanded', 'false');
  }
  if (menuTrigger) {
    menuTrigger.setAttribute('aria-expanded', 'false');
  }
}

function togglePanel(panel, trigger) {
  if (!panel || !trigger) return;
  const isOpen = panel.classList.contains('open');
  closePanels();
  if (!isOpen) {
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    trigger.setAttribute('aria-expanded', 'true');
  }
}

function handleDocumentClick(event) {
  if (!actionBar) return;
  if (actionBar.contains(event.target)) return;
  closePanels();
}

function handleKeyDown(event) {
  if (event.key === 'Escape') {
    closePanels();
  }
}

function ensureActionBar() {
  if (actionBar) {
    return actionBar;
  }

  actionBar = document.createElement('div');
  actionBar.className = 'menu-action-group';

  settingsWrapper = document.createElement('div');
  settingsWrapper.className = 'menu-action';

  settingsTrigger = createIconTrigger('⚙️', 'Settings');
  settingsTrigger.id = 'settings-btn';
  settingsTrigger.setAttribute('aria-expanded', 'false');
  settingsTrigger.setAttribute('aria-haspopup', 'true');
  settingsTrigger.addEventListener('click', event => {
    event.stopPropagation();
    togglePanel(settingsPanel, settingsTrigger);
  });

  settingsPanel = document.createElement('div');
  settingsPanel.className = 'menu-panel settings-panel';
  settingsPanel.setAttribute('aria-hidden', 'true');

  settingsWrapper.append(settingsTrigger, settingsPanel);

  menuWrapper = document.createElement('div');
  menuWrapper.className = 'menu-action';

  menuTrigger = createIconTrigger('☰', 'Game menu');
  menuTrigger.id = 'menu-btn';
  menuTrigger.setAttribute('aria-expanded', 'false');
  menuTrigger.setAttribute('aria-haspopup', 'true');
  menuTrigger.addEventListener('click', event => {
    event.stopPropagation();
    togglePanel(menuPanel, menuTrigger);
  });

  menuPanel = document.createElement('div');
  menuPanel.id = 'dropdown-menu';
  menuPanel.className = 'menu-panel menu-panel-list';
  menuPanel.setAttribute('aria-hidden', 'true');

  menuWrapper.append(menuTrigger, menuPanel);

  actionBar.append(settingsWrapper, menuWrapper);

  if (!listenersBound) {
    document.addEventListener('click', handleDocumentClick);
    document.addEventListener('keydown', handleKeyDown);
    listenersBound = true;
  }

  return actionBar;
}

function buildSettingsPanel() {
  if (!settingsPanel) return;
  settingsPanel.innerHTML = '';

  themeButtons = new Map();

  if (removeThemeListener) {
    removeThemeListener();
    removeThemeListener = null;
  }

  const themeSection = document.createElement('div');
  themeSection.className = 'theme-settings-section';

  const contrastToggle = document.createElement('div');
  contrastToggle.className = 'theme-contrast-toggle';

  const contrastLabel = document.createElement('span');
  contrastLabel.className = 'theme-contrast-toggle__label';
  contrastLabel.textContent = 'Preview contrast';

  const contrastControls = document.createElement('div');
  contrastControls.className = 'theme-contrast-toggle__controls';

  const lightToggle = document.createElement('button');
  lightToggle.type = 'button';
  lightToggle.className = 'theme-contrast-toggle__btn';
  lightToggle.textContent = 'Light';
  lightToggle.setAttribute('aria-pressed', 'false');

  const darkToggle = document.createElement('button');
  darkToggle.type = 'button';
  darkToggle.className = 'theme-contrast-toggle__btn';
  darkToggle.textContent = 'Dark';
  darkToggle.setAttribute('aria-pressed', 'false');

  contrastControls.append(lightToggle, darkToggle);
  contrastToggle.append(contrastLabel, contrastControls);

  const themeRow = document.createElement('div');
  themeRow.className = 'theme-toggle-grid';

  themeSection.append(contrastToggle, themeRow);
  settingsPanel.appendChild(themeSection);

  const availableThemes = getAvailableThemes();

  availableThemes.forEach(theme => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'theme-toggle-button';
    button.dataset.themeId = theme.id;
    button.dataset.themeAppearance = theme.appearance;
    button.setAttribute('aria-pressed', 'false');
    const displayName = theme.meta?.label || formatThemeLabel(theme.id);
    const announcement = displayName || theme.meta?.emoji || theme.id;
    button.setAttribute('aria-label', `Switch to ${announcement}`);
    button.title = announcement;

    const icon = document.createElement('span');
    icon.className = 'theme-toggle-button__icon';
    icon.textContent = theme.meta?.emoji || '';
    icon.setAttribute('aria-hidden', 'true');

    const label = document.createElement('span');
    label.className = 'theme-toggle-button__label';
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
      closePanels();
    });

    themeRow.appendChild(button);
    themeButtons.set(theme.id, button);
  });

  function syncAppearanceControls(appearance) {
    const nextContrast = appearance === 'light' ? 'light' : 'dark';
    themeRow.dataset.contrast = nextContrast;
    lightToggle.classList.toggle('is-active', nextContrast === 'light');
    darkToggle.classList.toggle('is-active', nextContrast === 'dark');
    lightToggle.setAttribute('aria-pressed', String(nextContrast === 'light'));
    darkToggle.setAttribute('aria-pressed', String(nextContrast === 'dark'));
  }

  lightToggle.addEventListener('click', () => {
    setThemeAppearance('light');
  });
  darkToggle.addEventListener('click', () => {
    setThemeAppearance('dark');
  });

  syncAppearanceControls(getThemeAppearance());
  removeThemeListener = onThemeChange((themeId = getTheme(), themeDefinition) => {
    updateThemeButtonVisuals(themeId);
    const appearance = themeDefinition?.activeAppearance || getThemeAppearance();
    syncAppearanceControls(appearance);
  }, { immediate: true });

  const zoomRow = document.createElement('div');
  zoomRow.className = 'icon-row';
  const zoomOut = createIconControl('➖', 'Zoom out', () => {
    zoomLevel = Math.max(0.5, Math.round((zoomLevel - 0.1) * 10) / 10);
    applyZoom();
  });
  zoomOut.classList.add('zoom-button');

  zoomDisplayButton = createIconControl('100%', 'Reset zoom to 100%', () => {
    zoomLevel = 1;
    applyZoom();
  });
  zoomDisplayButton.classList.add('zoom-display-button');

  const zoomIn = createIconControl('➕', 'Zoom in', () => {
    zoomLevel = Math.min(2, Math.round((zoomLevel + 0.1) * 10) / 10);
    applyZoom();
  });
  zoomIn.classList.add('zoom-button');
  zoomRow.append(zoomOut, zoomDisplayButton, zoomIn);
  settingsPanel.appendChild(zoomRow);
  updateZoomDisplay();
}

function buildMenuPanel(
  onMenu,
  onBack,
  onReset,
  onConstruction,
  onInventory,
  onProfile,
  onLog,
  onCraftPlanner,
  onHerbarium,
  onBestiary
) {
  if (!menuPanel) return;
  menuPanel.innerHTML = '';

  backMenuButton = null;
  constructionMenuButton = null;

  if (typeof onBack === 'function') {
    const backEntry = createPanelButton('↩', 'Back', () => {
      closePanels();
      onBack();
      showBackButton(false);
    });
    backEntry.button.id = 'back-btn';
    backEntry.button.style.display = 'none';
    menuPanel.appendChild(backEntry.button);
    backMenuButton = backEntry.button;
  }

  if (typeof onMenu === 'function') {
    const jobsEntry = createPanelButton('👷', 'Jobs', () => {
      closePanels();
      onMenu();
    });
    jobsEntry.button.id = 'jobs-btn';
    menuPanel.appendChild(jobsEntry.button);
  }

  if (typeof onCraftPlanner === 'function') {
    const craftPlannerEntry = createPanelButton('🧰', 'Craft Planner', () => {
      closePanels();
      onCraftPlanner();
    });
    craftPlannerEntry.button.id = 'craft-planner-btn';
    menuPanel.appendChild(craftPlannerEntry.button);
  }

  if (typeof onConstruction === 'function') {
    const constructionEntry = createPanelButton('🏗️', 'Construction', () => {
      closePanels();
      onConstruction();
    });
    constructionEntry.button.id = 'construction-btn';
    menuPanel.appendChild(constructionEntry.button);
    constructionMenuButton = constructionEntry.button;
  }

  if (typeof onInventory === 'function') {
    const inventoryEntry = createPanelButton('🎒', 'Inventory', () => {
      closePanels();
      onInventory();
    });
    inventoryEntry.button.id = 'inventory-btn';
    menuPanel.appendChild(inventoryEntry.button);
  }

  if (typeof onHerbarium === 'function') {
    const herbariumEntry = createPanelButton('🌿', 'Herbarium', () => {
      closePanels();
      onHerbarium();
    });
    herbariumEntry.button.id = 'herbarium-btn';
    menuPanel.appendChild(herbariumEntry.button);
  }

  if (typeof onBestiary === 'function') {
    const bestiaryEntry = createPanelButton('🐾', 'Bestiary', () => {
      closePanels();
      onBestiary();
    });
    bestiaryEntry.button.id = 'bestiary-btn';
    menuPanel.appendChild(bestiaryEntry.button);
  }

  if (typeof onProfile === 'function') {
    const profileEntry = createPanelButton('👤', 'Profile', () => {
      closePanels();
      onProfile();
    });
    profileEntry.button.id = 'profile-btn';
    menuPanel.appendChild(profileEntry.button);
  }

  if (typeof onLog === 'function') {
    const logEntry = createPanelButton('📜', 'Log', () => {
      closePanels();
      onLog();
    });
    logEntry.button.id = 'log-btn';
    menuPanel.appendChild(logEntry.button);
  }

  const resetEntry = createPanelButton('🔄', 'New Game', () => {
    closePanels();
    if (typeof onReset === 'function') {
      onReset();
    }
  });
  resetEntry.button.id = 'reset-btn';
  menuPanel.appendChild(resetEntry.button);
}

export function mountMenuActions(hostElement) {
  if (!hostElement) return;
  const bar = ensureActionBar();
  if (bar.parentElement !== hostElement) {
    if (bar.parentElement) {
      bar.parentElement.removeChild(bar);
    }
    hostElement.appendChild(bar);
  }
}

export function showBackButton(show) {
  if (backMenuButton) {
    backMenuButton.style.display = show ? 'flex' : 'none';
  }
  if (constructionMenuButton) {
    constructionMenuButton.style.display = show ? 'none' : 'flex';
  }
}

export function initTopMenu(
  onMenu,
  onBack,
  onReset,
  onConstruction,
  onInventory,
  onProfile,
  onLog,
  onCraftPlanner,
  onHerbarium,
  onBestiary
) {
  const bar = document.getElementById('top-menu');
  if (!bar) return;
  applyTheme();
  ensureActionBar();
  buildSettingsPanel();
  buildMenuPanel(
    onMenu,
    onBack,
    onReset,
    onConstruction,
    onInventory,
    onProfile,
    onLog,
    onCraftPlanner,
    onHerbarium,
    onBestiary
  );
  bar.innerHTML = '';
  bar.style.display = 'none';
  applyZoom();
}

export function initBottomMenu(onRest) {
  const bar = document.getElementById('bottom-menu');
  if (!bar) return;
  bar.innerHTML = '';
  Object.assign(bar.style, {
    position: 'fixed',
    bottom: '0',
    left: '0',
    right: '0',
    background: 'var(--menu-bg)',
    padding: '4px',
    display: 'flex',
    justifyContent: 'center',
    zIndex: '1000'
  });

  if (typeof onRest === 'function') {
    const restBtn = document.createElement('button');
    restBtn.textContent = 'Rest';
    restBtn.addEventListener('click', onRest);
    bar.appendChild(restBtn);
  }
}
