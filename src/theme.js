const THEME_STORAGE_KEY = 'theme';
const VALID_THEMES = new Set(['light', 'dark']);
const listeners = new Set();

let currentTheme = (() => {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored && VALID_THEMES.has(stored)) {
      return stored;
    }
  } catch (error) {
    console.warn('Unable to access theme preference storage.', error);
  }
  return 'light';
})();

function applyThemeClass() {
  if (typeof document === 'undefined' || !document.body) return;
  document.body.classList.remove('light', 'dark');
  document.body.classList.add(currentTheme);
}

function notifyListeners() {
  listeners.forEach(listener => {
    try {
      listener(currentTheme);
    } catch (error) {
      console.error('Theme listener error', error);
    }
  });
}

export function initTheme() {
  applyThemeClass();
  notifyListeners();
}

export function getTheme() {
  return currentTheme;
}

export function setTheme(nextTheme) {
  if (!VALID_THEMES.has(nextTheme)) return;
  if (nextTheme === currentTheme) {
    applyThemeClass();
    notifyListeners();
    return;
  }
  currentTheme = nextTheme;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, currentTheme);
  } catch (error) {
    console.warn('Unable to persist theme preference.', error);
  }
  applyThemeClass();
  notifyListeners();
}

export function onThemeChange(listener, { immediate = false } = {}) {
  if (typeof listener !== 'function') {
    return () => {};
  }
  listeners.add(listener);
  if (immediate) {
    try {
      listener(currentTheme);
    } catch (error) {
      console.error('Theme listener error', error);
    }
  }
  return () => {
    listeners.delete(listener);
  };
}
