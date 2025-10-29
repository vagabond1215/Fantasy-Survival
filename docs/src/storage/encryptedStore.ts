const DEFAULT_DB_NAME = 'fantasy-survival-map';
const DEFAULT_STORE_NAME = 'world-chunks';
const DEFAULT_COMPRESSION_FORMAT: CompressionFormat = 'gzip';
const STORE_VERSION = 1;

const globalObject: typeof globalThis | undefined = typeof globalThis !== 'undefined' ? globalThis : undefined;
const featureFlag = Boolean((globalObject as Record<string, unknown> | undefined)?.MAP_ENCRYPTED_STORE);

const runtimeSupportsEncryption = Boolean(
  typeof indexedDB !== 'undefined' &&
    typeof CompressionStream !== 'undefined' &&
    typeof DecompressionStream !== 'undefined' &&
    typeof crypto !== 'undefined' &&
    typeof crypto.getRandomValues === 'function' &&
    !!crypto.subtle &&
    typeof crypto.subtle.importKey === 'function'
);

export const MAP_ENCRYPTED_STORE = featureFlag && runtimeSupportsEncryption;
export const ENCRYPTED_STORE_SUPPORT = runtimeSupportsEncryption;

export function isEncryptedStoreEnabled(): boolean {
  return MAP_ENCRYPTED_STORE;
}

export function isEncryptedStoreSupported(): boolean {
  return runtimeSupportsEncryption;
}

export type CompressionFormat = 'gzip' | 'deflate' | 'deflate-raw';

export interface EncryptedStoreOptions<TValue = unknown> {
  secret: string;
  dbName?: string;
  storeName?: string;
  compressionFormat?: CompressionFormat;
  maxEntries?: number;
  serialize?: (value: TValue) => unknown;
  deserialize?: (stored: unknown) => TValue;
}

export interface PersistedChunkRecord<TValue = unknown> {
  key: string;
  value: TValue;
  storedAt: number;
  source?: string;
}

interface StoredPayload {
  key: string;
  iv: ArrayBuffer;
  salt: ArrayBuffer;
  payload: ArrayBuffer;
  format: 'json' | 'binary';
  storedAt: number;
  version: number;
}

interface InternalStore<TValue> {
  enabled: boolean;
  get(key: string): Promise<PersistedChunkRecord<TValue> | null>;
  set(key: string, value: PersistedChunkRecord<TValue>): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  close(): void;
}

interface NormalizedEncryptedStoreOptions<TValue> {
  secret: string;
  dbName: string;
  storeName: string;
  compressionFormat: CompressionFormat;
  maxEntries: number | null;
  serialize: (value: TValue) => unknown;
  deserialize: (stored: unknown) => TValue;
}

class DisabledStore<TValue> implements InternalStore<TValue> {
  readonly enabled = false;

  async get(_key: string): Promise<PersistedChunkRecord<TValue> | null> {
    return null;
  }

  async set(_key: string, _value: PersistedChunkRecord<TValue>): Promise<void> {
    // no-op
  }

  async delete(_key: string): Promise<void> {
    // no-op
  }

  async clear(): Promise<void> {
    // no-op
  }

  close(): void {
    // no-op
  }
}

class IndexedDbEncryptedStore<TValue> implements InternalStore<TValue> {
  readonly enabled = true;
  private readonly dbName: string;
  private readonly storeName: string;
  private readonly compressionFormat: CompressionFormat;
  private readonly serialize: (value: TValue) => unknown;
  private readonly deserialize: (stored: unknown) => TValue;
  private readonly maxEntries: number | null;
  private database: IDBDatabase | null;
  private keyMaterial: Promise<CryptoKey> | null;

  constructor(options: NormalizedEncryptedStoreOptions<TValue>) {
    this.dbName = options.dbName;
    this.storeName = options.storeName;
    this.compressionFormat = options.compressionFormat;
    this.serialize = options.serialize;
    this.deserialize = options.deserialize;
    this.maxEntries = options.maxEntries;
    this.database = null;
    this.keyMaterial = null;
  }

  async initialize(secret: string): Promise<void> {
    this.database = await this.openDatabase();
    this.keyMaterial = this.importKeyMaterial(secret);
  }

