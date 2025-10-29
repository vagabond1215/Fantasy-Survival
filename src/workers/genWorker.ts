/// <reference lib="webworker" />

import { chunkKeyFromCoordinate, type ChunkCoordinate } from '../storage/chunkCache';
import {
  createEncryptedStore,
  MAP_ENCRYPTED_STORE,
  type CompressionFormat,
  type EncryptedStore,
  type PersistedChunkRecord
} from '../storage/encryptedStore';
import { hashSeed } from '../utils/random.js';

interface InitMessage {
  type: 'init';
  seed?: string | number;
  chunkSize?: number;
  radius?: number;
  persist?: boolean;
  storeKey?: string;
  storeName?: string;
  dbName?: string;
  maxEntries?: number;
  compression?: CompressionFormat;
}

interface PrefetchMessage {
  type: 'prefetch';
  center: { chunkX?: number; chunkY?: number; x?: number; y?: number; level?: number };
  radius?: number;
}

interface ClearStoreMessage {
  type: 'clear-store';
}

interface ShutdownMessage {
  type: 'shutdown';
}

type WorkerMessage = InitMessage | PrefetchMessage | ClearStoreMessage | ShutdownMessage;

interface ChunkGenerationOptions {
  seed: string;
  chunkSize: number;
  chunkX: number;
  chunkY: number;
}

interface GeneratedChunk {
  key: string;
  chunkX: number;
  chunkY: number;
  level: number;
  xStart: number;
  yStart: number;
  width: number;
  height: number;
  tiles: string[][];
  types: string[][];
  elevations: number[][];
  humidity: number[][];
  generatedAt: number;
  seed: string;
}

interface PersistedChunkPayload {
  version: number;
  chunk: GeneratedChunk;
}

type ChunkStore = EncryptedStore<PersistedChunkPayload>;

type WorkerResponse =
  | { type: 'ready'; persist: boolean; chunkSize: number; radius: number; storeEnabled: boolean }
  | { type: 'chunk'; key: string; chunk: GeneratedChunk; source: 'generated' | 'stored'; persisted: boolean }
  | { type: 'prefetch-complete'; center: { chunkX: number; chunkY: number }; radius: number; generated: number; restored: number }
  | { type: 'store-cleared'; }
  | { type: 'shutdown-complete'; }
  | { type: 'error'; message: string; requestType?: string; stack?: string };

interface WorkerState {
  initialized: boolean;
  seed: string;
  chunkSize: number;
  radius: number;
  persist: boolean;
  storeKey: string;
  storeName: string;
  dbName: string;
  maxEntries: number;
  compression: CompressionFormat;
  storePromise: Promise<ChunkStore | null> | null;
  store: ChunkStore | null;
  active: Set<string>;
}

const ctx = self as unknown as DedicatedWorkerGlobalScope;

const DEFAULT_STORE_NAME = 'world-chunks';
const DEFAULT_DB_NAME = 'fantasy-survival-map';
const DEFAULT_MAX_ENTRIES = 512;
const DEFAULT_CHUNK_SIZE = 64;
const DEFAULT_RADIUS = 1;
const CHUNK_VERSION = 1;

const state: WorkerState = {
  initialized: false,
  seed: '0',
  chunkSize: DEFAULT_CHUNK_SIZE,
  radius: DEFAULT_RADIUS,
  persist: false,
  storeKey: '0',
  storeName: DEFAULT_STORE_NAME,
  dbName: DEFAULT_DB_NAME,
  maxEntries: DEFAULT_MAX_ENTRIES,
  compression: 'gzip',
  storePromise: null,
  store: null,
  active: new Set()
};

ctx.addEventListener('message', event => {
  const message = event.data as WorkerMessage;
  if (!message || typeof message !== 'object') {
    return;
  }
  handleMessage(message).catch(error => {
    postError(message.type, error);
  });
});

async function handleMessage(message: WorkerMessage): Promise<void> {
  switch (message.type) {
    case 'init':
      await handleInit(message);
      return;
    case 'prefetch':
      await handlePrefetch(message);
      return;
    case 'clear-store':
      await handleClearStore();
      return;
    case 'shutdown':
      await handleShutdown();
      return;
    default:
      return;
  }
}

async function handleInit(message: InitMessage): Promise<void> {
  const seedValue = message.seed ?? Date.now();
  state.seed = String(seedValue);
  state.chunkSize = normalizeSize(message.chunkSize, DEFAULT_CHUNK_SIZE);
  state.radius = Math.max(0, Math.trunc(message.radius ?? DEFAULT_RADIUS));
  state.persist = Boolean(message.persist && MAP_ENCRYPTED_STORE);
  state.storeKey = message.storeKey ? String(message.storeKey) : state.seed;
  state.storeName = message.storeName || DEFAULT_STORE_NAME;
  state.dbName = message.dbName || DEFAULT_DB_NAME;
  state.maxEntries = normalizeSize(message.maxEntries, DEFAULT_MAX_ENTRIES);
  state.compression = message.compression || 'gzip';
  state.store = null;
  state.storePromise = null;
  state.active.clear();
  state.initialized = true;

  if (state.persist) {
    try {
      state.store = await ensureStore();
    } catch (error) {
      postError('init', error);
      state.store = null;
      state.persist = false;
    }
  }

  postMessage({
    type: 'ready',
    persist: state.persist && !!state.store?.enabled,
    chunkSize: state.chunkSize,
    radius: state.radius,
    storeEnabled: Boolean(state.store?.enabled)
  } satisfies WorkerResponse);
}

