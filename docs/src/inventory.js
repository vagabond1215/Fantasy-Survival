import store from './state.js';
import { getEquipmentDefinition } from './data/equipment.js';

function formatLabel(name = '') {
  return String(name)
    .split(/\s+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function createDefaultRecord(name) {
  const id = String(name);
  return {
    id,
    label: formatLabel(id),
    quantity: 0,
    demand: 0,
    supply: 0,
    expectedChange: 0,
    isEquipment: false,
    category: 'resource',
    tier: null,
    tierLabel: null,
    quality: null,
    qualityLabel: null,
    durability: null,
    stats: null,
    requiredTech: null
  };
}

function applyItemMetadata(record) {
  if (!record) return record;
  const equipment = getEquipmentDefinition(record.id);
  const metadata = { ...record };
  if (equipment) {
    metadata.label = equipment.label || metadata.label || formatLabel(metadata.id);
    metadata.isEquipment = true;
    metadata.category = equipment.category || 'equipment';
    metadata.tier = equipment.tier || null;
    metadata.tierLabel = equipment.tierLabel || null;
    metadata.quality = equipment.tier || null;
    metadata.qualityLabel = equipment.tierLabel || null;
    metadata.durability = equipment.durability ?? metadata.durability ?? null;
    metadata.stats = equipment.stats || metadata.stats || null;
    metadata.requiredTech = equipment.requiredTech || metadata.requiredTech || null;
  } else {
    metadata.label = metadata.label || formatLabel(metadata.id);
    metadata.isEquipment = false;
    metadata.category = 'resource';
    metadata.tier = null;
    metadata.tierLabel = null;
    metadata.quality = null;
    metadata.qualityLabel = null;
    metadata.durability = null;
    metadata.stats = null;
    metadata.requiredTech = null;
  }
  return metadata;
}

function upsert(record) {
  const current = store.getItem('inventory', record.id);
  if (current) {
    store.updateItem('inventory', { ...current, ...record });
  } else {
    store.addItem('inventory', record);
  }
}

function ensureRecord(name) {
  const existing = store.getItem('inventory', name);
  if (existing) {
    return applyItemMetadata({ ...existing });
  }
  return applyItemMetadata(createDefaultRecord(name));
}

function synchronizeFlow(record) {
  const supply = Number.isFinite(record.supply) ? record.supply : 0;
  const demand = Number.isFinite(record.demand) ? record.demand : 0;
  record.expectedChange = Math.round((supply - demand) * 100) / 100;
  record.supply = supply;
  record.demand = demand;
}

export function addItem(name, quantity = 0) {
  const record = ensureRecord(name);
  record.quantity = Math.max(0, (record.quantity || 0) + quantity);
  synchronizeFlow(record);
  upsert(record);
}

export function adjustDemand(name, amount) {
  const record = ensureRecord(name);
  record.demand = (record.demand || 0) + amount;
  synchronizeFlow(record);
  upsert(record);
}

export function getItem(name) {
  const record = store.getItem('inventory', name);
  if (!record) {
    return applyItemMetadata(createDefaultRecord(name));
  }
  return applyItemMetadata({ ...record });
}

export function setItemFlow(name, { supply = 0, demand = 0 } = {}) {
  const record = ensureRecord(name);
  record.supply = supply;
  record.demand = demand;
  synchronizeFlow(record);
  upsert(record);
}

export function listInventory() {
  return Array.from(store.inventory.values()).map(entry => applyItemMetadata({ ...entry }));
}
