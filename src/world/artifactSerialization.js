const FLOAT_LAYER_KEYS = [
  'elevation',
  'temperature',
  'moisture',
  'runoff',
  'ore',
  'stone',
  'water',
  'fertility'
];

const UINT8_LAYER_KEYS = ['biome'];

function toPlainNumber(value) {
  if (!Number.isFinite(value)) {
    return Number(value) || 0;
  }
  return value;
}

function cloneRecord(record) {
  if (!record || typeof record !== 'object') {
    return null;
  }
  return Object.entries(record).reduce((acc, [key, val]) => {
    if (val === undefined) {
      return acc;
    }
    acc[key] = typeof val === 'number' ? toPlainNumber(val) : val;
    return acc;
  }, {});
}

function serializeTile(tile) {
  if (!tile || typeof tile !== 'object') {
    return null;
  }
  return {
    index: Number.isFinite(tile.index) ? Math.trunc(tile.index) : 0,
    x: Number.isFinite(tile.x) ? Math.trunc(tile.x) : 0,
    y: Number.isFinite(tile.y) ? Math.trunc(tile.y) : 0,
    elevation: Number(tile.elevation ?? 0),
    temperature: Number(tile.temperature ?? 0),
    moisture: Number(tile.moisture ?? 0),
    runoff: Number(tile.runoff ?? 0),
    climate: cloneRecord(tile.climate),
    biome: cloneRecord(tile.biome),
    resources: cloneRecord(tile.resources)
  };
}

function serializeLayer(layer) {
  if (!layer) {
    return [];
  }
  if (Array.isArray(layer)) {
    return layer.map(toPlainNumber);
  }
  if (ArrayBuffer.isView(layer)) {
    return Array.from(layer, toPlainNumber);
  }
  return [];
}

export function serializeCanonicalSeed(seed) {
  if (!seed || typeof seed !== 'object') {
    return null;
  }
  const lanes = Array.isArray(seed.lanes)
    ? seed.lanes.map(value => (Number.isFinite(value) ? value >>> 0 : 0))
    : [];
  return {
    raw: typeof seed.raw === 'string' ? seed.raw : seed.raw != null ? String(seed.raw) : '',
    normalized:
      typeof seed.normalized === 'string'
        ? seed.normalized
        : seed.normalized != null
          ? String(seed.normalized)
          : typeof seed.raw === 'string'
            ? seed.raw
            : '',
    hex: typeof seed.hex === 'string' ? seed.hex : '',
    lanes
  };
}

function toNumberArray(source, size = 0) {
  if (!source) {
    return new Array(size).fill(0);
  }
  if (ArrayBuffer.isView(source)) {
    return Array.from(source, toPlainNumber);
  }
  if (Array.isArray(source)) {
    if (source.length >= size) {
      return source.map(toPlainNumber);
    }
    const result = new Array(size);
    for (let i = 0; i < size; i += 1) {
      result[i] = toPlainNumber(source[i] ?? 0);
    }
    return result;
  }
  return new Array(size).fill(0);
}

function toFloat32Array(source, size = 0) {
  const values = toNumberArray(source, size);
  return Float32Array.from(values);
}

function toUint8Array(source, size = 0) {
  const values = toNumberArray(source, size).map(value => (Number.isFinite(value) ? value >>> 0 : 0));
  return Uint8Array.from(values);
}

function toUint32Array(source, size = 0) {
  const values = toNumberArray(source, size).map(value => (Number.isFinite(value) ? value >>> 0 : 0));
  return Uint32Array.from(values);
}

function freezeTile(tile) {
  if (!tile) {
    return null;
  }
  const climate = tile.climate ? Object.freeze({ ...tile.climate }) : null;
  const biome = tile.biome ? Object.freeze({ ...tile.biome }) : null;
  const resources = tile.resources ? Object.freeze({ ...tile.resources }) : null;
  return Object.freeze({
    index: tile.index,
    x: tile.x,
    y: tile.y,
    elevation: tile.elevation,
    temperature: tile.temperature,
    moisture: tile.moisture,
    runoff: tile.runoff,
    climate,
    biome,
    resources
  });
}

export function serializeWorldArtifact(artifact) {
  if (!artifact || typeof artifact !== 'object') {
    return null;
  }
  const layers = artifact.layers || {};
  const serializedLayers = {};
  for (const key of FLOAT_LAYER_KEYS) {
    serializedLayers[key] = serializeLayer(layers[key]);
  }
  for (const key of UINT8_LAYER_KEYS) {
    serializedLayers[key] = serializeLayer(layers[key]);
  }
  return {
    seed: serializeCanonicalSeed(artifact.seed),
    params: artifact.params && typeof artifact.params === 'object' ? { ...artifact.params } : null,
    dimensions:
      artifact.dimensions && typeof artifact.dimensions === 'object'
        ? {
            width: Number.isFinite(artifact.dimensions.width)
              ? Math.trunc(artifact.dimensions.width)
              : 0,
            height: Number.isFinite(artifact.dimensions.height)
              ? Math.trunc(artifact.dimensions.height)
              : 0,
            size: Number.isFinite(artifact.dimensions.size)
              ? Math.max(0, Math.trunc(artifact.dimensions.size))
              : 0
          }
        : null,
    layers: serializedLayers,
    tiles: Array.isArray(artifact.tiles) ? artifact.tiles.map(serializeTile).filter(Boolean) : [],
    spawnSuggestions: serializeLayer(artifact.spawnSuggestions)
  };
}

