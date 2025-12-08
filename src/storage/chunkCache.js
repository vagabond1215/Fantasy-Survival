import {
  getStorageItem,
  hasPersistentStorage,
  removeStorageItem,
  setStorageItem,
} from "../safeStorage.js";

export function chunkKeyFromCoordinate(coordinate) {
  if (!coordinate) {
    return "0:0:0";
  }
  const level = Number.isFinite(coordinate.level)
    ? Math.trunc(coordinate.level)
    : 0;
  const x = Math.trunc(coordinate.x ?? 0);
  const y = Math.trunc(coordinate.y ?? 0);
  return `${level}:${x}:${y}`;
}
export class BoundedLRUCache {
  constructor(maxSize, onEvict) {
    this.maxSize = Math.max(0, Math.trunc(maxSize));
    this.onEvict = typeof onEvict === "function" ? onEvict : null;
    this.map = new Map();
  }
  get size() {
    return this.map.size;
  }
  get capacity() {
    return this.maxSize;
  }
  setCapacity(nextCapacity) {
    const normalized = Math.max(0, Math.trunc(nextCapacity));
    if (normalized === this.maxSize) {
      return;
    }
    this.maxSize = normalized;
    if (this.maxSize === 0) {
      this.clear();
      return;
    }
    this.evictIfNeeded();
  }
  get(key) {
    if (!this.map.has(key)) {
      return undefined;
    }
    const value = this.map.get(key);
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }
  peek(key) {
    return this.map.get(key);
  }
  set(key, value) {
    if (this.maxSize <= 0) {
      this.handleEviction(key, value);
      return;
    }
    if (this.map.has(key)) {
      const existing = this.map.get(key);
      this.map.delete(key);
      if (existing !== undefined) {
        this.handleEviction(key, existing);
      }
    }
    this.map.set(key, value);
    this.evictIfNeeded();
  }
  has(key) {
    return this.map.has(key);
  }
  delete(key) {
    if (!this.map.has(key)) {
      return false;
    }
    const value = this.map.get(key);
    this.map.delete(key);
    if (value !== undefined) {
      this.handleEviction(key, value);
    }
    return true;
  }
  clear() {
    if (this.map.size === 0) {
      return;
    }
    const entries = this.map.entries();
    for (const [key, value] of entries) {
      this.handleEviction(key, value);
    }
    this.map.clear();
  }
  keys() {
    return this.map.keys();
  }
  values() {
    return this.map.values();
  }
  entries() {
    return this.map.entries();
  }
  evictIfNeeded() {
    if (this.maxSize <= 0) {
      this.clear();
      return;
    }
    while (this.map.size > this.maxSize) {
      const oldestKey = this.map.keys().next();
      if (oldestKey.done) {
        break;
      }
      const key = oldestKey.value;
      const value = this.map.get(key);
      this.map.delete(key);
      if (value !== undefined) {
        this.handleEviction(key, value);
      }
    }
  }
  handleEviction(key, value) {
    if (this.onEvict) {
      try {
        this.onEvict(key, value);
      } catch (_error) {
        // Ignore eviction handler errors to avoid breaking cache invariants.
      }
    }
  }
}

function toFiniteInteger(value, fallback = 0) {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.trunc(value);
}

function isTypedArray(value) {
  return typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView(value);
}

