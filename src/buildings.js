import store from './state.js';
import { hasTechnology } from './technology.js';
import { buildingCatalog } from './buildingCatalog.js';
import { getItem } from './inventory.js';
import { allLocations } from './location.js';
import { timeInfo } from './time.js';

const buildingTypes = new Map();

function ensureSets() {
  if (!(store.unlockedBuildings instanceof Set)) {
    const data = Array.isArray(store.unlockedBuildings) ? store.unlockedBuildings : [];
    store.unlockedBuildings = new Set(data);
  }
  if (!(store.research instanceof Set)) {
    const data = Array.isArray(store.research) ? store.research : [];
    store.research = new Set(data);
  }
  if (typeof store.buildingSeq !== 'number') store.buildingSeq = 0;
}

function mergeResourceMaps(target, addition = {}) {
  Object.entries(addition).forEach(([name, amount]) => {
    if (!Number.isFinite(amount) || amount === 0) return;
    target[name] = (target[name] || 0) + amount;
  });
  return target;
}

function cloneResourceMap(map = {}) {
  return Object.fromEntries(Object.entries(map).map(([k, v]) => [k, v]));
}

function computeStats(definition = {}) {
  const stats = {
    totalLaborHours: 0,
    minBuilders: Math.max(1, definition.requirements?.minBuilders || 1),
    totalResources: {},
    components: [],
    addons: []
  };

  (definition.components || []).forEach(component => {
    const labor = Math.max(0, component.laborHours || 0);
    const minBuilders = Math.max(1, component.minBuilders || 1);
    stats.totalLaborHours += labor;
    stats.minBuilders = Math.max(stats.minBuilders, minBuilders);
    const resources = cloneResourceMap(component.resources || {});
    mergeResourceMaps(stats.totalResources, resources);
    stats.components.push({ ...component, laborHours: labor, minBuilders, resources });
  });

  (definition.addons || []).forEach(addon => {
    const labor = Math.max(0, addon.laborHours || 0);
    const minBuilders = Math.max(1, addon.minBuilders || 1);
    const resources = cloneResourceMap(addon.resources || {});
    stats.addons.push({
      ...addon,
      laborHours: labor,
      minBuilders,
      resources,
      totals: {
        laborHours: labor,
        resources: cloneResourceMap(resources)
      }
    });
  });

  if (stats.totalLaborHours <= 0) {
    stats.totalLaborHours = stats.minBuilders;
  }

  return stats;
}

function registerBuildingType(definition) {
  if (!definition?.id) return;
  if (buildingTypes.has(definition.id)) return;
  const stats = computeStats(definition);
  buildingTypes.set(definition.id, { ...definition, stats });
}

function meetsResourceRequirements(resources = {}) {
  return Object.entries(resources).every(([name, amount]) => {
    if (!amount || amount <= 0) return true;
    const current = getItem(name).quantity || 0;
    return current >= amount;
  });
}

function featureMatches(features = [], tag = '') {
  if (!tag) return true;
  const lowerTag = tag.toLowerCase();
  return features.some(feature => feature.toLowerCase().includes(lowerTag));
}

function locationSupports(type) {
  const tags = type.requirements?.locationTags || [];
  if (!tags.length) return true;
  const normalizedTags = tags.map(tag => String(tag || '').toLowerCase());
  if (normalizedTags.some(tag => tag === 'open' || tag === 'any')) {
    return true;
  }
  const locations = allLocations();
  if (!locations.length) return false;
  const features = (locations[0]?.features || []).map(f => f.toLowerCase());
  return normalizedTags.some(tag => featureMatches(features, tag));
}

function hasResearch(id) {
  ensureSets();
  return store.research.has(id);
}