async function handlePrefetch(message: PrefetchMessage): Promise<void> {
  if (!state.initialized) {
    throw new Error('Generator worker not initialized');
  }

  const centerChunkX = normalizeCoordinate(message.center?.chunkX ?? message.center?.x);
  const centerChunkY = normalizeCoordinate(message.center?.chunkY ?? message.center?.y);
  const level = normalizeCoordinate(message.center?.level);
  const radius = Math.max(0, Math.trunc(message.radius ?? state.radius));

  const coords = collectChunkCoordinates(centerChunkX, centerChunkY, radius, level);
  let generated = 0;
  let restored = 0;

  for (const coord of coords) {
    const result = await processChunk(coord);
    if (result === 'generated') {
      generated += 1;
    } else if (result === 'stored') {
      restored += 1;
    }
  }

  postMessage({
    type: 'prefetch-complete',
    center: { chunkX: centerChunkX, chunkY: centerChunkY },
    radius,
    generated,
    restored
  } satisfies WorkerResponse);
}

async function handleClearStore(): Promise<void> {
  try {
    const store = await ensureStore();
    if (store?.enabled) {
      await store.clear();
    }
    postMessage({ type: 'store-cleared' } satisfies WorkerResponse);
  } catch (error) {
    postError('clear-store', error);
  }
}

async function handleShutdown(): Promise<void> {
  if (state.store) {
    try {
      state.store.close();
    } catch (_error) {
      // ignore
    }
  }
  state.store = null;
  state.storePromise = null;
  state.initialized = false;
  state.active.clear();
  postMessage({ type: 'shutdown-complete' } satisfies WorkerResponse);
}

async function ensureStore(): Promise<ChunkStore | null> {
  if (!state.persist || !MAP_ENCRYPTED_STORE) {
    return null;
  }
  if (state.store && state.store.enabled) {
    return state.store;
  }
  if (state.storePromise) {
    return state.storePromise;
  }
  state.storePromise = createEncryptedStore<PersistedChunkPayload>({
    secret: state.storeKey,
    dbName: state.dbName,
    storeName: state.storeName,
    compressionFormat: state.compression,
    maxEntries: state.maxEntries,
    serialize: value => value,
    deserialize: stored => stored as PersistedChunkPayload
  })
    .then(store => {
      if (!store.enabled) {
        return null;
      }
      state.store = store;
      return store;
    })
    .catch(error => {
      postError('store-init', error);
      return null;
    });
  return state.storePromise;
}

async function processChunk(coordinate: ChunkCoordinate): Promise<'generated' | 'stored' | 'skipped' | 'error'> {
  const key = chunkKeyFromCoordinate(coordinate);
  if (state.active.has(key)) {
    return 'skipped';
  }
  state.active.add(key);
  try {
    let chunk: GeneratedChunk | null = null;
    let source: 'generated' | 'stored' = 'generated';
    let persisted = false;
    const store = await ensureStore();

    if (store?.enabled) {
      try {
        const stored = await store.get(key);
        if (stored?.value?.version === CHUNK_VERSION && stored.value.chunk) {
          chunk = stored.value.chunk;
          source = 'stored';
        }
      } catch (error) {
        postError('store-read', error);
      }
    }

    if (!chunk) {
      chunk = generateChunk({
        seed: state.seed,
        chunkSize: state.chunkSize,
        chunkX: coordinate.x,
        chunkY: coordinate.y
      });
      chunk.level = coordinate.level ?? 0;
      if (store?.enabled) {
        try {
          const record: PersistedChunkRecord<PersistedChunkPayload> = {
            key,
            value: { version: CHUNK_VERSION, chunk },
            storedAt: Date.now()
          };
          await store.set(key, record);
          persisted = true;
        } catch (error) {
          postError('store-write', error);
        }
      }
    }

    postMessage({
      type: 'chunk',
      key,
      chunk,
      source,
      persisted: persisted || source === 'stored'
    } satisfies WorkerResponse);

    return source;
  } catch (error) {
    postError('generate', error);
    return 'error';
  } finally {
    state.active.delete(key);
  }
}

