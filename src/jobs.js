import store from './state.js';
import { stats as peopleStats } from './people.js';
import { saveGame } from './persistence.js';

function ensureJobs() {
  if (!store.jobs) store.jobs = {};
}

export function getJobs() {
  ensureJobs();
  const adults = peopleStats().adults || 0;
  const assigned = Object.values(store.jobs).reduce((a, b) => a + b, 0);
  const laborer = Math.max(0, adults - assigned);
  return { ...store.jobs, laborer };
}

export function setJob(name, count) {
  ensureJobs();
  if (name === 'laborer') return;
  const adults = peopleStats().adults || 0;
  const others = Object.entries(store.jobs)
    .filter(([k]) => k !== name)
    .reduce((sum, [, v]) => sum + v, 0);
  const max = Math.max(0, adults - others);
  store.jobs[name] = Math.max(0, Math.min(count, max));
  saveGame();
}

export function totalAssigned() {
  ensureJobs();
  return Object.values(store.jobs).reduce((a, b) => a + b, 0);
}