function createGridViewFromData(
  data,
  {
    width,
    height,
    baseWidth = width,
    baseHeight = height,
    defaultValue = null,
    offsetX = 0,
    offsetY = 0,
  },
) {
  const normalizedWidth = Math.max(0, Math.trunc(width || 0));
  const normalizedHeight = Math.max(0, Math.trunc(height || 0));
  const fullWidth = Math.max(normalizedWidth, Math.trunc(baseWidth || normalizedWidth || 0));
  const fullHeight = Math.max(normalizedHeight, Math.trunc(baseHeight || normalizedHeight || 0));
  const baseOffsetX = Math.max(0, Math.trunc(offsetX || 0));
  const baseOffsetY = Math.max(0, Math.trunc(offsetY || 0));
  const view = {
    data,
    width: normalizedWidth,
    height: normalizedHeight,
    baseWidth: fullWidth,
    baseHeight: fullHeight,
    offsetX: baseOffsetX,
    offsetY: baseOffsetY,
    size: normalizedWidth * normalizedHeight,
    defaultValue,
    get(x, y) {
      const localX = Math.trunc(x);
      const localY = Math.trunc(y);
      if (
        !Number.isFinite(localX) ||
        !Number.isFinite(localY) ||
        localX < 0 ||
        localY < 0 ||
        localX >= this.width ||
        localY >= this.height
      ) {
        return defaultValue;
      }
      const worldX = this.offsetX + localX;
      const worldY = this.offsetY + localY;
      if (worldX < 0 || worldY < 0 || worldX >= this.baseWidth || worldY >= this.baseHeight) {
        return defaultValue;
      }
      const index = worldY * this.baseWidth + worldX;
      if (!data || index < 0 || index >= data.length) {
        return defaultValue;
      }
      return data[index] ?? defaultValue;
    },
    getIndex(index) {
      if (!Number.isFinite(index) || index < 0 || index >= this.size) {
        return defaultValue;
      }
      const localX = index % this.width;
      const localY = Math.trunc(index / this.width);
      return this.get(localX, localY);
    },
    getByWorld(worldX, worldY) {
      const normalizedX = Math.trunc(worldX);
      const normalizedY = Math.trunc(worldY);
      if (
        !Number.isFinite(normalizedX) ||
        !Number.isFinite(normalizedY) ||
        normalizedX < 0 ||
        normalizedY < 0 ||
        normalizedX >= this.baseWidth ||
        normalizedY >= this.baseHeight
      ) {
        return defaultValue;
      }
      const index = normalizedY * this.baseWidth + normalizedX;
      if (!data || index < 0 || index >= data.length) {
        return defaultValue;
      }
      return data[index] ?? defaultValue;
    },
    slice(sliceOffsetX, sliceOffsetY, sliceWidth, sliceHeight) {
      const normalizedSliceWidth = Math.max(0, Math.trunc(sliceWidth || 0));
      const normalizedSliceHeight = Math.max(0, Math.trunc(sliceHeight || 0));
      const nextOffsetX = this.offsetX + Math.max(0, Math.trunc(sliceOffsetX || 0));
      const nextOffsetY = this.offsetY + Math.max(0, Math.trunc(sliceOffsetY || 0));
      const maxWidth = Math.max(0, this.baseWidth - nextOffsetX);
      const maxHeight = Math.max(0, this.baseHeight - nextOffsetY);
      const clampedWidth = Math.min(normalizedSliceWidth, maxWidth);
      const clampedHeight = Math.min(normalizedSliceHeight, maxHeight);
      return createGridViewFromData(data, {
        width: clampedWidth,
        height: clampedHeight,
        baseWidth: this.baseWidth,
        baseHeight: this.baseHeight,
        defaultValue,
        offsetX: nextOffsetX,
        offsetY: nextOffsetY,
      });
    },
  };
  return view;
}

function normalizeArrayData(source) {
  if (!source) {
    return null;
  }
  if (Array.isArray(source)) {
    return source.slice();
  }
  if (isTypedArray(source)) {
    return Array.from(source);
  }
  return null;
}

function serializeGridView(view) {
  if (!view) {
    return null;
  }
  const width = toFiniteInteger(view.width, 0);
  const height = toFiniteInteger(view.height, 0);
  const data = normalizeArrayData(view.data);
  if (!width || !height || !data) {
    return null;
  }
  return {
    data,
    width,
    height,
    baseWidth: toFiniteInteger(view.baseWidth ?? width, width),
    baseHeight: toFiniteInteger(view.baseHeight ?? height, height),
    offsetX: toFiniteInteger(view.offsetX ?? 0, 0),
    offsetY: toFiniteInteger(view.offsetY ?? 0, 0),
    defaultValue: view.defaultValue ?? null,
  };
}

function restoreGridView(snapshot) {
  if (!snapshot || typeof snapshot !== "object") {
    return null;
  }
  const width = toFiniteInteger(snapshot.width, 0);
  const height = toFiniteInteger(snapshot.height, 0);
  if (!width || !height) {
    return null;
  }
  const data = normalizeArrayData(snapshot.data);
  if (!data) {
    return null;
  }
  return createGridViewFromData(data, {
    width,
    height,
    baseWidth: toFiniteInteger(snapshot.baseWidth ?? width, width),
    baseHeight: toFiniteInteger(snapshot.baseHeight ?? height, height),
    offsetX: toFiniteInteger(snapshot.offsetX ?? 0, 0),
    offsetY: toFiniteInteger(snapshot.offsetY ?? 0, 0),
    defaultValue: snapshot.defaultValue ?? null,
  });
}

