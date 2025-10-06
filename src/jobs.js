import store from './state.js';
import { stats as peopleStats } from './people.js';
import { saveGame } from './persistence.js';
import { syncJobAssignments } from './population.js';

const JOB_DEFINITIONS = [
  {
    id: 'gather',
    label: 'Gatherers',
    description: 'Collect forage, firewood, and loose materials from the surrounding area.',
    preferredSkills: ['foraging', 'gathering', 'herbalism', 'agriculture', 'woodcutting', 'mining']
  },
  {
    id: 'hunt',
    label: 'Hunters',
    description: 'Track game to keep the settlement supplied with meat and hides.',
    preferredSkills: ['hunting', 'tracking', 'fishing', 'swimming']
  },
  {
    id: 'craft',
    label: 'Crafters',
    description: 'Maintain tools, weave cordage, and assemble needed goods.',
    preferredSkills: ['crafting', 'carpentry', 'smithing', 'weaving', 'pottery', 'leatherworking', 'cooking', 'smelting']
  },
  {
    id: 'build',
    label: 'Builders',
    description: 'Raise new structures and shore up existing shelters.',
    preferredSkills: ['construction', 'carpentry', 'masonry', 'smithing']
  },
  {
    id: 'guard',
    label: 'Guards',
    description: 'Keep watch for danger and respond to hostile threats.',
    preferredSkills: ['combat', 'hunting', 'tracking']
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

function ensureJobSettings() {
  if (!store.jobSettings || typeof store.jobSettings !== 'object') {
    store.jobSettings = {};
  }
  JOB_DEFINITIONS.forEach(def => {
    const existing = store.jobSettings[def.id];
    const workday = Number.isFinite(existing?.workdayHours) ? existing.workdayHours : 10;
    store.jobSettings[def.id] = { workdayHours: Math.max(1, Math.round(workday)) };
  });
}

function ensureJobs() {
  normalizeLegacyJobs();
  ensureJobSettings();
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
  const rosterSummary = syncJobAssignments(store.jobs, JOB_DEFINITIONS) || {};
  const adults = peopleStats().adults || 0;
  const assignments = JOB_DEFINITIONS.map(def => ({
    ...def,
    assigned: store.jobs[def.id] || 0,
    workdayHours: getJobWorkday(def.id),
    roster: rosterSummary[def.id] || []
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
  syncJobAssignments(store.jobs, JOB_DEFINITIONS);
  saveGame();
}

export function getJobWorkday(name) {
  ensureJobSettings();
  const entry = store.jobSettings?.[name];
  const hours = Number.isFinite(entry?.workdayHours) ? entry.workdayHours : 10;
  return Math.max(1, Math.round(hours));
}

export function setJobWorkday(name, hours) {
  ensureJobSettings();
  if (!JOB_DEFINITIONS.find(def => def.id === name)) return;
  const clamped = Math.max(4, Math.min(16, Math.round(Number.isFinite(hours) ? hours : 10)));
  store.jobSettings[name] = { workdayHours: clamped };
  saveGame();
}

export function getJobSettings() {
  ensureJobSettings();
  return { ...store.jobSettings };
}

export function totalAssigned() {
  const overview = getJobOverview();
  return overview.assigned;
}
