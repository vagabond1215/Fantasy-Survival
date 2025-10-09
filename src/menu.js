import {
  getAvailableThemes,
  getTheme,
  initTheme,
  onThemeChange,
  setTheme
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

  const themeRow = document.createElement('div');
  themeRow.className = 'theme-toggle-grid';

  const availableThemes = getAvailableThemes();

  availableThemes.forEach(theme => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'theme-toggle-button';
    button.dataset.themeId = theme.id;
    button.dataset.themeAppearance = theme.appearance;
    button.setAttribute('aria-pressed', 'false');
    button.setAttribute('aria-label', `Switch to ${theme.name}`);

    const swatch = document.createElement('div');
    swatch.className = 'theme-toggle-button__swatch';
    const swatchColors = [
      theme.colors.background.base,
      theme.colors.primary.base,
      theme.colors.secondary.base,
      theme.colors.accent.base,
      theme.colors.neutral.base
    ];
    swatchColors.forEach(color => {
      const cell = document.createElement('span');
      cell.className = 'theme-toggle-button__swatch-cell';
      cell.style.setProperty('--swatch-color', color);
      swatch.appendChild(cell);
    });

    const label = document.createElement('span');
    label.className = 'theme-toggle-button__label';
    label.textContent = theme.name;

    button.append(swatch, label);
    button.addEventListener('click', () => {
      setTheme(theme.id);
      closePanels();
    });

    themeRow.appendChild(button);
    themeButtons.set(theme.id, button);
  });

  settingsPanel.appendChild(themeRow);
  removeThemeListener = onThemeChange((themeId = getTheme()) => {
    updateThemeButtonVisuals(themeId);
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
