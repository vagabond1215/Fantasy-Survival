import { adaptWorldToMapData, computeCenteredStart } from './map.js';
import {
  serializeWorldArtifact,
  deserializeWorldArtifact,
  serializeCanonicalSeed,
  deserializeCanonicalSeed
} from './world/artifactSerialization.js';

const DEFAULT_PLAYER_JOB = 'survey';

function coerceTechnologyTimestamp(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isFinite(time) ? time : null;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeTechnologyStateRecord(id, value) {
  const base = value && typeof value === 'object' ? value : {};
  const normalizedId = id || base.id ? String(id || base.id) : null;
  if (!normalizedId) return null;
  const unlocked = base.unlocked === true || base.status === 'unlocked' || (!('unlocked' in base) && Boolean(base.discovered || base.name));
  const discovered = base.discovered === true || unlocked;
  const progress = Number.isFinite(base.progress) ? Math.min(1, Math.max(0, base.progress)) : unlocked ? 1 : 0;
  const label = base.label || base.name || normalizedId;
  const unlockedAt = coerceTechnologyTimestamp(base.unlockedAt ?? base.completedAt ?? null);
  const notes = typeof base.notes === 'string' && base.notes.trim() ? base.notes : null;
  return {
    id: normalizedId,
    unlocked,
    discovered,
    progress,
    unlockedAt,
    label,
    notes
  };
}

function normalizeEntryCollection(input) {
  if (!input) return [];
  if (input instanceof Map) return [...input.entries()];
  if (Array.isArray(input)) return input;
  if (typeof input === 'object') return Object.entries(input);
  return [];
}

function serializeViewport(viewport) {
  if (!viewport || typeof viewport !== 'object') {
    return null;
  }
  const xStart = Number.isFinite(viewport.xStart) ? Math.trunc(viewport.xStart) : null;
  const yStart = Number.isFinite(viewport.yStart) ? Math.trunc(viewport.yStart) : null;
  const width = Number.isFinite(viewport.width) ? Math.max(1, Math.trunc(viewport.width)) : null;
  const height = Number.isFinite(viewport.height) ? Math.max(1, Math.trunc(viewport.height)) : null;
  return {
    xStart,
    yStart,
    width,
    height
  };
}

function serializeMapState(map) {
  if (!map || typeof map !== 'object') {
    return null;
  }
  const serialized = {
    seed: map.seed ?? null,
    seedInfo: serializeCanonicalSeed(map.seedInfo) ?? null,
    season: map.season ?? null,
    xStart: Number.isFinite(map.xStart) ? Math.trunc(map.xStart) : null,
    yStart: Number.isFinite(map.yStart) ? Math.trunc(map.yStart) : null,
    width: Number.isFinite(map.width)
      ? Math.max(1, Math.trunc(map.width))
      : Array.isArray(map.tiles?.[0])
        ? map.tiles[0].length
        : null,
    height: Number.isFinite(map.height)
      ? Math.max(1, Math.trunc(map.height))
      : Array.isArray(map.tiles)
        ? map.tiles.length
        : null,
    viewport: serializeViewport(map.viewport),
    worldSettings: map.worldSettings ? normalizeWorldSettings(map.worldSettings) : null,
    waterLevel: map.waterLevel ?? null
  };
  return serialized;
}

function deserializeViewport(viewport, defaults) {
  const base = viewport && typeof viewport === 'object' ? viewport : {};
  const fallback = defaults || { xStart: 0, yStart: 0, width: 1, height: 1 };
  const width = Number.isFinite(base.width) ? Math.max(1, Math.trunc(base.width)) : fallback.width;
  const height = Number.isFinite(base.height) ? Math.max(1, Math.trunc(base.height)) : fallback.height;
  const xStart = Number.isFinite(base.xStart) ? Math.trunc(base.xStart) : fallback.xStart;
  const yStart = Number.isFinite(base.yStart) ? Math.trunc(base.yStart) : fallback.yStart;
  return { xStart, yStart, width, height };
}

function rebuildMapFromWorld(world, mapState = null) {
  if (!world) {
    return mapState && typeof mapState === 'object' ? { ...mapState } : null;
  }

  const dimensions = world.dimensions || {};
  const widthSource =
    dimensions.width ?? (mapState && Number.isFinite(mapState.width) ? mapState.width : 0);
  const heightSource =
    dimensions.height ?? (mapState && Number.isFinite(mapState.height) ? mapState.height : 0);
  const worldWidth = Math.max(1, Math.trunc(widthSource || 0));
  const worldHeight = Math.max(1, Math.trunc(heightSource || 0));
  const defaults = computeCenteredStart(worldWidth, worldHeight);
  const xStart = mapState && Number.isFinite(mapState.xStart) ? Math.trunc(mapState.xStart) : defaults.xStart;
  const yStart = mapState && Number.isFinite(mapState.yStart) ? Math.trunc(mapState.yStart) : defaults.yStart;
  const viewport = deserializeViewport(mapState?.viewport, {
    xStart,
    yStart,
    width: worldWidth,
    height: worldHeight
  });
  const seedInfo = mapState?.seedInfo
    ? deserializeCanonicalSeed(mapState.seedInfo)
    : world.seed
      ? deserializeCanonicalSeed(world.seed)
      : null;
  const seedString = typeof mapState?.seed === 'string'
    ? mapState.seed
    : seedInfo?.raw ?? (typeof world.seed?.raw === 'string' ? world.seed.raw : '');
  const worldSettings = mapState?.worldSettings ? normalizeWorldSettings(mapState.worldSettings) : null;

  const map = adaptWorldToMapData(world, {
    seedInfo,
    seedString,
    season: mapState?.season ?? null,
    xStart,
    yStart,
    viewport,
    worldSettings
  });

  map.waterLevel = mapState?.waterLevel ?? map.waterLevel ?? null;
  if (seedInfo) {
    map.seedInfo = seedInfo;
  }
  if (seedString !== undefined) {
    map.seed = seedString;
  }
  map.world = world;
  return map;
}

function serializeLocationState(location) {
  if (!location || typeof location !== 'object') {
    return location;
  }
  const serialized = { ...location };
  if (serialized.world) {
    serialized.world = serializeWorldArtifact(serialized.world);
  }
  if (serialized.map) {
    serialized.map = serializeMapState(serialized.map);
  }
  if (serialized.worldSettings) {
    serialized.worldSettings = normalizeWorldSettings(serialized.worldSettings);
  }
  return serialized;
}

function deserializeLocationState(rawLocation) {
  if (!rawLocation || typeof rawLocation !== 'object') {
    return rawLocation;
  }
  const base = { ...rawLocation };
  const storedMap = base.map && typeof base.map === 'object' ? { ...base.map } : null;
  const storedWorld = base.world ?? storedMap?.world ?? null;
  const world = deserializeWorldArtifact(storedWorld);
  base.world = world;
  if (world) {
    base.map = rebuildMapFromWorld(world, storedMap);
  } else if (storedMap) {
    base.map = { ...storedMap };
  } else {
    base.map = null;
  }
  if (base.map && base.world && !base.map.world) {
    base.map.world = base.world;
  }
  base.worldSettings = normalizeWorldSettings(base.worldSettings ?? base.map?.worldSettings ?? null);
  return base;
}

class DataStore {
  constructor() {
    this.buildings = new Map();
    this.people = new Map();
    this.inventory = new Map();
    this.craftTargets = new Map();
    this.locations = new Map();
    this.technologies = new Map();
    this.proficiencies = new Map();
    this.player = { locationId: null, x: 0, y: 0, jobId: DEFAULT_PLAYER_JOB };
    this.time = { day: 1, month: 1, year: 410, hour: 6, season: 'Thawbound', weather: 'Clear' };
    this.difficulty = 'normal';
    this.jobs = {};
    this.orders = [];
    this.eventLog = [];
    this.orderSeq = 0;
    this.unlockedBuildings = new Set();
    this.research = new Set();
    this.buildingSeq = 0;
    this.gatherNodes = new Map();
    this.discoveredFauna = new Map();
    this.discoveredFlora = new Map();
    this.jobSettings = {};
    this.jobDaily = {};
    this.buildQueue = 0;
    this.haulQueue = 0;
    this.worldSettings = null;
  }

  addItem(collection, item) {
    const id = item.id;
    if (!id) {
      console.warn(`Missing id for ${collection} item`, item);
      return;
    }
    if (!this[collection].has(id)) {
      this[collection].set(id, item);
    } else {
      console.warn(`Duplicate ${collection} id ${id} ignored.`);
    }
  }

  updateItem(collection, item) {
    const id = item.id;
    if (this[collection].has(id)) {
      const current = this[collection].get(id);
      this[collection].set(id, { ...current, ...item });
    } else {
      console.warn(`Cannot update missing ${collection} id ${id}.`);
    }
  }

  getItem(collection, id) {
    return this[collection].get(id);
  }

  // Serialize store to plain object for saving.
  serialize() {
    const technologies = [...this.technologies.entries()]
      .map(([id, value]) => {
        const normalized = normalizeTechnologyStateRecord(id, value);
        return normalized ? [normalized.id, normalized] : null;
      })
      .filter(Boolean);
    return {
      buildings: [...this.buildings.entries()],
      people: [...this.people.entries()],
      inventory: [...this.inventory.entries()],
      craftTargets: [...this.craftTargets.entries()],
      locations: [...this.locations.entries()].map(([id, value]) => [id, serializeLocationState(value)]),
      technologies,
      proficiencies: [...this.proficiencies.entries()],
      player: { ...this.player },
      time: this.time,
      difficulty: this.difficulty,
      jobs: this.jobs,
      orders: this.orders,
      eventLog: this.eventLog,
      orderSeq: this.orderSeq,
      unlockedBuildings: [...this.unlockedBuildings],
      research: [...this.research],
      buildingSeq: this.buildingSeq,
      gatherNodes: [...this.gatherNodes.entries()],
      discoveredFauna: [...this.discoveredFauna.entries()].map(([biomeId, entries]) => [
        biomeId,
        [...entries]
      ]),
      discoveredFlora: [...this.discoveredFlora.entries()].map(([biomeId, entries]) => [
        biomeId,
        [...entries]
      ]),
      jobSettings: this.jobSettings,
      jobDaily: this.jobDaily,
      worldSettings: normalizeWorldSettings(this.worldSettings)
    };
  }

  // Load store from serialized data.
  deserialize(data) {
    this.buildings = new Map(normalizeEntryCollection(data.buildings));
    this.people = new Map(normalizeEntryCollection(data.people));
    this.inventory = new Map(normalizeEntryCollection(data.inventory));
    this.craftTargets = new Map(normalizeEntryCollection(data.craftTargets));
    const rawLocations = normalizeEntryCollection(data.locations);
    const locationEntries = rawLocations
      .map(entry => {
        if (Array.isArray(entry) && entry.length >= 2) {
          const [rawId, value] = entry;
          if (rawId === undefined || rawId === null) {
            return null;
          }
          const id = String(rawId);
          const deserialized = deserializeLocationState(value);
          if (deserialized && (deserialized.id === undefined || deserialized.id === null)) {
            deserialized.id = id;
          }
          return [id, deserialized];
        }
        if (entry && typeof entry === 'object') {
          const deserialized = deserializeLocationState(entry);
          const derivedId = deserialized?.id ?? entry.id;
          if (derivedId === undefined || derivedId === null) {
            return null;
          }
          const id = String(derivedId);
          if (deserialized && (deserialized.id === undefined || deserialized.id === null)) {
            deserialized.id = id;
          }
          return [id, deserialized];
        }
        return null;
      })
      .filter(Boolean);
    this.locations = new Map(locationEntries);
    const rawTechnologies = Array.isArray(data.technologies)
      ? data.technologies
      : data.technologies && typeof data.technologies === 'object'
        ? Object.entries(data.technologies)
        : [];
    const technologyEntries = rawTechnologies
      .map(entry => {
        if (Array.isArray(entry) && entry.length >= 2) {
          const normalized = normalizeTechnologyStateRecord(entry[0], entry[1]);
          return normalized ? [normalized.id, normalized] : null;
        }
        if (entry && typeof entry === 'object') {
          const normalized = normalizeTechnologyStateRecord(entry.id, entry);
          return normalized ? [normalized.id, normalized] : null;
        }
        return null;
      })
      .filter(Boolean);
    this.technologies = new Map(technologyEntries);
    this.proficiencies = new Map(normalizeEntryCollection(data.proficiencies));
    const savedPlayer = data.player || {};
    this.player = {
      locationId: savedPlayer.locationId ?? null,
      x: Number.isFinite(savedPlayer.x) ? Math.trunc(savedPlayer.x) : 0,
      y: Number.isFinite(savedPlayer.y) ? Math.trunc(savedPlayer.y) : 0,
      jobId: typeof savedPlayer.jobId === 'string' && savedPlayer.jobId ? savedPlayer.jobId : DEFAULT_PLAYER_JOB
    };
    const savedTime = data.time || {};
    this.time = {
      day: 1,
      month: 1,
      year: 410,
      hour: 6,
      season: 'Thawbound',
      weather: 'Clear',
      ...savedTime
    };
    this.difficulty = data.difficulty || 'normal';
    this.jobs = data.jobs || {};
    this.orders = data.orders || [];
    this.eventLog = data.eventLog || [];
    this.orderSeq = data.orderSeq || 0;
    this.unlockedBuildings = new Set(data.unlockedBuildings || []);
    this.research = new Set(data.research || []);
    this.buildingSeq = data.buildingSeq || 0;
    this.gatherNodes = new Map(normalizeEntryCollection(data.gatherNodes));
    this.jobSettings = data.jobSettings || {};
    this.jobDaily = data.jobDaily || {};
    this.worldSettings = normalizeWorldSettings(data.worldSettings);
    const faunaEntries = Array.isArray(data.discoveredFauna)
      ? data.discoveredFauna
      : Object.entries(data.discoveredFauna || {});
    this.discoveredFauna = new Map(
      faunaEntries.map(entry => {
        const [biomeId, items] = entry || [];
        return [biomeId, new Set(items || [])];
      })
    );
    const floraEntries = Array.isArray(data.discoveredFlora)
      ? data.discoveredFlora
      : Object.entries(data.discoveredFlora || {});
    this.discoveredFlora = new Map(
      floraEntries.map(entry => {
        const [biomeId, items] = entry || [];
        return [biomeId, new Set(items || [])];
      })
    );
  }
}

export const WORLD_CONFIG_CHANGED = 'WORLD_CONFIG_CHANGED';

/**
 * @typedef {Object} WorldConfig
 * @property {string | null} startingBiomeId
 * @property {string | null} season
 * @property {string | null} seed
 * @property {string | null} difficulty
 * @property {Record<string, any> | null} worldParameters
 */

/**
 * @typedef {Object} WorldConfigUpdate
 * @property {string | null | undefined} [startingBiomeId]
 * @property {string | null | undefined} [biome] Legacy alias for `startingBiomeId`.
 * @property {string | null | undefined} [season]
 * @property {string | null | undefined} [seed]
 * @property {string | null | undefined} [difficulty]
 * @property {Record<string, any> | null | undefined} [worldParameters]
 */

const worldConfigState = {
  startingBiomeId: null,
  season: null,
  seed: null,
  difficulty: null,
  worldParameters: null
};

function extractStartingBiomeId(source) {
  if (!source || typeof source !== 'object') {
    return { present: false, value: undefined };
  }
  if (Object.prototype.hasOwnProperty.call(source, 'startingBiomeId')) {
    return { present: true, value: source.startingBiomeId ?? null };
  }
  if (Object.prototype.hasOwnProperty.call(source, 'biome')) {
    return { present: true, value: source.biome ?? null };
  }
  return { present: false, value: undefined };
}

const worldConfigListeners = new Set();

function normalizeWorldSettings(world) {
  if (!world || typeof world !== 'object') return null;
  const { advanced, ...rest } = world;
  const normalized = { ...rest };
  const clonedAdvanced =
    advanced && typeof advanced === 'object' ? { ...advanced } : advanced ?? null;
  normalized.advanced = clonedAdvanced;
  const { present: hasStartingBiome, value: normalizedBiome } = extractStartingBiomeId(world);
  if (hasStartingBiome) {
    normalized.startingBiomeId = normalizedBiome;
  }
  if ('biome' in normalized) {
    delete normalized.biome;
  }
  return normalized;
}

function cloneWorldConfigParameters(params) {
  if (!params || typeof params !== 'object') return null;
  const { advanced, ...rest } = params;
  const normalized = { ...rest };
  const { present: hasStartingBiome, value: normalizedBiome } = extractStartingBiomeId(normalized);
  if (hasStartingBiome) {
    normalized.startingBiomeId = normalizedBiome;
  }
  if ('biome' in normalized) {
    delete normalized.biome;
  }
  const clonedAdvanced =
    advanced && typeof advanced === 'object' ? { ...advanced } : advanced ?? null;
  return {
    ...normalized,
    advanced: clonedAdvanced
  };
}

function areWorldParametersEqual(a, b) {
  if (a === b) return true;
  if (!a || !b) return !a && !b;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if (key === 'advanced') continue;
    if ((a[key] ?? null) !== (b[key] ?? null)) {
      return false;
    }
  }
  const advA = a.advanced && typeof a.advanced === 'object' ? a.advanced : {};
  const advB = b.advanced && typeof b.advanced === 'object' ? b.advanced : {};
  const advKeys = new Set([...Object.keys(advA), ...Object.keys(advB)]);
  for (const key of advKeys) {
    if ((advA[key] ?? null) !== (advB[key] ?? null)) {
      return false;
    }
  }
  return true;
}

