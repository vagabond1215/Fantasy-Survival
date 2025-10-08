const THEME_STORAGE_KEY = 'theme';
const VALID_THEMES = new Set(['light', 'dark']);
const listeners = new Set();

let hasStoredPreference = false;
let systemPreferenceQuery = null;
let systemPreferenceListener = null;

function resolveSystemPreferenceQuery() {
  if (systemPreferenceQuery || typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return systemPreferenceQuery;
  }
  try {
    systemPreferenceQuery = window.matchMedia('(prefers-color-scheme: dark)');
  } catch (error) {
    console.warn('Unable to access system color scheme.', error);
    systemPreferenceQuery = null;
  }
  return systemPreferenceQuery;
}

function detectPreferredTheme() {
  const query = resolveSystemPreferenceQuery();
  if (query && typeof query.matches === 'boolean') {
    return query.matches ? 'dark' : 'light';
  }
  return 'dark';
}

let currentTheme = (() => {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored && VALID_THEMES.has(stored)) {
      hasStoredPreference = true;
      return stored;
    }
  } catch (error) {
    console.warn('Unable to access theme preference storage.', error);
  }
  return detectPreferredTheme();
})();

function updateTheme(nextTheme, { persist = true } = {}) {
  if (!VALID_THEMES.has(nextTheme)) return;

  if (persist) {
    hasStoredPreference = true;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch (error) {
      console.warn('Unable to persist theme preference.', error);
    }
  }

  currentTheme = nextTheme;
  applyThemeClass();
  notifyListeners();
}

function setupSystemPreferenceListener() {
  const query = resolveSystemPreferenceQuery();
  if (!query || systemPreferenceListener) {
    return;
  }

  const handleChange = event => {
    if (hasStoredPreference) {
      return;
    }
    const matches = typeof event?.matches === 'boolean' ? event.matches : !!query.matches;
    const nextTheme = matches ? 'dark' : 'light';
    updateTheme(nextTheme, { persist: false });
  };

  if (typeof query.addEventListener === 'function') {
    query.addEventListener('change', handleChange);
    systemPreferenceListener = () => {
      query.removeEventListener('change', handleChange);
      systemPreferenceListener = null;
    };
  } else if (typeof query.addListener === 'function') {
    query.addListener(handleChange);
    systemPreferenceListener = () => {
      query.removeListener(handleChange);
      systemPreferenceListener = null;
    };
  }
}

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
  setupSystemPreferenceListener();
}

export function getTheme() {
  return currentTheme;
}

export function setTheme(nextTheme) {
  if (!VALID_THEMES.has(nextTheme)) return;
  updateTheme(nextTheme, { persist: true });
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
