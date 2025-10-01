import store from './state.js';

export const ORDER_TYPES = [
  { id: 'hunting', label: 'Hunting', description: 'Track and hunt wild game for food.' },
  { id: 'gathering', label: 'Gathering', description: 'Collect forage, firewood, and loose stone.' },
  { id: 'crafting', label: 'Crafting', description: 'Work on tools, clothing, and other goods.' },
  { id: 'building', label: 'Building', description: 'Raise shelters and other village structures.' },
  { id: 'combat', label: 'Combat Patrol', description: 'Stand guard and respond to threats.' }
];

function ensureOrderState() {
  if (!Array.isArray(store.orders)) store.orders = [];
  if (typeof store.orderSeq !== 'number') store.orderSeq = 0;
}

function nextOrderId() {
  ensureOrderState();
  store.orderSeq += 1;
  return `ord-${store.orderSeq}`;
}

export function getOrders() {
  ensureOrderState();
  return store.orders.map(order => ({ ...order }));
}

export function getOrderById(id) {
  ensureOrderState();
  return store.orders.find(o => o.id === id) || null;
}

export function getActiveOrder() {
  ensureOrderState();
  return store.orders.find(o => o.status === 'active') || null;
}

export function addOrder({ type, workers = 1, hours = 4, notes = '' }) {
  ensureOrderState();
  const id = nextOrderId();
  const order = {
    id,
    type,
    workers: Math.max(1, Math.floor(workers)),
    durationHours: Math.max(1, Math.ceil(hours)),
    remainingHours: Math.max(1, Math.ceil(hours)),
    notes,
    status: 'pending'
  };
  store.orders.push(order);
  return { ...order };
}

export function updateOrder(id, updates = {}) {
  ensureOrderState();
  const order = store.orders.find(o => o.id === id);
  if (!order) return null;
  Object.assign(order, updates);
  if (order.remainingHours < 0) order.remainingHours = 0;
  if (order.durationHours < 1) order.durationHours = 1;
  if (order.workers < 1) order.workers = 1;
  return { ...order };
}

export function removeOrder(id) {
  ensureOrderState();
  const idx = store.orders.findIndex(o => o.id === id);
  if (idx >= 0) store.orders.splice(idx, 1);
}

export function clearCompletedOrders() {
  ensureOrderState();
  store.orders = store.orders.filter(o => o.status !== 'completed');
}

export function activateNextOrder() {
  ensureOrderState();
  const active = getActiveOrder();
  if (active) return { ...active };
  const next = store.orders.find(o => o.status === 'pending');
  if (!next) return null;
  next.status = 'active';
  return { ...next };
}

export function resetOrders() {
  store.orders = [];
  store.orderSeq = 0;
}

export function serializeOrders() {
  ensureOrderState();
  return store.orders.map(o => ({ ...o }));
}