/**
 * @returns {WorldConfig}
 */
export function getWorldConfig() {
  return {
    startingBiomeId: worldConfigState.startingBiomeId,
    season: worldConfigState.season,
    seed: worldConfigState.seed,
    difficulty: worldConfigState.difficulty,
    worldParameters: worldConfigState.worldParameters
      ? cloneWorldConfigParameters(worldConfigState.worldParameters)
      : null
  };
}

function emitWorldConfigChanged() {
  const snapshot = getWorldConfig();
  worldConfigListeners.forEach(listener => {
    try {
      listener(snapshot);
    } catch (error) {
      console.error('Error in world config listener', error);
    }
  });
  if (typeof document !== 'undefined' && typeof document.dispatchEvent === 'function') {
    document.dispatchEvent(new CustomEvent(WORLD_CONFIG_CHANGED, { detail: snapshot }));
  }
}

export function onWorldConfigChange(listener, options = {}) {
  if (typeof listener !== 'function') return () => {};
  worldConfigListeners.add(listener);
  if (options?.immediate) {
    try {
      listener(getWorldConfig());
    } catch (error) {
      console.error('Error in immediate world config listener', error);
    }
  }
  return () => worldConfigListeners.delete(listener);
}

/**
 * @param {WorldConfigUpdate | null | undefined} partial
 * @param {{ silent?: boolean, force?: boolean }} [options]
 * @returns {WorldConfig}
 */