function meetsUnlockConditions(unlock = {}) {
  if (!unlock) return false;
  if (unlock.always) return true;
  if (unlock.custom && typeof unlock.custom === 'function') {
    try {
      if (!unlock.custom(store)) return false;
    } catch (err) {
      console.warn('Building unlock custom check failed', err);
      return false;
    }
  }
  if (unlock.technologies) {
    const techs = Array.isArray(unlock.technologies) ? unlock.technologies : [unlock.technologies];
    if (!techs.every(hasTechnology)) return false;
  }
  if (unlock.resources) {
    if (!meetsResourceRequirements(unlock.resources)) return false;
  }
  if (unlock.buildings) {
    const requirements = Array.isArray(unlock.buildings) ? unlock.buildings : [unlock.buildings];
    if (!requirements.every(req => countBuildings(req.id, { statuses: ['completed'] }) >= (req.count || 1))) {
      return false;
    }
  }
  if (unlock.research) {
    const ids = Array.isArray(unlock.research) ? unlock.research : [unlock.research];
    if (!ids.every(hasResearch)) return false;
  }
  return true;
}

function isUnlocked(type) {
  ensureSets();
  if (store.unlockedBuildings.has(type.id)) return true;
  if (meetsUnlockConditions(type.unlock)) {
    store.unlockedBuildings.add(type.id);
    return true;
  }
  return false;
}

function getMaxCount(type) {
  if (Number.isFinite(type.maxCount)) return type.maxCount;
  return type.allowMultiple ? Infinity : 1;
}

function ensureBuildingMap() {
  if (!(store.buildings instanceof Map)) {
    store.buildings = new Map(store.buildings || []);
  }
}

export function countBuildings(typeId, { statuses = null } = {}) {
  ensureBuildingMap();
  const allowed = statuses ? new Set(statuses) : null;
  let count = 0;
  store.buildings.forEach(entry => {
    if (entry.typeId !== typeId) return;
    if (allowed && !allowed.has(entry.status)) return;
    count += 1;
  });
  return count;
}

function computeResourceStatus(resources = {}) {
  const missing = [];
  const totals = {};
  Object.entries(resources).forEach(([name, amount]) => {
    if (!amount || amount <= 0) return;
    const current = getItem(name).quantity || 0;
    totals[name] = { required: amount, available: current, deficit: Math.max(0, amount - current) };
    if (current < amount) {
      missing.push({ name, required: amount, available: current });
    }
  });
  return { missing, totals };
}

export function evaluateBuilding(typeId) {
  const type = buildingTypes.get(typeId);
  if (!type) return null;
  const unlocked = isUnlocked(type);
  const maxCount = getMaxCount(type);
  const existing = countBuildings(typeId);
  const canBuildMore = existing < maxCount;
  const locationOk = locationSupports(type);
  const resourceStatus = computeResourceStatus(type.stats.totalResources);
  return {
    type,
    unlocked,
    canBuildMore,
    locationOk,
    hasResources: resourceStatus.missing.length === 0,
    resourceStatus,
    existing,
    maxCount
  };
}

export function getBuildableTypes() {
  return [...buildingTypes.values()].filter(type => {
    const info = evaluateBuilding(type.id);
    if (!info) return false;
    return info.unlocked && info.canBuildMore && info.locationOk;
  });
}

export function getAllBuildingTypes() {
  return [...buildingTypes.values()];
}

function nextBuildingId() {
  ensureSets();
  store.buildingSeq += 1;
  return `bld-${store.buildingSeq}`;
}

