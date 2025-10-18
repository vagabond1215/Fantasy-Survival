import store from './state.js';
import { getJobs, getJobWorkday } from './jobs.js';
import { addItem, getItem } from './inventory.js';
import { getOrderHourlyEffect } from './resources.js';
import {
  getBuildings,
  recordBuildingProgress,
  recordResourceConsumption,
  markBuildingComplete
} from './buildings.js';

const JOB_TO_ORDER_TYPE = {
  gather: 'gathering',
  hunt: 'hunting',
  craft: 'crafting'
};

function ensureDailyBucket(jobId, dayStamp) {
  if (!store.jobDaily || typeof store.jobDaily !== 'object') {
    store.jobDaily = {};
  }
  const bucket = store.jobDaily[jobId];
  if (!bucket || bucket.dayStamp !== dayStamp) {
    store.jobDaily[jobId] = { dayStamp, workedHours: 0, idleHours: 0 };
  }
  return store.jobDaily[jobId];
}

function applyResourceDelta(perHour, hours) {
  Object.entries(perHour || {}).forEach(([resource, rate]) => {
    if (!rate) return;
    const amount = rate * hours;
    if (!amount) return;
    addItem(resource, amount);
  });
}

function applyOrderProductivity(jobId, workers, hours) {
  const type = JOB_TO_ORDER_TYPE[jobId];
  if (!type || workers <= 0 || hours <= 0) return 0;
  const perHour = getOrderHourlyEffect({ type, workers });
  if (!perHour) return 0;
  let effectiveHours = hours;
  if (type === 'crafting') {
    const consumption = Math.abs(perHour.firewood || 0);
    if (consumption > 0) {
      const available = Math.max(0, getItem('firewood')?.quantity || 0);
      const maxHours = available > 0 ? available / consumption : 0;
      effectiveHours = Math.min(hours, maxHours);
    }
  }
  if (effectiveHours <= 0) return 0;
  applyResourceDelta(perHour, effectiveHours);
  return effectiveHours;
}

function limitWorkerHoursByResources(project, requestedWorkerHours, progressPerWorkerHour) {
  if (!project || requestedWorkerHours <= 0) return 0;
  const totalLabor = Math.max(1, project.totalLaborHours || 1);
  const requiredResources = project.requiredResources || {};
  const consumed = project.consumedResources || {};
  let cap = requestedWorkerHours;
  Object.entries(requiredResources).forEach(([name, totalAmount]) => {
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) return;
    const perProgress = totalAmount / totalLabor;
    if (perProgress <= 0) return;
    const perWorkerHour = perProgress * progressPerWorkerHour;
    if (perWorkerHour <= 0) return;
    const alreadyUsed = consumed[name] || 0;
    const remainingNeed = Math.max(0, totalAmount - alreadyUsed);
    if (remainingNeed <= 0) {
      cap = Math.min(cap, 0);
      return;
    }
    const availableInventory = Math.max(0, getItem(name)?.quantity || 0);
    const usable = Math.min(remainingNeed, availableInventory);
    const resourceCap = usable / perWorkerHour;
    cap = Math.min(cap, resourceCap);
  });
  return Math.max(0, cap);
}

function consumeBuildingResources(project, progressGain) {
  if (progressGain <= 0) return;
  const totalLabor = Math.max(1, project.totalLaborHours || 1);
  const requiredResources = project.requiredResources || {};
  if (!Object.keys(requiredResources).length) return;
  const perHourConsumption = {};
  Object.entries(requiredResources).forEach(([name, amount]) => {
    if (!Number.isFinite(amount) || amount <= 0) return;
    const perProgress = amount / totalLabor;
    if (perProgress <= 0) return;
    const consumption = perProgress * progressGain;
    if (!consumption) return;
    perHourConsumption[name] = consumption;
    addItem(name, -consumption);
  });
  if (Object.keys(perHourConsumption).length) {
    recordResourceConsumption(project.id, perHourConsumption);
  }
}

function advanceBuildingProjects(workers, hours) {
  if (workers <= 0 || hours <= 0) return 0;
  const projects = getBuildings({ statuses: ['under-construction'] });
  if (!projects.length) return 0;
  let remainingWorkerHours = workers * hours;
  let utilizedWorkerHours = 0;
  projects.some(project => {
    if (remainingWorkerHours <= 0) return true;
    const assignedWorkers = Math.max(1, project.assignedWorkers || 1);
    const totalLabor = Math.max(1, project.totalLaborHours || 1);
    const projectHours = Math.ceil(totalLabor / assignedWorkers);
    const totalWorkerHours = Math.max(assignedWorkers * projectHours, totalLabor);
    const progressPerWorkerHour = totalLabor / totalWorkerHours;
    const remainingProgress = Math.max(0, totalLabor - (project.progressHours || 0));
    if (remainingProgress <= 0) return false;
    const maxWorkerHoursByProgress = remainingProgress / progressPerWorkerHour;
    if (maxWorkerHoursByProgress <= 0) return false;
    const candidateWorkerHours = Math.min(remainingWorkerHours, maxWorkerHoursByProgress);
    if (candidateWorkerHours <= 0) return false;
    const cappedWorkerHours = limitWorkerHoursByResources(project, candidateWorkerHours, progressPerWorkerHour);
    if (cappedWorkerHours <= 0) return false;
    const progressGain = cappedWorkerHours * progressPerWorkerHour;
    if (progressGain <= 0) return false;
    consumeBuildingResources(project, progressGain);
    recordBuildingProgress(project.id, progressGain);
    remainingWorkerHours -= cappedWorkerHours;
    utilizedWorkerHours += cappedWorkerHours;
    const totalProgress = Math.min(totalLabor, (project.progressHours || 0) + progressGain);
    if (totalProgress >= totalLabor) {
      markBuildingComplete(project.id);
    }
    return false;
  });
  return utilizedWorkerHours;
}

export function applyJobProductivity(hours, { dayStamp } = {}) {
  if (!Number.isFinite(hours) || hours <= 0) return;
  const jobs = getJobs();
  Object.entries(jobs).forEach(([jobId, assigned]) => {
    if (jobId === 'laborer') return;
    const workers = Math.max(0, Number(assigned) || 0);
    if (workers <= 0) return;
    const daily = ensureDailyBucket(jobId, dayStamp);
    const workday = getJobWorkday(jobId);
    const remaining = Math.max(0, workday - daily.workedHours);
    if (remaining <= 0) return;
    const potentialHours = Math.min(hours, remaining);
    if (potentialHours <= 0) return;
    let utilized = 0;
    if (jobId === 'build') {
      utilized = advanceBuildingProjects(workers, potentialHours);
      if (utilized > 0) {
        utilized /= Math.max(1, workers);
      }
    } else {
      utilized = applyOrderProductivity(jobId, workers, potentialHours);
    }
    if (utilized > 0) {
      daily.workedHours += utilized;
      if (utilized < potentialHours) {
        daily.idleHours += potentialHours - utilized;
      }
    } else {
      daily.idleHours += potentialHours;
    }
  });
}

export function resetDailyJobProgress(dayStamp) {
  if (!store.jobDaily || typeof store.jobDaily !== 'object') {
    store.jobDaily = {};
    return;
  }
  Object.entries(store.jobDaily).forEach(([jobId, entry]) => {
    if (!entry || entry.dayStamp === dayStamp) return;
    store.jobDaily[jobId] = { dayStamp, workedHours: 0, idleHours: 0 };
  });
}

export default { applyJobProductivity, resetDailyJobProgress };
