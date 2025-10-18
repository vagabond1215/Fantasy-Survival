import store from './state.js';
import { saveGame } from './persistence.js';

function ensureTargets() {
  if (!(store.craftTargets instanceof Map)) {
    if (Array.isArray(store.craftTargets)) {
      store.craftTargets = new Map(store.craftTargets);
    } else {
      store.craftTargets = new Map();
    }
  }
}

function normalizeId(value) {
  return String(value || '').trim().toLowerCase();
}

function safeQuantity(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  return Math.max(0, Math.trunc(numeric));
}

function sumCollection(source, targetId) {
  if (!source || !targetId) return 0;
  const normalizedTarget = normalizeId(targetId);
  if (!normalizedTarget) return 0;
  if (typeof source === 'string') {
    return normalizeId(source) === normalizedTarget ? 1 : 0;
  }
  if (Array.isArray(source)) {
    return source.reduce((total, entry) => total + sumCollection(entry, normalizedTarget), 0);
  }
  if (source instanceof Map) {
    let total = 0;
    source.forEach((value, key) => {
      if (normalizeId(key) === normalizedTarget) {
        total += safeQuantity(value) || 0;
      } else {
        total += sumCollection(value, normalizedTarget);
      }
    });
    return total;
  }
  if (typeof source === 'object') {
    const candidate = source.id ?? source.name ?? source.item ?? source.type ?? source.slug;
    if (candidate && normalizeId(candidate) === normalizedTarget) {
      const qty =
        source.quantity ??
        source.qty ??
        source.count ??
        source.amount ??
        source.number ??
        1;
      const numeric = safeQuantity(qty);
      return numeric > 0 ? numeric : 1;
    }
    return Object.keys(source).reduce((total, key) => {
      const value = source[key];
      if (normalizeId(key) === normalizedTarget && typeof value !== 'object') {
        return total + safeQuantity(value);
      }
      return total + sumCollection(value, normalizedTarget);
    }, 0);
  }
  return 0;
}

export function getCraftTarget(itemId) {
  ensureTargets();
  if (!itemId) return 0;
  const key = String(itemId);
  return store.craftTargets.get(key) || 0;
}

export function setCraftTarget(itemId, quantity) {
  if (!itemId) return;
  ensureTargets();
  const key = String(itemId);
  const desired = safeQuantity(quantity);
  if (!desired) {
    store.craftTargets.delete(key);
  } else {
    store.craftTargets.set(key, desired);
  }
  saveGame();
}

export function listCraftTargets() {
  ensureTargets();
  return Array.from(store.craftTargets.entries()).map(([id, target]) => ({ id, target }));
}

export function calculateReservedQuantity(itemId) {
  if (!itemId) return 0;
  const normalized = normalizeId(itemId);
  if (!normalized) return 0;
  let total = 0;
  store.people.forEach(person => {
    total += sumCollection(person?.equipment, normalized);
    total += sumCollection(person?.equipped, normalized);
    total += sumCollection(person?.heldItems, normalized);
    total += sumCollection(person?.held, normalized);
    total += sumCollection(person?.holding, normalized);
  });
  return total;
}

export function clearCraftTarget(itemId) {
  if (!itemId) return;
  ensureTargets();
  store.craftTargets.delete(String(itemId));
  saveGame();
}

export function resetCraftTargets() {
  ensureTargets();
  store.craftTargets.clear();
  saveGame();
}