export function deserializeCanonicalSeed(seed) {
  if (!seed || typeof seed !== 'object') {
    return null;
  }
  const lanes = Array.isArray(seed.lanes)
    ? seed.lanes.map(value => (Number.isFinite(value) ? value >>> 0 : 0))
    : [];
  return Object.freeze({
    raw: typeof seed.raw === 'string' ? seed.raw : seed.raw != null ? String(seed.raw) : '',
    normalized:
      typeof seed.normalized === 'string'
        ? seed.normalized
        : seed.normalized != null
          ? String(seed.normalized)
          : typeof seed.raw === 'string'
            ? seed.raw
            : '',
    hex: typeof seed.hex === 'string' ? seed.hex : '',
    lanes: Object.freeze([...lanes])
  });
}

export function deserializeWorldArtifact(serialized) {
  if (!serialized || typeof serialized !== 'object') {
    return null;
  }
  const dimensions = serialized.dimensions || {};
  const width = Number.isFinite(dimensions.width) ? Math.max(1, Math.trunc(dimensions.width)) : 0;
  const height = Number.isFinite(dimensions.height) ? Math.max(1, Math.trunc(dimensions.height)) : 0;
  const size = width && height ? width * height : Math.max(0, Math.trunc(dimensions.size || 0));
  const layerSize = size || (Array.isArray(serialized.tiles) ? serialized.tiles.length : 0);
  const layers = serialized.layers || {};
  const elevation = toFloat32Array(layers.elevation, layerSize);
  const temperature = toFloat32Array(layers.temperature, layerSize);
  const moisture = toFloat32Array(layers.moisture, layerSize);
  const runoff = toFloat32Array(layers.runoff, layerSize);
  const ore = toFloat32Array(layers.ore, layerSize);
  const stone = toFloat32Array(layers.stone, layerSize);
  const water = toFloat32Array(layers.water, layerSize);
  const fertility = toFloat32Array(layers.fertility, layerSize);
  const biome = toUint8Array(layers.biome, layerSize);
  const tiles = Array.isArray(serialized.tiles)
    ? serialized.tiles
        .map(tile => {
          if (!tile || typeof tile !== 'object') {
            return null;
          }
          return {
            index: Number.isFinite(tile.index) ? Math.trunc(tile.index) : 0,
            x: Number.isFinite(tile.x) ? Math.trunc(tile.x) : 0,
            y: Number.isFinite(tile.y) ? Math.trunc(tile.y) : 0,
            elevation: Number(tile.elevation ?? 0),
            temperature: Number(tile.temperature ?? 0),
            moisture: Number(tile.moisture ?? 0),
            runoff: Number(tile.runoff ?? 0),
            climate: cloneRecord(tile.climate) || { temperature: 'temperate', moisture: 'balanced', runoff: 'moderate', frostRisk: 0 },
            biome: cloneRecord(tile.biome) || { id: 'temperate-broadleaf', score: 0, reason: 'restored' },
            resources: cloneRecord(tile.resources) || {
              vegetation: 0,
              wood: 0,
              forage: 0,
              ore: 0,
              freshWater: 0,
              fertility: 0
            }
          };
        })
        .filter(Boolean)
        .map(freezeTile)
    : [];

  const spawnSuggestions = Array.isArray(serialized.spawnSuggestions) || ArrayBuffer.isView(serialized.spawnSuggestions)
    ? toUint32Array(serialized.spawnSuggestions)
    : new Uint32Array(0);

  const artifact = {
    seed: deserializeCanonicalSeed(serialized.seed),
    params:
      serialized.params && typeof serialized.params === 'object'
        ? Object.freeze({ ...serialized.params })
        : Object.freeze({ width, height, spawnSuggestionCount: Math.min(layerSize, 64) }),
    dimensions: Object.freeze({
      width,
      height,
      size: layerSize
    }),
    layers: Object.freeze({
      elevation,
      temperature,
      moisture,
      runoff,
      biome,
      ore,
      stone,
      water,
      fertility
    }),
    tiles: Object.freeze(tiles),
    spawnSuggestions
  };

  return Object.freeze(artifact);
}

export default {
  serializeWorldArtifact,
  deserializeWorldArtifact,
  serializeCanonicalSeed,
  deserializeCanonicalSeed
};