export function beginConstruction(typeId, { workers, locationId } = {}) {
  const type = buildingTypes.get(typeId);
  if (!type) throw new Error(`Unknown building type ${typeId}`);
  const evaluation = evaluateBuilding(typeId);
  if (!evaluation?.unlocked) throw new Error(`Building ${type.name} is not unlocked`);
  if (!evaluation.canBuildMore) throw new Error(`No additional ${type.name} can be constructed right now`);
  if (!evaluation.locationOk) throw new Error(`${type.name} cannot be built at this location`);
  if (!evaluation.hasResources) throw new Error(`Insufficient resources to begin ${type.name}`);

  ensureBuildingMap();
  const assignedWorkers = Math.max(type.stats.minBuilders, workers || type.stats.minBuilders || 1);
  const totalLabor = Math.max(1, type.stats.totalLaborHours);
  const totalResources = cloneResourceMap(type.stats.totalResources);

  const projectId = nextBuildingId();
  const project = {
    id: projectId,
    typeId,
    status: 'under-construction',
    locationId: locationId || (allLocations()[0]?.id || null),
    progressHours: 0,
    totalLaborHours: totalLabor,
    assignedWorkers,
    requiredResources: totalResources,
    consumedResources: {},
    addons: []
  };
  store.addItem('buildings', project);

  const hours = Math.max(1, Math.ceil(totalLabor / assignedWorkers));
  const totalWorkerHours = assignedWorkers * hours;
  const perWorkerHourResources = {};
  Object.entries(totalResources).forEach(([name, amount]) => {
    if (!amount || amount <= 0) return;
    perWorkerHourResources[name] = amount / totalWorkerHours;
  });
  const progressPerWorkerHour = totalLabor / totalWorkerHours;
  const totalResourceUnits = Object.values(totalResources).reduce((sum, amount) => sum + amount, 0);
  const baseComplexity = Math.min(
    100,
    28 + Math.log10(totalLabor + 1) * 18 + Math.log10(totalResourceUnits + 1) * 6
  );
  return {
    project: { ...project },
    order: {
      type: 'building',
      workers: assignedWorkers,
      hours,
      notes: `${type.name} construction`,
      metadata: {
        buildingTypeId: typeId,
        projectId,
        typeName: type.name,
        totalLaborHours: totalLabor,
        perWorkerHourResources,
        progressPerWorkerHour,
        baseComplexity,
        taskComplexity: baseComplexity,
        effortHours: totalLabor,
        proficiencyId: 'construction',
        taskId: `construction:${typeId}`
      }
    }
  };
}

export function recordBuildingProgress(projectId, workerHours = 0) {
  if (!workerHours) return;
  ensureBuildingMap();
  const project = store.getItem('buildings', projectId);
  if (!project) return;
  const progress = Math.min(project.totalLaborHours, (project.progressHours || 0) + workerHours);
  store.updateItem('buildings', { id: projectId, progressHours: progress });
}

export function recordResourceConsumption(projectId, resources = {}) {
  const keys = Object.keys(resources || {});
  if (!keys.length) return;
  ensureBuildingMap();
  const project = store.getItem('buildings', projectId);
  if (!project) return;
  const consumed = { ...(project.consumedResources || {}) };
  keys.forEach(name => {
    const amount = resources[name];
    if (!Number.isFinite(amount) || amount <= 0) return;
    consumed[name] = (consumed[name] || 0) + amount;
  });
  store.updateItem('buildings', { id: projectId, consumedResources: consumed });
}

export function markBuildingComplete(projectId) {
  ensureBuildingMap();
  const project = store.getItem('buildings', projectId);
  if (!project) return null;
  const completedAt = timeInfo ? timeInfo() : null;
  const update = {
    id: projectId,
    status: 'completed',
    progressHours: project.totalLaborHours,
    completedAt
  };
  store.updateItem('buildings', update);
  refreshBuildingUnlocks();
  return { ...project, ...update };
}

export function getBuildingById(id) {
  ensureBuildingMap();
  return store.getItem('buildings', id);
}

export function getBuildings({ statuses = null } = {}) {
  ensureBuildingMap();
  const allowed = statuses ? new Set(statuses) : null;
  return [...store.buildings.values()].filter(entry => {
    if (!allowed) return true;
    return allowed.has(entry.status);
  });
}

export function refreshBuildingUnlocks() {
  ensureSets();
  buildingTypes.forEach(type => {
    if (meetsUnlockConditions(type.unlock)) {
      store.unlockedBuildings.add(type.id);
    }
  });
}

export function getBuildingType(id) {
  return buildingTypes.get(id) || null;
}

export function initializeBuildingCatalog() {
  if (buildingTypes.size > 0) return;
  buildingCatalog.forEach(registerBuildingType);
  refreshBuildingUnlocks();
}

initializeBuildingCatalog();

export { buildingTypes };
