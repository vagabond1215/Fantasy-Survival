let zoomLevel = 1;
let theme = localStorage.getItem('theme') || 'light';

let actionBar = null;
let settingsPanel = null;
let menuPanel = null;
let settingsTrigger = null;
let menuTrigger = null;
let themeButtonEntry = null;
let backMenuButton = null;
let constructionMenuButton = null;
let listenersBound = false;

function applyZoom() {
  const content = document.getElementById('content');
  if (content) {
    content.style.transform = `scale(${zoomLevel})`;
    content.style.transformOrigin = 'top left';
  }
}

function updateThemeButtonVisuals() {
  if (!themeButtonEntry) return;
  const isLight = theme === 'light';
  if (themeButtonEntry.iconSpan) {
    themeButtonEntry.iconSpan.textContent = isLight ? '🌙' : '☀️';
  }
  if (themeButtonEntry.labelSpan) {
    themeButtonEntry.labelSpan.textContent = isLight
      ? 'Switch to Dark Mode'
      : 'Switch to Light Mode';
  }
}

function applyTheme() {
  document.body.className = theme;
  localStorage.setItem('theme', theme);
  updateThemeButtonVisuals();
}

function createIconTrigger(icon, label) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = icon;
  button.setAttribute('aria-label', label);
  button.title = label;
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
  actionBar.className = 'floating-action-bar';

  settingsTrigger = createIconTrigger('⚙️', 'Settings');
  settingsTrigger.id = 'settings-btn';
  settingsTrigger.setAttribute('aria-expanded', 'false');
  settingsTrigger.setAttribute('aria-haspopup', 'true');
  settingsTrigger.addEventListener('click', event => {
    event.stopPropagation();
    togglePanel(settingsPanel, settingsTrigger);
  });

  menuTrigger = createIconTrigger('☰', 'Game menu');
  menuTrigger.id = 'menu-btn';
  menuTrigger.setAttribute('aria-expanded', 'false');
  menuTrigger.setAttribute('aria-haspopup', 'true');
  menuTrigger.addEventListener('click', event => {
    event.stopPropagation();
    togglePanel(menuPanel, menuTrigger);
  });

  settingsPanel = document.createElement('div');
  settingsPanel.className = 'floating-panel settings-panel';
  settingsPanel.setAttribute('aria-hidden', 'true');

  menuPanel = document.createElement('div');
  menuPanel.id = 'dropdown-menu';
  menuPanel.className = 'floating-panel menu-panel';
  menuPanel.setAttribute('aria-hidden', 'true');

  actionBar.append(settingsTrigger, menuTrigger, settingsPanel, menuPanel);

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

  themeButtonEntry = createPanelButton('🌙', 'Switch to Dark Mode', () => {
    theme = theme === 'light' ? 'dark' : 'light';
    applyTheme();
    closePanels();
  });
  themeButtonEntry.button.id = 'theme-btn';
  themeButtonEntry.button.setAttribute('aria-label', 'Toggle color theme');
  settingsPanel.appendChild(themeButtonEntry.button);
  updateThemeButtonVisuals();

  const zoomRow = document.createElement('div');
  zoomRow.className = 'icon-row';
  const zoomOut = createIconControl('➖', 'Zoom out', () => {
    zoomLevel = Math.max(0.5, Math.round((zoomLevel - 0.1) * 10) / 10);
    applyZoom();
  });
  const zoomIn = createIconControl('➕', 'Zoom in', () => {
    zoomLevel = Math.min(2, Math.round((zoomLevel + 0.1) * 10) / 10);
    applyZoom();
  });
  zoomRow.append(zoomOut, zoomIn);
  settingsPanel.appendChild(zoomRow);
}

function buildMenuPanel(onMenu, onBack, onReset, onConstruction, onProfile, onLog) {
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
      showBackButton(true);
    });
    jobsEntry.button.id = 'jobs-btn';
    menuPanel.appendChild(jobsEntry.button);
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

export function initTopMenu(onMenu, onBack, onReset, onConstruction, onProfile, onLog) {
  const bar = document.getElementById('top-menu');
  if (!bar) return;
  applyTheme();
  ensureActionBar();
  buildSettingsPanel();
  buildMenuPanel(onMenu, onBack, onReset, onConstruction, onProfile, onLog);
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
