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

export function chunkKeyFromCoordinate(coordinate: ChunkCoordinate): string;

export class BoundedLRUCache<V> {
  constructor(maxSize: number, onEvict?: (key: string, value: V) => void);
  get size(): number;
  get capacity(): number;
  setCapacity(nextCapacity: number): void;
  get(key: string): V | undefined;
  peek(key: string): V | undefined;
  set(key: string, value: V): void;
  has(key: string): boolean;
  delete(key: string): boolean;
  clear(): void;
  keys(): IterableIterator<string>;
  values(): IterableIterator<V>;
  entries(): IterableIterator<[string, V]>;
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

export const sharedCanvasPool: CanvasPool<CanvasLike>;

export const chunkDataCache: BoundedLRUCache<unknown>;
export const tileCanvasCache: BoundedLRUCache<CanvasLike>;

export function takeTileCanvasFromCache(key: string): CanvasLike | undefined;
export function storeTileCanvasInCache(
  key: string,
  canvas: CanvasLike,
  size: number
): void;

export function acquireSharedCanvas(size: number): CanvasLike;
export function releaseSharedCanvas(canvas: CanvasLike): void;