function serializeTypedValue(value, seen = new WeakSet()) {
  if (value === null || value === undefined) {
    return value;
  }
  if (typeof value === "function") {
    return undefined;
  }
  if (typeof value !== "object") {
    return value;
  }
  if (isTypedArray(value)) {
    return { __serializedType: value.constructor.name, data: Array.from(value) };
  }
  if (value instanceof ArrayBuffer) {
    return { __serializedType: "ArrayBuffer", data: Array.from(new Uint8Array(value)) };
  }

  if (seen.has(value)) {
    return undefined;
  }
  seen.add(value);

  const nextValue = Array.isArray(value) ? [] : {};
  const entries = Array.isArray(value) ? value.entries() : Object.entries(value);
  for (const [key, entryValue] of entries) {
    const serialized = serializeTypedValue(entryValue, seen);
    if (serialized !== undefined) {
      nextValue[key] = serialized;
    }
  }
  return nextValue;
}

function reviveTypedValue(value) {
  if (value === null || value === undefined) {
    return value;
  }
  if (typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => reviveTypedValue(entry));
  }
  if (value.__serializedType && Array.isArray(value.data)) {
    const ctor = typeof globalThis !== "undefined" ? globalThis[value.__serializedType] : null;
    if (typeof ctor === "function") {
      try {
        return new ctor(value.data);
      } catch (_error) {
        // Fall through to return raw data when constructor fails.
      }
    }
    return value.data;
  }
  const revived = {};
  for (const [key, entry] of Object.entries(value)) {
    revived[key] = reviveTypedValue(entry);
  }
  return revived;
}

function serializeChunkEntry(entry) {
  if (!entry || typeof entry !== "object") {
    return null;
  }
  const snapshot = {};
  const seen = new WeakSet();
  const serializeValue = (value) => serializeTypedValue(value, seen);
  for (const [key, value] of Object.entries(entry)) {
    if (key === "tiles" || key === "types" || key === "elevations") {
      snapshot[key] = serializeGridView(value);
    } else {
      snapshot[key] = serializeValue(value);
    }
  }
  if (Number.isFinite(entry.width)) {
    snapshot.width = toFiniteInteger(entry.width, snapshot.width ?? 0);
  }
  if (Number.isFinite(entry.height)) {
    snapshot.height = toFiniteInteger(entry.height, snapshot.height ?? 0);
  }
  snapshot.xStart = toFiniteInteger(entry.xStart ?? snapshot.xStart ?? 0, 0);
  snapshot.yStart = toFiniteInteger(entry.yStart ?? snapshot.yStart ?? 0, 0);
  return snapshot;
}

function deserializeChunkEntry(snapshot) {
  if (!snapshot || typeof snapshot !== "object") {
    return null;
  }
  const restored = {};
  for (const [key, value] of Object.entries(snapshot)) {
    if (key === "tiles" || key === "types" || key === "elevations") {
      restored[key] = restoreGridView(value);
    } else {
      restored[key] = reviveTypedValue(value);
    }
  }
  if (Number.isFinite(restored.width) && Number.isFinite(restored.height)) {
    restored.size = toFiniteInteger(restored.width, 0) * toFiniteInteger(restored.height, 0);
  }
  return restored;
}

class PersistentChunkStore {
  constructor({
    storagePrefix = "chunk-cache",
    maxEntries = 0,
    onEvict = null,
  } = {}) {
    this.storagePrefix = storagePrefix;
    this.indexKey = `${storagePrefix}::index`;
    this.entryPrefix = `${storagePrefix}::entry::`;
    this.maxEntries = Math.max(0, Math.trunc(maxEntries));
    this.onEvict = typeof onEvict === "function" ? onEvict : null;
    this.persistedKeys = this.readIndex();
    this.enforceLimit();
  }

  setMaxEntries(limit) {
    this.maxEntries = Math.max(0, Math.trunc(limit));
    this.enforceLimit();
  }

  isEnabled() {
    return hasPersistentStorage();
  }

