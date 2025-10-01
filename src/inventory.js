import store from './state.js';

function upsert(record) {
  if (store.getItem('inventory', record.id)) {
    store.updateItem('inventory', record);
  } else {
    store.addItem('inventory', record);
  }
}

export function addItem(name, quantity = 0) {
  const record = store.getItem('inventory', name) || { id: name, quantity: 0, demand: 0, expectedChange: 0 };
  record.quantity += quantity;
  upsert(record);
}

export function adjustDemand(name, amount) {
  const record = store.getItem('inventory', name) || { id: name, quantity: 0, demand: 0 };
  record.demand += amount;
  upsert(record);
}

export function getItem(name) {
  const record = store.getItem('inventory', name);
  if (!record) return { quantity: 0, demand: 0, expectedChange: 0 };
  return { ...record };
}

export function setExpectedChange(name, change = 0) {
  const record = store.getItem('inventory', name) || { id: name, quantity: 0, demand: 0, expectedChange: 0 };
  record.expectedChange = change;
  upsert(record);
}
