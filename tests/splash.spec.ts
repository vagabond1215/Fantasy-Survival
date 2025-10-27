import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  __resetStorageForTests,
  removeStorageItem,
  setStorageItem
} from '../src/safeStorage.js';
import {
  SAVE_SCHEMA_VERSION,
  SAVE_STORAGE_KEY,
  hasValidSave
} from '../src/splash/splash.ts';

describe('splash save detection', () => {
  const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  let storageData;

  beforeEach(() => {
    storageData = new Map();

    const workingStorage = {
      getItem(key) {
        return storageData.has(key) ? storageData.get(key) : null;
      },
      setItem(key, value) {
        storageData.set(key, value);
      },
      removeItem(key) {
        storageData.delete(key);
      }
    };

    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        return workingStorage;
      }
    });

    __resetStorageForTests();
  });

  afterEach(() => {
    __resetStorageForTests();
    if (originalDescriptor) {
      Object.defineProperty(globalThis, 'localStorage', originalDescriptor);
    } else {
      delete globalThis.localStorage;
    }
  });

  it('detects a valid save stored under the shared persistence key', () => {
    const payload = {
      version: SAVE_SCHEMA_VERSION,
      timestamp: Date.now()
    };

    setStorageItem(SAVE_STORAGE_KEY, JSON.stringify(payload));

    expect(hasValidSave()).toBe(true);
  });

  it('ignores saves stored under the legacy splash key', () => {
    const payload = {
      version: SAVE_SCHEMA_VERSION,
      timestamp: Date.now()
    };

    setStorageItem('gameSave', JSON.stringify(payload));

    expect(hasValidSave()).toBe(false);
    removeStorageItem('gameSave');
  });

  it('ignores saves with incompatible schema versions', () => {
    const payload = {
      version: SAVE_SCHEMA_VERSION + 1,
      timestamp: Date.now()
    };

    setStorageItem(SAVE_STORAGE_KEY, JSON.stringify(payload));

    expect(hasValidSave()).toBe(false);
  });
});
