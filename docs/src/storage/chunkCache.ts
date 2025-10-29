export type CanvasLike =
  | OffscreenCanvas
  | HTMLCanvasElement
  | {
      width: number;
      height: number;
      getContext?: (type: string, options?: unknown) => CanvasRenderingContext2D | null;
      transferToImageBitmap?: () => ImageBitmap;
    };

export interface ChunkCoordinate {
  x: number;
  y: number;
  level?: number;
}

export function chunkKeyFromCoordinate(coordinate: ChunkCoordinate): string {
  if (!coordinate) {
    return '0:0:0';
  }
  const level = Number.isFinite(coordinate.level) ? Math.trunc(coordinate.level as number) : 0;
  const x = Math.trunc(coordinate.x ?? 0);
  const y = Math.trunc(coordinate.y ?? 0);
  return `${level}:${x}:${y}`;
}

export class BoundedLRUCache<V> {
  private map: Map<string, V>;
  private maxSize: number;
  private readonly onEvict: ((key: string, value: V) => void) | null;

  constructor(maxSize: number, onEvict?: (key: string, value: V) => void) {
    this.maxSize = Math.max(0, Math.trunc(maxSize));
    this.onEvict = typeof onEvict === 'function' ? onEvict : null;
    this.map = new Map();
  }

  get size(): number {
    return this.map.size;
  }

  get capacity(): number {
    return this.maxSize;
  }

  setCapacity(nextCapacity: number) {
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

  get(key: string): V | undefined {
    if (!this.map.has(key)) {
      return undefined;
    }
    const value = this.map.get(key) as V;
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }

  peek(key: string): V | undefined {
    return this.map.get(key);
  }

  set(key: string, value: V): void {
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

  has(key: string): boolean {
    return this.map.has(key);
  }

  delete(key: string): boolean {
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

  keys(): IterableIterator<string> {
    return this.map.keys();
  }

  values(): IterableIterator<V> {
    return this.map.values();
  }

  entries(): IterableIterator<[string, V]> {
    return this.map.entries();
  }

  private evictIfNeeded() {
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

  private handleEviction(key: string, value: V) {
    if (this.onEvict) {
      try {
        this.onEvict(key, value);
      } catch (_error) {
        // Ignore eviction handler errors to avoid breaking cache invariants.
      }
    }
  }
}

function defaultCanvasFactory(size: number): CanvasLike {
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(size, size);
  }
  if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    return canvas;
  }
  return {
    width: size,
    height: size,
    getContext: () => null
  };
}

function resetCanvasSize(canvas: CanvasLike, size: number) {
  if (Number.isFinite((canvas as { width: number }).width)) {
    (canvas as { width: number }).width = size;
  }
  if (Number.isFinite((canvas as { height: number }).height)) {
    (canvas as { height: number }).height = size;
  }
}

function disposeCanvas(canvas: CanvasLike) {
  if (Number.isFinite((canvas as { width: number }).width)) {
    (canvas as { width: number }).width = 0;
  }
  if (Number.isFinite((canvas as { height: number }).height)) {
    (canvas as { height: number }).height = 0;
  }
  if (typeof (canvas as OffscreenCanvas).transferToImageBitmap === 'function') {
    try {
      (canvas as OffscreenCanvas).transferToImageBitmap();
    } catch (_error) {
      // Ignore transfer errors; not all canvases support this operation.
    }
  }
}

export interface CanvasPool<TCanvas extends CanvasLike> {
  readonly size: number;
  acquire(size: number): TCanvas;
  release(canvas: TCanvas): void;
  clear(): void;
}

export interface CanvasPoolOptions<TCanvas extends CanvasLike> {
  maxPoolSize?: number;
  createCanvas?: (size: number) => TCanvas;
}

class SharedCanvasPool<TCanvas extends CanvasLike> implements CanvasPool<TCanvas> {
  private readonly maxPoolSize: number;
  private readonly createCanvas: (size: number) => TCanvas;
  private readonly pool: TCanvas[];

  constructor(options: CanvasPoolOptions<TCanvas> = {}) {
    this.maxPoolSize = Math.max(0, Math.trunc(options.maxPoolSize ?? 48));
    this.createCanvas =
      (typeof options.createCanvas === 'function' ? options.createCanvas : defaultCanvasFactory) as (size: number) => TCanvas;
    this.pool = [];
  }

  get size(): number {
    return this.pool.length;
  }

  acquire(size: number): TCanvas {
    const normalized = Math.max(1, Math.trunc(size));
    const canvas = this.pool.pop() ?? this.createCanvas(normalized);
    resetCanvasSize(canvas, normalized);
    return canvas;
  }

  release(canvas: TCanvas) {
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

export const sharedCanvasPool: CanvasPool<CanvasLike> = new SharedCanvasPool();

const DEFAULT_CHUNK_DATA_LIMIT = 256;
const DEFAULT_CANVAS_CACHE_LIMIT = 96;

export const chunkDataCache = new BoundedLRUCache<unknown>(DEFAULT_CHUNK_DATA_LIMIT);
export const tileCanvasCache = new BoundedLRUCache<CanvasLike>(DEFAULT_CANVAS_CACHE_LIMIT, (_key, canvas) => {
  if (canvas) {
    sharedCanvasPool.release(canvas);
  }
});

export function takeTileCanvasFromCache(key: string): CanvasLike | undefined {
  return tileCanvasCache.get(key);
}

export function storeTileCanvasInCache(key: string, canvas: CanvasLike, size: number) {
  if (!canvas) {
    return;
  }
  resetCanvasSize(canvas, Math.max(1, Math.trunc(size)));
  tileCanvasCache.set(key, canvas);
}

export function acquireSharedCanvas(size: number): CanvasLike {
  return sharedCanvasPool.acquire(size);
}

export function releaseSharedCanvas(canvas: CanvasLike) {
  sharedCanvasPool.release(canvas);
}