function generateChunk(options: ChunkGenerationOptions): GeneratedChunk {
  const { chunkSize, chunkX, chunkY, seed } = options;
  const width = Math.max(1, Math.trunc(chunkSize));
  const height = width;
  const level = 0;
  const tiles: string[][] = [];
  const types: string[][] = [];
  const elevations: number[][] = [];
  const humidity: number[][] = [];
  const xStart = chunkX * width;
  const yStart = chunkY * height;
  const seedKey = seed;

  for (let row = 0; row < height; row += 1) {
    const tileRow: string[] = new Array(width);
    const typeRow: string[] = new Array(width);
    const elevationRow: number[] = new Array(width);
    const humidityRow: number[] = new Array(width);
    const worldY = yStart + row;
    for (let col = 0; col < width; col += 1) {
      const worldX = xStart + col;
      const elevationValue = sampleElevation(seedKey, worldX, worldY);
      const humidityValue = sampleHumidity(seedKey, worldX, worldY);
      const terrain = classifyTerrain(elevationValue, humidityValue);
      tileRow[col] = terrain.symbol;
      typeRow[col] = terrain.type;
      elevationRow[col] = elevationValue;
      humidityRow[col] = humidityValue;
    }
    tiles.push(tileRow);
    types.push(typeRow);
    elevations.push(elevationRow);
    humidity.push(humidityRow);
  }

  return {
    key: chunkKeyFromCoordinate({ x: chunkX, y: chunkY, level }),
    chunkX,
    chunkY,
    level,
    xStart,
    yStart,
    width,
    height,
    tiles,
    types,
    elevations,
    humidity,
    generatedAt: Date.now(),
    seed: seedKey
  };
}

interface TerrainClassification {
  type: string;
  symbol: string;
}

const TERRAIN_TABLE: TerrainClassification[] = [
  { type: 'deep-water', symbol: '~' },
  { type: 'water', symbol: '≈' },
  { type: 'shore', symbol: '.' },
  { type: 'plains', symbol: ',' },
  { type: 'forest', symbol: '♣' },
  { type: 'highland', symbol: '^' },
  { type: 'snow', symbol: '*' }
];

function classifyTerrain(elevation: number, humidity: number): TerrainClassification {
  if (elevation < 0.14) return TERRAIN_TABLE[0];
  if (elevation < 0.2) return TERRAIN_TABLE[1];
  if (elevation < 0.28) return TERRAIN_TABLE[2];
  if (elevation > 0.88) return TERRAIN_TABLE[6];
  if (elevation > 0.74) return TERRAIN_TABLE[5];
  if (humidity > 0.6) return TERRAIN_TABLE[4];
  if (humidity < 0.28) return TERRAIN_TABLE[3];
  return TERRAIN_TABLE[3];
}

function sampleElevation(seed: string, x: number, y: number): number {
  const largeScale = smoothNoise(seed, x * 0.04, y * 0.04);
  const midScale = smoothNoise(seed + ':mid', x * 0.12, y * 0.12);
  const fineScale = smoothNoise(seed + ':fine', x * 0.35, y * 0.35);
  const combined = largeScale * 0.55 + midScale * 0.3 + fineScale * 0.15;
  return clamp(combined, 0, 1);
}

function sampleHumidity(seed: string, x: number, y: number): number {
  const base = smoothNoise(seed + ':humidity', x * 0.06, y * 0.06);
  const detail = smoothNoise(seed + ':humidity-detail', x * 0.18, y * 0.18) * 0.35;
  const combined = base * 0.7 + detail;
  return clamp(combined, 0, 1);
}

function smoothNoise(seed: string, x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;

  const v00 = pseudoRandom(seed, xi, yi);
  const v10 = pseudoRandom(seed, xi + 1, yi);
  const v01 = pseudoRandom(seed, xi, yi + 1);
  const v11 = pseudoRandom(seed, xi + 1, yi + 1);

  const i1 = lerp(v00, v10, fade(xf));
  const i2 = lerp(v01, v11, fade(xf));
  return lerp(i1, i2, fade(yf));
}

function pseudoRandom(seed: string, x: number, y: number): number {
  const value = hashSeed(`${seed}:${x}:${y}`);
  return value / 0xffffffff;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function collectChunkCoordinates(centerX: number, centerY: number, radius: number, level = 0): ChunkCoordinate[] {
  const coords: ChunkCoordinate[] = [];
  for (let dy = -radius; dy <= radius; dy += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      const x = centerX + dx;
      const y = centerY + dy;
      coords.push({ x, y, level });
    }
  }
  coords.sort((a, b) => {
    const da = Math.max(Math.abs(a.x - centerX), Math.abs(a.y - centerY));
    const db = Math.max(Math.abs(b.x - centerX), Math.abs(b.y - centerY));
    if (da !== db) return da - db;
    if (a.y !== b.y) return Math.abs(a.y - centerY) - Math.abs(b.y - centerY);
    return Math.abs(a.x - centerX) - Math.abs(b.x - centerX);
  });
  return coords;
}

function normalizeSize(value: number | undefined, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(1, Math.trunc(value as number));
}

function normalizeCoordinate(value: number | undefined): number {
  if (!Number.isFinite(value)) return 0;
  return Math.trunc(value as number);
}

function postMessage(response: WorkerResponse): void {
  ctx.postMessage(response);
}

function postError(requestType: string, error: unknown) {
  const message = error instanceof Error ? error.message : 'Unknown worker error';
  const stack = error instanceof Error ? error.stack : undefined;
  postMessage({ type: 'error', message, requestType, stack } satisfies WorkerResponse);
}

export {};
