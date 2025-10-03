import store from './state.js';

function upsert(record) {
  const current = store.getItem('inventory', record.id);
  if (current) {
    store.updateItem('inventory', { ...current, ...record });
  } else {
    store.addItem('inventory', record);
  }
}

function ensureRecord(name) {
  return (
    store.getItem('inventory', name) || {
      id: name,
      quantity: 0,
      demand: 0,
      supply: 0,
      expectedChange: 0
    }
  );
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
    return { id: name, quantity: 0, demand: 0, supply: 0, expectedChange: 0 };
  }
  return { ...record };
}

export function setItemFlow(name, { supply = 0, demand = 0 } = {}) {
  const record = ensureRecord(name);
  record.supply = supply;
  record.demand = demand;
  synchronizeFlow(record);
  upsert(record);
}

export function listInventory() {
  return Array.from(store.inventory.values()).map(entry => ({ ...entry }));
}
