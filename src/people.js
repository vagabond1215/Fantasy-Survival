import store from './state.js';

export function addPerson(person) {
  store.addItem('people', person);
  updateGlobals();
}

export function updatePerson(person) {
  store.updateItem('people', person);
  updateGlobals();
}

function updateGlobals() {
  const people = [...store.people.values()];
  const total = people.length;
  const employed = people.filter(p => p.job).length;
  const unemployed = total - employed;
  const housed = people.filter(p => p.home).length;
  const homeless = total - housed;
  store.peopleStats = { total, employed, unemployed, housed, homeless };
}

export function stats() {
  return store.peopleStats || { total: 0, employed: 0, unemployed: 0, housed: 0, homeless: 0 };
}