  async get(key: string): Promise<PersistedChunkRecord<TValue> | null> {
    const db = await this.ensureDatabase();
    if (!db) return null;
    const tx = db.transaction(this.storeName, 'readonly');
    const store = tx.objectStore(this.storeName);
    const request = store.get(key);
    const record = await requestToPromise<StoredPayload | undefined>(request);
    if (!record) {
      return null;
    }
    try {
      const decrypted = await this.decrypt(record);
      const decoded = await this.decodePayload(decrypted, record.format);
      const value = this.deserialize(decoded);
      return { key: record.key, value, storedAt: record.storedAt };
    } catch (_error) {
      await this.delete(key);
      return null;
    }
  }

  async set(key: string, value: PersistedChunkRecord<TValue>): Promise<void> {
    const db = await this.ensureDatabase();
    if (!db) return;
    try {
      const encoded = this.serialize(value.value);
      const { payload, format } = await this.encodePayload(encoded);
      const encrypted = await this.encrypt(payload);
      const stored: StoredPayload = {
        key,
        iv: encrypted.iv,
        salt: encrypted.salt,
        payload: encrypted.encrypted,
        format,
        storedAt: value.storedAt,
        version: STORE_VERSION
      };
      const tx = db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      await requestToPromise(store.put(stored));
      await transactionComplete(tx);
      if (this.maxEntries) {
        await this.trimStore(db, this.maxEntries);
      }
    } catch (error) {
      console.error('Failed to persist chunk', error);
    }
  }

  async delete(key: string): Promise<void> {
    const db = await this.ensureDatabase();
    if (!db) return;
    const tx = db.transaction(this.storeName, 'readwrite');
    const store = tx.objectStore(this.storeName);
    await requestToPromise(store.delete(key));
    await transactionComplete(tx);
  }

  async clear(): Promise<void> {
    const db = await this.ensureDatabase();
    if (!db) return;
    const tx = db.transaction(this.storeName, 'readwrite');
    const store = tx.objectStore(this.storeName);
    await requestToPromise(store.clear());
    await transactionComplete(tx);
  }

  close(): void {
    if (this.database) {
      try {
        this.database.close();
      } catch (_error) {
        // Ignore close errors.
      }
      this.database = null;
    }
  }

  private async ensureDatabase(): Promise<IDBDatabase | null> {
    if (this.database) {
      return this.database;
    }
    try {
      this.database = await this.openDatabase();
      return this.database;
    } catch (error) {
      console.error('Failed to open encrypted store database', error);
      return null;
    }
  }