export function updateWorldConfig(partial = {}, options = {}) {
  if (!partial || typeof partial !== 'object') {
    return getWorldConfig();
  }
  const { silent = false, force = false } = options;
  let changed = false;

  const { present: hasStartingBiome, value: nextStartingBiomeId } = extractStartingBiomeId(partial);
  if (hasStartingBiome && nextStartingBiomeId !== worldConfigState.startingBiomeId) {
    worldConfigState.startingBiomeId = nextStartingBiomeId ?? null;
    changed = true;
  }
  if ('season' in partial && partial.season !== worldConfigState.season) {
    worldConfigState.season = partial.season ?? null;
    changed = true;
  }
  if ('seed' in partial && partial.seed !== worldConfigState.seed) {
    worldConfigState.seed = partial.seed ?? null;
    changed = true;
  }
  if ('difficulty' in partial && partial.difficulty !== worldConfigState.difficulty) {
    worldConfigState.difficulty = partial.difficulty ?? null;
    changed = true;
  }
  if ('worldParameters' in partial) {
    const nextWorldParams = /** @type {WorldConfigUpdate} */ (partial).worldParameters;
    const nextWorld = nextWorldParams ? cloneWorldConfigParameters(nextWorldParams) : null;
    if (!areWorldParametersEqual(worldConfigState.worldParameters, nextWorld)) {
      worldConfigState.worldParameters = nextWorld;
      changed = true;
    }
  }

  if ((changed || force) && !silent) {
    emitWorldConfigChanged();
  }
  return getWorldConfig();
}

/**
 * @param {WorldConfigUpdate | null | undefined} next
 * @returns {WorldConfig}
 */
export function resetWorldConfig(next = {}) {
  const { present: hasStartingBiome, value: nextStartingBiomeId } = extractStartingBiomeId(next);
  worldConfigState.startingBiomeId = hasStartingBiome ? nextStartingBiomeId ?? null : null;
  worldConfigState.season = next?.season ?? null;
  worldConfigState.seed = next?.seed ?? null;
  worldConfigState.difficulty = next?.difficulty ?? null;
  const nextWorldParams = next?.worldParameters;
  worldConfigState.worldParameters = nextWorldParams
    ? cloneWorldConfigParameters(nextWorldParams)
    : null;
  emitWorldConfigChanged();
  return getWorldConfig();
}

const store = new DataStore();
export default store;
