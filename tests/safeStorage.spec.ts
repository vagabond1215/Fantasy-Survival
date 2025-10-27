import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  __resetStorageForTests,
  getStorageItem,
  removeStorageItem,
  setStorageItem
} from '../src/safeStorage.js';

describe('safeStorage', () => {
  const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');

  beforeEach(() => {
    __resetStorageForTests();
    if (originalDescriptor) {
      Object.defineProperty(globalThis, 'localStorage', originalDescriptor);
    } else {
      delete (globalThis as typeof globalThis & { localStorage?: unknown }).localStorage;
    }
  });

  afterEach(() => {
    if (originalDescriptor) {
      Object.defineProperty(globalThis, 'localStorage', originalDescriptor);
    } else {
      delete (globalThis as typeof globalThis & { localStorage?: unknown }).localStorage;
    }
  });

  it('falls back when persistent storage throws', () => {
    const failingStorage = {
      getItem: vi.fn(() => {
        throw new Error('blocked');
      }),
      setItem: vi.fn(() => {
        throw new Error('blocked');
      }),
      removeItem: vi.fn(() => {
        throw new Error('blocked');
      })
    };

    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        return failingStorage;
      }
    });
    __resetStorageForTests();

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const persisted = setStorageItem('key', 'value');
    expect(persisted).toBe(false);
    expect(getStorageItem('key')).toBe('value');
    expect(failingStorage.setItem).toHaveBeenCalled();

    removeStorageItem('key');
    expect(getStorageItem('key')).toBeNull();

    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('writes through to persistent storage when available', () => {
    const storageData = new Map<string, string>();
    const workingStorage = {
      getItem: vi.fn((key: string) => (storageData.has(key) ? storageData.get(key)! : null)),
      setItem: vi.fn((key: string, value: string) => {
        storageData.set(key, value);
      }),
      removeItem: vi.fn((key: string) => {
        storageData.delete(key);
      })
    };

    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        return workingStorage;
      }
    });
    __resetStorageForTests();

    const persisted = setStorageItem('foo', 'bar');
    expect(persisted).toBe(true);
    expect(workingStorage.setItem).toHaveBeenCalledWith('foo', 'bar');

    expect(getStorageItem('foo')).toBe('bar');

    removeStorageItem('foo');
    expect(workingStorage.removeItem).toHaveBeenCalledWith('foo');
    expect(getStorageItem('foo')).toBeNull();
  });
});
