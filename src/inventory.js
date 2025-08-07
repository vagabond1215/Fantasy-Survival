import store from './state.js';

export function addItem(name, quantity = 0) {
  const record = store.inventory.get(name) || { quantity: 0, demand: 0 };
  record.quantity += quantity;
  store.inventory.set(name, record);
}

export function adjustDemand(name, amount) {
  const record = store.inventory.get(name) || { quantity: 0, demand: 0 };
  record.demand += amount;
  store.inventory.set(name, record);
}

export function getItem(name) {
  return store.inventory.get(name) || { quantity: 0, demand: 0 };
}