  entryKey(key) {
    return `${this.entryPrefix}${key}`;
  }

  readIndex() {
    if (!this.isEnabled()) {
      return [];
    }
    try {
      const raw = getStorageItem(this.indexKey);
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed)
        ? parsed.filter((key) => typeof key === "string")
        : [];
    } catch (_error) {
      return [];
    }
  }

  writeIndex() {
    if (!this.isEnabled()) {
      return;
    }
    try {
      setStorageItem(this.indexKey, JSON.stringify(this.persistedKeys));
    } catch (_error) {
      // Ignore storage write errors and fall back to in-memory cache only.
    }
  }

  touchKey(key) {
    if (!this.isEnabled()) {
      return;
    }
    const existingIndex = this.persistedKeys.indexOf(key);
    if (existingIndex >= 0) {
      this.persistedKeys.splice(existingIndex, 1);
    }
    this.persistedKeys.push(key);
    this.writeIndex();
  }

  get(key) {
    if (!this.isEnabled()) {
      return null;
    }
    try {
      const raw = getStorageItem(this.entryKey(key));
      if (!raw) {
        this.deleteFromIndex(key);
        return null;
      }
      const parsed = JSON.parse(raw);
      const restored = deserializeChunkEntry(parsed);
      if (restored) {
        this.touchKey(key);
        return restored;
      }
      this.delete(key);
    } catch (_error) {
      this.delete(key);
    }
    return null;
  }

  set(key, value) {
    if (!this.isEnabled()) {
      return;
    }
    const serialized = serializeChunkEntry(value);
    if (!serialized) {
      return;
    }
    try {
      setStorageItem(this.entryKey(key), JSON.stringify(serialized));
      this.touchKey(key);
      this.enforceLimit();
    } catch (_error) {
      // Ignore storage errors and allow the in-memory cache to serve future requests.
    }
  }

  deleteFromIndex(key) {
    if (!this.isEnabled()) {
      return;
    }
    const index = this.persistedKeys.indexOf(key);
    if (index >= 0) {
      this.persistedKeys.splice(index, 1);
      this.writeIndex();
    }
  }

  delete(key) {
    if (!this.isEnabled()) {
      return;
    }
    try {
      removeStorageItem(this.entryKey(key));
    } catch (_error) {
      // Ignore removal errors.
    }
    this.deleteFromIndex(key);
  }

  enforceLimit() {
    if (!this.isEnabled()) {
      return;
    }
    if (this.maxEntries <= 0) {
      this.clear();
      return;
    }
    while (this.persistedKeys.length > this.maxEntries) {
      const oldest = this.persistedKeys.shift();
      if (oldest === undefined) {
        break;
      }
      try {
        removeStorageItem(this.entryKey(oldest));
      } catch (_error) {
        // Ignore removal errors when evicting.
      }
      if (this.onEvict) {
        try {
          this.onEvict(oldest);
        } catch (_error) {
          // Ignore eviction errors to keep eviction progressing.
        }
      }
    }
    this.writeIndex();
  }

  clear() {
    if (!this.isEnabled()) {
      return;
    }
    const keys = [...this.persistedKeys];
    for (const key of keys) {
      try {
        removeStorageItem(this.entryKey(key));
      } catch (_error) {
        // Best-effort cleanup only.
      }
    }
    this.persistedKeys = [];
    try {
      removeStorageItem(this.indexKey);
    } catch (_error) {
      // Ignore cleanup errors.
    }
  }
}

class PersistentChunkCache {
  constructor(maxSize, { storagePrefix = "chunk-cache" } = {}) {
    const normalizedSize = Math.max(0, Math.trunc(maxSize));
    this.storage = new PersistentChunkStore({
      storagePrefix,
      maxEntries: normalizedSize,
      onEvict: (key) => {
        this.memoryCache.delete(key);
      },
    });
    this.memoryCache = new BoundedLRUCache(normalizedSize, (key) => {
      this.storage.delete(key);
    });
  }

  get size() {
    return this.memoryCache.size;
  }

  get capacity() {
    return this.memoryCache.capacity;
  }

  setCapacity(nextCapacity) {
    this.memoryCache.setCapacity(nextCapacity);
    this.storage.setMaxEntries(Math.max(0, Math.trunc(nextCapacity)));
  }

