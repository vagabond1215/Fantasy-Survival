import store from './state.js';
import { biomeWildlifeData } from './biomeWildlife.js';
import { getBiome } from './biomes.js';
import { slugify } from './utils/strings.js';

const TYPE_CONFIG = {
  fauna: {
    mapKey: 'discoveredFauna',
    collection: 'animals',
    unknownLabel: 'Unidentified creature'
  },
  flora: {
    mapKey: 'discoveredFlora',
    collection: 'plants',
    unknownLabel: 'Uncatalogued specimen'
  }
};

function makeEntryId(type, biomeId, name) {
  return `${type}:${biomeId}:${slugify(name, { fallback: 'entry' })}`;
}

function ensureDiscoveryMap(type) {
  const config = TYPE_CONFIG[type];
  if (!config) return new Map();
  const current = store[config.mapKey];
  if (current instanceof Map) {
    return current;
  }
  const restored = new Map();
  if (Array.isArray(current)) {
    current.forEach(entry => {
      if (!entry) return;
      const [biomeId, items] = entry;
      restored.set(biomeId, new Set(items || []));
    });
  } else if (current && typeof current === 'object') {
    Object.entries(current).forEach(([biomeId, items]) => {
      restored.set(biomeId, new Set(items || []));
    });
  }
  store[config.mapKey] = restored;
  return restored;
}

function getDiscoverySet(type, biomeId) {
  const config = TYPE_CONFIG[type];
  if (!config) return new Set();
  const map = ensureDiscoveryMap(type);
  if (!map.has(biomeId)) {
    map.set(biomeId, new Set());
  }
  const set = map.get(biomeId);
  if (set instanceof Set) {
    return set;
  }
  const restored = new Set(Array.isArray(set) ? set : []);
  map.set(biomeId, restored);
  return restored;
}

function findMatchingEntry(type, biomeId, hints = {}) {
  const config = TYPE_CONFIG[type];
  if (!config) return null;
  const biomeData = biomeWildlifeData[biomeId];
  if (!biomeData) return null;
  const items = biomeData[config.collection] || [];
  if (!items.length) return null;
  const set = getDiscoverySet(type, biomeId);
  const candidates = items.filter(item => !set.has(makeEntryId(type, biomeId, item.name)));
  if (!candidates.length) return null;

  const queries = [];
  if (typeof hints.name === 'string') queries.push(hints.name);
  if (typeof hints.encounter === 'string') queries.push(hints.encounter);
  if (typeof hints.resource === 'string') queries.push(hints.resource);
  if (typeof hints.notes === 'string') queries.push(hints.notes);
  if (Array.isArray(hints.keywords)) {
    hints.keywords.forEach(keyword => {
      if (typeof keyword === 'string') {
        queries.push(keyword);
      }
    });
  }

  for (const query of queries) {
    const normalized = String(query || '')
      .trim()
      .toLowerCase();
    if (!normalized) continue;
    const match = candidates.find(item => {
      const name = item.name?.toLowerCase?.() || '';
      const notes = item.notes?.toLowerCase?.() || '';
      const diet = item.diet?.toLowerCase?.() || '';
      const uses = item.usefulParts?.toLowerCase?.() || '';
      const edible = item.edibleParts?.toLowerCase?.() || '';
      return (
        name.includes(normalized) ||
        notes.includes(normalized) ||
        diet.includes(normalized) ||
        uses.includes(normalized) ||
        edible.includes(normalized)
      );
    });
    if (match) {
      return match;
    }
  }

  const randomIndex = Math.floor(Math.random() * candidates.length);
  return candidates[randomIndex];
}

function recordDiscovery(type, biomeId, hints = {}) {
  if (!biomeId) return null;
  const entry = findMatchingEntry(type, biomeId, hints);
  if (!entry) return null;
  const set = getDiscoverySet(type, biomeId);
  const id = makeEntryId(type, biomeId, entry.name);
  if (set.has(id)) {
    return null;
  }
  set.add(id);
  return { ...entry, id, biomeId };
}

function buildCatalog(type) {
  const config = TYPE_CONFIG[type];
  if (!config) {
    return { sections: [], discovered: 0, total: 0 };
  }
  const sections = Object.entries(biomeWildlifeData)
    .map(([biomeId, data]) => {
      const items = data?.[config.collection] || [];
      if (!items.length) return null;
      const set = getDiscoverySet(type, biomeId);
      const entries = items.map(item => {
        const id = makeEntryId(type, biomeId, item.name);
        const discovered = set.has(id);
        return {
          id,
          biomeId,
          discovered,
          item
        };
      });
      const discoveredCount = entries.filter(entry => entry.discovered).length;
      return {
        biomeId,
        biomeName: getBiome(biomeId)?.name || biomeId,
        entries,
        discoveredCount,
        total: entries.length
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.biomeName.localeCompare(b.biomeName));

  const totals = sections.reduce(
    (acc, section) => {
      acc.discovered += section.discoveredCount;
      acc.total += section.total;
      return acc;
    },
    { discovered: 0, total: 0 }
  );

  return { sections, discovered: totals.discovered, total: totals.total };
}

export function recordAnimalDiscovery(biomeId, hints = {}) {
  return recordDiscovery('fauna', biomeId, hints);
}

export function recordPlantDiscovery(biomeId, hints = {}) {
  return recordDiscovery('flora', biomeId, hints);
}

export function getBestiaryCatalog() {
  return buildCatalog('fauna');
}

export function getHerbariumCatalog() {
  return buildCatalog('flora');
}

export function isAnimalDiscovered(biomeId, name) {
  const set = getDiscoverySet('fauna', biomeId);
  return set.has(makeEntryId('fauna', biomeId, name));
}

export function isPlantDiscovered(biomeId, name) {
  const set = getDiscoverySet('flora', biomeId);
  return set.has(makeEntryId('flora', biomeId, name));
}

export function getUnknownLabel(type) {
  return TYPE_CONFIG[type]?.unknownLabel || 'Unknown entry';
}
