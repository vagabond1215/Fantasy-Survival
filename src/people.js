// @ts-nocheck
import store from './state.js';

export function addPerson(person) {
  store.addItem('people', person);
  updateGlobals();
}

export function updatePerson(person) {
  store.updateItem('people', person);
  updateGlobals();
}

export function setPeople(people = []) {
  if (!(store.people instanceof Map)) {
    store.people = new Map();
  } else {
    store.people.clear();
  }
  people.forEach(person => {
    if (!person?.id) return;
    store.people.set(person.id, { ...person });
  });
  updateGlobals();
}

export function listPeople() {
  if (!(store.people instanceof Map)) {
    return [];
  }
  return [...store.people.values()].map(person => ({ ...person }));
}

function updateGlobals() {
  const people = [...store.people.values()];
  const total = people.length;
  const adults = people.filter(p => (p.age ?? 0) >= 16).length;
  const children = total - adults;
  const employed = people.filter(p => p.job).length;
  const unemployed = total - employed;
  const housed = people.filter(p => p.home).length;
  const homeless = total - housed;
  store.peopleStats = { total, adults, children, employed, unemployed, housed, homeless };
}

export function refreshStats() {
  updateGlobals();
}

export function stats() {
  return (
    store.peopleStats || {
      total: 0,
      adults: 0,
      children: 0,
      employed: 0,
      unemployed: 0,
      housed: 0,
      homeless: 0
    }
  );
}
