import store from './state.js';
import { stats as peopleStats } from './people.js';

function ensureJobs() {
  if (!store.jobs) store.jobs = { laborer: 0 };
}

export function getJobs() {
  ensureJobs();
  return { ...store.jobs };
}

export function setJob(name, count) {
  ensureJobs();
  const adults = peopleStats().total;
  const others = Object.entries(store.jobs)
    .filter(([k]) => k !== name)
    .reduce((sum, [, v]) => sum + v, 0);
  const max = Math.max(0, adults - others);
  store.jobs[name] = Math.max(0, Math.min(count, max));
}

export function totalAssigned() {
  ensureJobs();
  return Object.values(store.jobs).reduce((a, b) => a + b, 0);
}
