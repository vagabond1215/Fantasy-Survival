import store from './state.js';

export function unlockTechnology(tech) {
  // tech: { id, name, requires: [] }
  store.addItem('technologies', tech);
}

export function hasTechnology(id) {
  return store.technologies.has(id);
}

export function allTechnologies() {
  return [...store.technologies.values()];
}
