import store from './state.js';
import { stats as peopleStats } from './people.js';
import { saveGame } from './persistence.js';

const JOB_DEFINITIONS = [
  {
    id: 'gather',
    label: 'Gatherers',
    description: 'Collect forage, firewood, and loose materials from the surrounding area.'
  },
  {
    id: 'hunt',
    label: 'Hunters',
    description: 'Track game to keep the settlement supplied with meat and hides.'
  },
  {
    id: 'craft',
    label: 'Crafters',
    description: 'Maintain tools, weave cordage, and assemble needed goods.'
  },
  {
    id: 'build',
    label: 'Builders',
    description: 'Raise new structures and shore up existing shelters.'
  },
  {
    id: 'guard',
    label: 'Guards',
    description: 'Keep watch for danger and respond to hostile threats.'
  }
];

function normalizeLegacyJobs() {
  if (!store.jobs || typeof store.jobs !== 'object') {
    store.jobs = {};
  }
  if (Object.prototype.hasOwnProperty.call(store.jobs, 'scavenge')) {
    const carryOver = Math.max(0, Number(store.jobs.scavenge) || 0);
    store.jobs.gather = Math.max(0, (store.jobs.gather || 0) + carryOver);
    delete store.jobs.scavenge;
  }
}

function ensureJobs() {
  normalizeLegacyJobs();
  JOB_DEFINITIONS.forEach(def => {
    const current = Number(store.jobs[def.id]);
    store.jobs[def.id] = Number.isFinite(current) && current > 0 ? Math.trunc(current) : 0;
  });
}

export function listJobDefinitions() {
  return JOB_DEFINITIONS.map(def => ({ ...def }));
}

export function getJobOverview() {
  ensureJobs();
  const adults = peopleStats().adults || 0;
  const assignments = JOB_DEFINITIONS.map(def => ({
    ...def,
    assigned: store.jobs[def.id] || 0
  }));
  const assignedTotal = assignments.reduce((sum, job) => sum + job.assigned, 0);
  const laborer = Math.max(0, adults - assignedTotal);
  return { assignments, adults, assigned: assignedTotal, laborer };
}

export function getJobs() {
  const overview = getJobOverview();
  const jobs = {};
  overview.assignments.forEach(job => {
    jobs[job.id] = job.assigned;
  });
  jobs.laborer = overview.laborer;
  return jobs;
}

export function setJob(name, count) {
  ensureJobs();
  if (name === 'laborer') return;
  const adults = peopleStats().adults || 0;
  const others = Object.entries(store.jobs)
    .filter(([k]) => k !== name)
    .reduce((sum, [, v]) => sum + v, 0);
  const max = Math.max(0, adults - others);
  const desired = Math.max(0, Math.trunc(Number.isFinite(count) ? count : 0));
  store.jobs[name] = Math.max(0, Math.min(desired, max));
  saveGame();
}

export function totalAssigned() {
  const overview = getJobOverview();
  return overview.assigned;
}