  get(key) {
    const fromMemory = this.memoryCache.get(key);
    if (fromMemory !== undefined) {
      return fromMemory;
    }
    const persisted = this.storage.get(key);
    if (persisted) {
      this.memoryCache.set(key, persisted);
      return persisted;
    }
    return undefined;
  }

  peek(key) {
    return this.memoryCache.peek(key);
  }

  set(key, value) {
    this.memoryCache.set(key, value);
    this.storage.set(key, value);
  }

  has(key) {
    if (this.memoryCache.has(key)) {
      return true;
    }
    const persisted = this.storage.get(key);
    if (persisted) {
      this.memoryCache.set(key, persisted);
      return true;
    }
    return false;
  }

  delete(key) {
    this.storage.delete(key);
    return this.memoryCache.delete(key);
  }

  clear() {
    this.memoryCache.clear();
    this.storage.clear();
  }

  clearPersistent() {
    this.storage.clear();
  }

  entries() {
    return this.memoryCache.entries();
  }
}
function defaultCanvasFactory(size) {
  if (typeof OffscreenCanvas !== "undefined") {
    return new OffscreenCanvas(size, size);
  }
  if (
    typeof document !== "undefined" &&
    typeof document.createElement === "function"
  ) {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    return canvas;
  }
  return {
    width: size,
    height: size,
    getContext: () => null,
  };
}
function resetCanvasSize(canvas, size) {
  if (Number.isFinite(canvas.width)) {
    canvas.width = size;
  }
  if (Number.isFinite(canvas.height)) {
    canvas.height = size;
  }
}
function disposeCanvas(canvas) {
  if (Number.isFinite(canvas.width)) {
    canvas.width = 0;
  }
  if (Number.isFinite(canvas.height)) {
    canvas.height = 0;
  }
  if (typeof canvas.transferToImageBitmap === "function") {
    try {
      canvas.transferToImageBitmap();
    } catch (_error) {
      // Ignore transfer errors; not all canvases support this operation.
    }
  }
}
class SharedCanvasPool {
  constructor(options = {}) {
    this.maxPoolSize = Math.max(0, Math.trunc(options.maxPoolSize ?? 48));
    this.createCanvas =
      typeof options.createCanvas === "function"
        ? options.createCanvas
        : defaultCanvasFactory;
    this.pool = [];
  }
  get size() {
    return this.pool.length;
  }
  acquire(size) {
    const normalized = Math.max(1, Math.trunc(size));
    const canvas = this.pool.pop() ?? this.createCanvas(normalized);
    resetCanvasSize(canvas, normalized);
    return canvas;
  }
  release(canvas) {
    if (!canvas) {
      return;
    }
    if (this.pool.length >= this.maxPoolSize) {
      disposeCanvas(canvas);
      return;
    }
    disposeCanvas(canvas);
    this.pool.push(canvas);
  }
  clear() {
    if (!this.pool.length) {
      return;
    }
    while (this.pool.length) {
      const canvas = this.pool.pop();
      if (canvas) {
        disposeCanvas(canvas);
      }
    }
  }
}
export const sharedCanvasPool = new SharedCanvasPool();
const DEFAULT_CHUNK_DATA_LIMIT = 256;
const DEFAULT_CANVAS_CACHE_LIMIT = 96;
export const chunkDataCache = new PersistentChunkCache(
  DEFAULT_CHUNK_DATA_LIMIT,
  { storagePrefix: "chunk-cache" },
);
export const tileCanvasCache = new BoundedLRUCache(
  DEFAULT_CANVAS_CACHE_LIMIT,
  (_key, canvas) => {
    if (canvas) {
      sharedCanvasPool.release(canvas);
    }
  },
);
export function takeTileCanvasFromCache(key) {
  return tileCanvasCache.get(key);
}
export function storeTileCanvasInCache(key, canvas, size) {
  if (!canvas) {
    return;
  }
  resetCanvasSize(canvas, Math.max(1, Math.trunc(size)));
  tileCanvasCache.set(key, canvas);
}
export function acquireSharedCanvas(size) {
  return sharedCanvasPool.acquire(size);
}
export function releaseSharedCanvas(canvas) {
  sharedCanvasPool.release(canvas);
}

export function clearPersistedChunkCache() {
  chunkDataCache.clearPersistent();
}
