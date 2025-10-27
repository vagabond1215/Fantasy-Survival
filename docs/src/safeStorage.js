// @ts-check

const FALLBACK_STORAGE = new Map();
let storageChecked = false;
let persistentStorage = null;
let persistentAvailable = false;
let warnedUnavailable = false;

function logFallbackWarning(error) {
  if (!warnedUnavailable) {
    console.warn('Local storage is unavailable; using in-memory storage instead.', error);
    warnedUnavailable = true;
  }
}

function resolveCandidateStorage() {
  if (typeof window !== 'undefined' && window && 'localStorage' in window) {
    try {
      return window.localStorage;
    } catch (error) {
      logFallbackWarning(error);
      return null;
    }
  }
  if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
    try {
      return globalThis.localStorage;
    } catch (error) {
      logFallbackWarning(error);
      return null;
    }
  }
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage;
    }
  } catch (error) {
    logFallbackWarning(error);
    // Ignore lookup errors from environments without global localStorage.
  }
  return null;
}

function disablePersistentStorage(error) {
  if (error) {
    logFallbackWarning(error);
  }
  persistentStorage = null;
  persistentAvailable = false;
  storageChecked = true;
}

function resolveStorage() {
  if (storageChecked) {
    return persistentAvailable ? persistentStorage : null;
  }

  storageChecked = true;
  persistentAvailable = false;
  persistentStorage = null;

  const candidate = resolveCandidateStorage();
  if (!candidate) {
    return null;
  }

  try {
    const probeKey = '__fantasy-survival-storage-test__';
    candidate.setItem(probeKey, probeKey);
    candidate.removeItem(probeKey);
    persistentStorage = candidate;
    persistentAvailable = true;
  } catch (error) {
    disablePersistentStorage(error);
  }

  return persistentAvailable ? persistentStorage : null;
}

/**
 * Read a stored value, falling back to in-memory storage when persistent
 * storage is not available.
 * @param {string} key
 * @returns {string | null}
 */
export function getStorageItem(key) {
  const storage = resolveStorage();
  if (storage) {
    try {
      const value = storage.getItem(key);
      if (value === null || value === undefined) {
        FALLBACK_STORAGE.delete(key);
        return null;
      }
      FALLBACK_STORAGE.set(key, value);
      return value;
    } catch (error) {
      disablePersistentStorage(error);
    }
  }
  return FALLBACK_STORAGE.has(key) ? FALLBACK_STORAGE.get(key) : null;
}

/**
 * Persist a value when possible. Returns true when the write succeeded against
 * persistent storage.
 * @param {string} key
 * @param {string} value
 * @returns {boolean}
 */
export function setStorageItem(key, value) {
  const storage = resolveStorage();
  if (storage) {
    try {
      storage.setItem(key, value);
      FALLBACK_STORAGE.set(key, value);
      return true;
    } catch (error) {
      disablePersistentStorage(error);
    }
  }
  FALLBACK_STORAGE.set(key, value);
  return false;
}

/**
 * Remove a value from storage.
 * @param {string} key
 */
export function removeStorageItem(key) {
  const storage = resolveStorage();
  if (storage) {
    try {
      storage.removeItem(key);
    } catch (error) {
      disablePersistentStorage(error);
    }
  }
  FALLBACK_STORAGE.delete(key);
}

/**
 * Determine whether persistent storage is currently usable.
 * @returns {boolean}
 */
export function hasPersistentStorage() {
  return resolveStorage() !== null;
}

/**
 * Reset cached storage state. Exposed for unit tests.
 */
export function __resetStorageForTests() {
  storageChecked = false;
  persistentStorage = null;
  persistentAvailable = false;
  warnedUnavailable = false;
  FALLBACK_STORAGE.clear();
}
