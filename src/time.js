import store from './state.js';

const seasons = ['Spring', 'Summer', 'Autumn', 'Winter'];
const HOURS_PER_DAY = 24;
const DAWN_HOUR = 6;

export function advanceDay() {
  store.time.day += 1;
  if (store.time.day % 90 === 0) {
    const index = seasons.indexOf(store.time.season);
    store.time.season = seasons[(index + 1) % seasons.length];
  }
}

export function advanceHours(hours = 1) {
  const increment = Math.max(0, Number.isFinite(hours) ? hours : 0);
  store.time.hour += increment;
  while (store.time.hour >= HOURS_PER_DAY) {
    store.time.hour -= HOURS_PER_DAY;
    advanceDay();
  }
}

export function info() {
  return { ...store.time };
}

// Provide a backwards-compatible alias for modules that import `timeInfo`.
// This is useful for legacy code that still expects the older export name.
export { info as timeInfo };

export function resetToDawn() {
  store.time.hour = DAWN_HOUR;
}

export function isMealTime() {
  return store.time.hour === 12;
}

export function isNightfall() {
  return store.time.hour >= 20;
}