  private async openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, STORE_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        let store: IDBObjectStore;
        if (!db.objectStoreNames.contains(this.storeName)) {
          store = db.createObjectStore(this.storeName, { keyPath: 'key' });
        } else {
          store = request.transaction!.objectStore(this.storeName);
        }
        if (!store.indexNames.contains('by-storedAt')) {
          store.createIndex('by-storedAt', 'storedAt');
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('IndexedDB error'));
    });
  }

  private async trimStore(db: IDBDatabase, limit: number) {
    const tx = db.transaction(this.storeName, 'readwrite');
    const store = tx.objectStore(this.storeName);
    const total = await requestToPromise<number>(store.count());
    if (total <= limit) {
      await transactionComplete(tx);
      return;
    }
    const removeCount = total - limit;
    const index = store.index('by-storedAt');
    await new Promise<void>((resolve, reject) => {
      let removed = 0;
      const cursorRequest = index.openCursor();
      cursorRequest.onerror = () => reject(cursorRequest.error ?? new Error('Failed to iterate store'));
      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result;
        if (!cursor) {
          resolve();
          return;
        }
        if (removed < removeCount) {
          cursor.delete();
          removed += 1;
          cursor.continue();
          return;
        }
        resolve();
        return;
      };
    });
    await transactionComplete(tx);
  }

  private async importKeyMaterial(secret: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const secretBytes = encoder.encode(secret || 'world-key');
    return crypto.subtle.importKey('raw', secretBytes, 'PBKDF2', false, ['deriveKey']);
  }

  private async deriveKey(salt: ArrayBuffer): Promise<CryptoKey> {
    const material = await (this.keyMaterial as Promise<CryptoKey>);
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 150000,
        hash: 'SHA-256'
      },
      material,
      {
        name: 'AES-GCM',
        length: 256
      },
      false,
      ['encrypt', 'decrypt']
    );
  }

  private async encodePayload(value: unknown): Promise<{ payload: Uint8Array; format: 'json' | 'binary' }> {
    if (value instanceof ArrayBuffer) {
      return { payload: new Uint8Array(value), format: 'binary' };
    }
    if (ArrayBuffer.isView(value)) {
      const view = value as ArrayBufferView;
      return { payload: new Uint8Array(view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength)), format: 'binary' };
    }
    if (typeof Blob !== 'undefined' && value instanceof Blob) {
      const buffer = await value.arrayBuffer();
      return { payload: new Uint8Array(buffer), format: 'binary' };
    }
    const encoder = new TextEncoder();
    const text = JSON.stringify(value ?? null);
    return { payload: encoder.encode(text ?? 'null'), format: 'json' };
  }

  private async decodePayload(data: Uint8Array, format: 'json' | 'binary'): Promise<unknown> {
    if (format === 'json') {
      const decoder = new TextDecoder();
      const text = decoder.decode(data);
      if (!text) return null;
      try {
        return JSON.parse(text);
      } catch (_error) {
        return null;
      }
    }
    return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  }

  private async encrypt(data: Uint8Array): Promise<{ encrypted: ArrayBuffer; iv: ArrayBuffer; salt: ArrayBuffer }> {
    const iv = new Uint8Array(12);
    crypto.getRandomValues(iv);
    const salt = new Uint8Array(16);
    crypto.getRandomValues(salt);
    const key = await this.deriveKey(salt.buffer);
    const compressed = await compressBytes(data, this.compressionFormat);
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, compressed.slice().buffer);
    return { encrypted, iv: iv.buffer, salt: salt.buffer };
  }

  private async decrypt(record: StoredPayload): Promise<Uint8Array> {
    const key = await this.deriveKey(record.salt);
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: record.iv }, key, record.payload);
    return decompressBytes(new Uint8Array(decrypted), this.compressionFormat);
  }
}

async function compressBytes(data: Uint8Array, format: CompressionFormat): Promise<Uint8Array> {
  const stream = new CompressionStream(format);
  const writer = stream.writable.getWriter();
  await writer.write(data.slice().buffer);
  await writer.close();
  return readStream(stream.readable);
}

async function decompressBytes(data: Uint8Array, format: CompressionFormat): Promise<Uint8Array> {
  const stream = new DecompressionStream(format);
  const writer = stream.writable.getWriter();
  await writer.write(data.slice().buffer);
  await writer.close();
  return readStream(stream.readable);
}

async function readStream(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      total += value.length;
    }
  }
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

function transactionComplete(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'));
  });
}

export type EncryptedStore<TValue = unknown> = InternalStore<TValue>;

export async function createEncryptedStore<TValue = unknown>(
  options: EncryptedStoreOptions<TValue>
): Promise<EncryptedStore<TValue>> {
  if (!MAP_ENCRYPTED_STORE) {
    return new DisabledStore<TValue>();
  }
  const normalized: NormalizedEncryptedStoreOptions<TValue> = {
    secret: options.secret || 'world-key',
    dbName: options.dbName || DEFAULT_DB_NAME,
    storeName: options.storeName || DEFAULT_STORE_NAME,
    compressionFormat: options.compressionFormat || DEFAULT_COMPRESSION_FORMAT,
    maxEntries: Number.isFinite(options.maxEntries)
      ? Math.max(1, Math.trunc(options.maxEntries as number))
      : null,
    serialize: options.serialize || ((value: TValue) => value),
    deserialize: options.deserialize || (value => value as TValue)
  };
  const store = new IndexedDbEncryptedStore<TValue>(normalized);
  try {
    await store.initialize(normalized.secret);
    return store;
  } catch (error) {
    console.error('Failed to initialize encrypted store', error);
    store.close();
    return new DisabledStore<TValue>();
  }
}
