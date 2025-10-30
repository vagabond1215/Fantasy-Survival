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
export const chunkDataCache = new BoundedLRUCache(DEFAULT_CHUNK_DATA_LIMIT);
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
