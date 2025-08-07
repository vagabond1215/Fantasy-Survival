import store from './state.js';

const seasons = ['Spring', 'Summer', 'Autumn', 'Winter'];

export function advanceDay() {
  store.time.day += 1;
  if (store.time.day % 90 === 0) {
    const index = seasons.indexOf(store.time.season);
    store.time.season = seasons[(index + 1) % seasons.length];
  }
}

export function info() {
  return { ...store.time };
}
