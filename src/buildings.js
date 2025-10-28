// @ts-nocheck
import store from './state.js';
import { hasTechnology, unlockTechnology, getTechnology } from './technology.js';
import { buildingCatalog } from './buildingCatalog.js';
import { getItem } from './inventory.js';
import { allLocations, getLocationSiteCapacities } from './location.js';
import { isOpenTerrainType } from './biomes.js';
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

function normalizePositive(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return 0;
  return num;
}

function normalizeSiteDefinition(site = {}) {
  if (!site) return null;
  const categories = [];
  if (Array.isArray(site.categories)) {
    site.categories.forEach(category => {
      if (!category && category !== 0) return;
      const normalized = String(category).trim().toLowerCase();
      if (normalized) categories.push(normalized);
    });
  }
  if (site.category) {
    const normalized = String(site.category).trim().toLowerCase();
    if (normalized) categories.push(normalized);
  }
  const uniqueCategories = [...new Set(categories)];
  if (!uniqueCategories.length) {
    return null;
  }

  const dimensions = site.dimensions || {};
  const width = normalizePositive(dimensions.width);
  const depth = normalizePositive(dimensions.depth);

  const access = site.accessClearance || {};
  const fallbackSide = normalizePositive(access.side);
  const accessClearance = {
    front: normalizePositive(access.front),
    back: normalizePositive(access.back),
    left: normalizePositive(access.left) || fallbackSide,
    right: normalizePositive(access.right) || fallbackSide
  };

  let surfaceArea = normalizePositive(site.surfaceArea);
  if (!surfaceArea) {
    const totalWidth = width + accessClearance.left + accessClearance.right;
    const totalDepth = depth + accessClearance.front + accessClearance.back;
    if (totalWidth > 0 && totalDepth > 0) {
      surfaceArea = totalWidth * totalDepth;
    }
  }

  return {
    categories: uniqueCategories,
    primaryCategory: uniqueCategories[0],
    surfaceArea,
    dimensions: { width, depth },
    accessClearance,
    raw: { ...site }
  };
}

function getPrimaryLocation() {
  const locations = allLocations();
  return locations[0] || null;
}

function calculateSiteUsage(locationId, category) {
  if (!locationId || !category) return 0;
  ensureBuildingMap();
  const normalized = String(category).toLowerCase();
  let usage = 0;
  store.buildings.forEach(entry => {
    if (entry.locationId !== locationId) return;
    const type = buildingTypes.get(entry.typeId);
    const site = type?.stats?.site;
    if (!site || !site.surfaceArea) return;
    const projectCategory = String(entry.siteCategory || site.primaryCategory || '').toLowerCase();
    if (projectCategory !== normalized) return;
    usage += site.surfaceArea || 0;
  });
  return usage;
}

function computeSiteStatus(type, location) {
  const site = type?.stats?.site;
  if (!site || !site.surfaceArea || !site.categories?.length) {
    return { siteOk: true, status: null };
  }

  if (!location) {
    const categories = site.categories.map(category => ({
      category,
      capacity: 0,
      usage: 0,
      remaining: 0
    }));
    return { siteOk: false, status: { categories, selected: categories[0] || null } };
  }

  const capacities = getLocationSiteCapacities(location.id);
  const categories = site.categories.map(category => {
    const capacity = capacities?.[category] ?? 0;
    const usage = calculateSiteUsage(location.id, category);
    const remaining = capacity - usage;
    return {
      category,
      capacity,
      usage,
      remaining
    };
  });

  const requirement = site.surfaceArea || 0;
  let selected = categories.find(entry => entry.remaining >= requirement - 1e-6);
  if (!selected && categories.length) {
    selected = categories[0];
  }
  const siteOk = Boolean(selected && selected.remaining >= requirement - 1e-6);
  return { siteOk, status: { categories, selected: selected || null } };
}

function computeStats(definition = {}) {
  const site = normalizeSiteDefinition(definition.requirements?.site);
  const stats = {
    totalLaborHours: 0,
    minBuilders: Math.max(1, definition.requirements?.minBuilders || 1),
    totalResources: {},
    components: [],
    addons: [],
    site,
    coreComponent: null,
    coreResources: {},
    coreLaborHours: 0
  };

  (definition.components || []).forEach((component, index) => {
    const labor = Math.max(0, component.laborHours || 0);
    const minBuilders = Math.max(1, component.minBuilders || 1);
    stats.totalLaborHours += labor;
    stats.minBuilders = Math.max(stats.minBuilders, minBuilders);
    const resources = cloneResourceMap(component.resources || {});
    mergeResourceMaps(stats.totalResources, resources);
    const isCore = Boolean(component.isCore) || (!stats.coreComponent && index === 0);
    const normalizedComponent = {
      ...component,
      isCore,
      laborHours: labor,
      minBuilders,
      resources
    };
    stats.components.push(normalizedComponent);
    if (isCore && !stats.coreComponent) {
      stats.coreComponent = normalizedComponent;
      stats.coreResources = cloneResourceMap(resources);
      stats.coreLaborHours = labor;
    }
  });

  if (!stats.coreComponent && stats.components.length) {
    const first = stats.components[0];
    first.isCore = true;
    stats.coreComponent = first;
    stats.coreResources = cloneResourceMap(first.resources || {});
    stats.coreLaborHours = first.laborHours || 0;
  }

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

function locationSupports(type, location = null) {
  const tags = type.requirements?.locationTags || [];
  if (!tags.length) return true;
  const normalizedTags = tags.map(tag => String(tag || '').toLowerCase());
  if (normalizedTags.some(tag => tag === 'any' || isOpenTerrainType(tag))) {
    return true;
  }
  const locations = location ? [location] : allLocations();
  if (!locations.length) return false;
  const features = (locations[0]?.features || []).map(f => f.toLowerCase());
  return normalizedTags.some(tag => featureMatches(features, tag));
}

function hasResearch(id) {
  ensureSets();
  return store.research.has(id);
}

function arrayify(value) {
  if (!value && value !== 0) return [];
  return Array.isArray(value) ? value : [value];
}

function normalizeBuildingRequirement(entry) {
  if (!entry && entry !== 0) return null;
  if (typeof entry === 'string' || typeof entry === 'number') {
    return { id: String(entry), count: 1 };
  }
  if (entry && typeof entry === 'object') {
    const id = entry.id ?? entry.building ?? entry.type;
    if (!id && id !== 0) return null;
    const count = Number.isFinite(entry.count)
      ? Math.max(1, entry.count)
      : Number.isFinite(entry.required)
        ? Math.max(1, entry.required)
        : 1;
    return { id: String(id), count };
  }
  return null;
}

function evaluateUnlockRequirements(unlock = {}) {
  if (!unlock) return { ok: false, missing: null };
  if (unlock.always) return { ok: true, missing: null };

  let ok = true;
  const missing = {
    technologies: [],
    anyTechnology: [],
    research: [],
    anyResearch: [],
    buildings: [],
    anyBuilding: [],
    resources: [],
    custom: false
  };

  if (unlock.custom && typeof unlock.custom === 'function') {
    try {
      if (!unlock.custom(store)) {
        ok = false;
        missing.custom = true;
      }
    } catch (err) {
      console.warn('Building unlock custom check failed', err);
      ok = false;
      missing.custom = true;
    }
  }

  const requiredTechs = arrayify(unlock.technologies)
    .map(id => (id || id === 0 ? String(id) : null))
    .filter(Boolean);
  if (requiredTechs.length) {
    const unmet = requiredTechs.filter(id => !hasTechnology(id));
    if (unmet.length) {
      ok = false;
      missing.technologies = [...new Set(unmet)];
    }
  }

  const optionalTechs = arrayify(unlock.anyTechnology)
    .map(id => (id || id === 0 ? String(id) : null))
    .filter(Boolean);
  if (optionalTechs.length) {
    const satisfied = optionalTechs.some(id => hasTechnology(id));
    if (!satisfied) {
      ok = false;
      missing.anyTechnology = [...new Set(optionalTechs)];
    }
  }

  const requiredResearch = arrayify(unlock.research)
    .map(id => (id || id === 0 ? String(id) : null))
    .filter(Boolean);
  if (requiredResearch.length) {
    const unmetResearch = requiredResearch.filter(id => !hasResearch(id));
    if (unmetResearch.length) {
      ok = false;
      missing.research = [...new Set(unmetResearch)];
    }
  }

  const optionalResearch = arrayify(unlock.anyResearch)
    .map(id => (id || id === 0 ? String(id) : null))
    .filter(Boolean);
  if (optionalResearch.length) {
    const satisfied = optionalResearch.some(id => hasResearch(id));
    if (!satisfied) {
      ok = false;
      missing.anyResearch = [...new Set(optionalResearch)];
    }
  }

  const requiredBuildings = arrayify(unlock.buildings)
    .map(normalizeBuildingRequirement)
    .filter(Boolean);
  if (requiredBuildings.length) {
    const unmetBuildings = [];
    requiredBuildings.forEach(req => {
      const have = countBuildings(req.id, { statuses: ['completed'] });
      if (have < req.count) {
        unmetBuildings.push({ id: req.id, required: req.count, current: have });
      }
    });
    if (unmetBuildings.length) {
      ok = false;
      missing.buildings = unmetBuildings;
    }
  }

  const optionalBuildings = arrayify(unlock.anyBuilding)
    .map(normalizeBuildingRequirement)
    .filter(Boolean);
  if (optionalBuildings.length) {
    const satisfied = optionalBuildings.some(req => {
      const have = countBuildings(req.id, { statuses: ['completed'] });
      return have >= req.count;
    });
    if (!satisfied) {
      ok = false;
      missing.anyBuilding = optionalBuildings.map(req => ({
        id: req.id,
        required: req.count,
        current: countBuildings(req.id, { statuses: ['completed'] })
      }));
    }
  }

  if (unlock.resources) {
    const status = computeResourceStatus(unlock.resources);
    if (status.missing.length) {
      ok = false;
      missing.resources = status.missing.map(entry => ({
        name: entry.name,
        required: entry.required,
        available: entry.available
      }));
    }
  }

  Object.keys(missing).forEach(key => {
    const value = missing[key];
    if (Array.isArray(value) && !value.length) {
      delete missing[key];
    }
    if (value === false || value === null) {
      delete missing[key];
    }
  });

  return { ok, missing: Object.keys(missing).length ? missing : null };
}

function meetsUnlockConditions(unlock = {}) {
  const status = evaluateUnlockRequirements(unlock);
  return Boolean(status.ok);
}

function grantUnlock(id) {
  if (!id && id !== 0) return;
  const info = getTechnology(id);
  if (info?.definition) {
    unlockTechnology(id);
  } else {
    ensureSets();
    store.research.add(String(id));
  }
}

function applyBuildingUnlockEffects(type) {
  const unlocks = type?.effects?.unlocks;
  if (!unlocks) return;
  const entries = Array.isArray(unlocks) ? unlocks : [unlocks];
  entries.forEach(entry => {
    if (!entry && entry !== 0) return;
    if (typeof entry === 'string' || typeof entry === 'number') {
      grantUnlock(entry);
      return;
    }
    if (entry && typeof entry === 'object') {
      const techId = entry.technology ?? entry.tech ?? entry.id;
      if (techId || techId === 0) {
        grantUnlock(techId);
      }
    }
  });
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

export function hasCompletedBuilding(typeId) {
  if (!typeId && typeId !== 0) return false;
  ensureBuildingMap();
  const normalized = String(typeId).toLowerCase();
  let found = false;
  store.buildings.forEach(entry => {
    if (found) return;
    if (entry.status !== 'completed') return;
    if (String(entry.typeId).toLowerCase() === normalized) {
      found = true;
    }
  });
  return found;
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

function characterizeConstructionResources(resources = {}) {
  const weights = { wood: 0, stone: 0, metal: 0 };
  Object.entries(resources).forEach(([name, amount]) => {
    const weight = Math.max(0, Number(amount) || 0);
    if (!weight) return;
    const token = String(name).toLowerCase();
    if (/(wood|log|timber|lumber|beam|board|plank|sapling|pole|stave|branch)/.test(token)) {
      weights.wood += weight;
    }
    if (/(stone|rock|clay|brick|adobe|mortar|slate|granite|cobbl|marble)/.test(token)) {
      weights.stone += weight;
    }
    if (/(metal|ingot|iron|copper|bronze|steel|nail|spike|ore)/.test(token)) {
      weights.metal += weight;
    }
  });
  return weights;
}

function resolveConstructionProficiencies(resources = {}) {
  const weights = characterizeConstructionResources(resources);
  const entries = Object.entries(weights).filter(([, value]) => value > 0);
  if (!entries.length) {
    return { primary: 'construction', extras: [] };
  }
  const [dominantType] = entries.reduce((best, entry) => (entry[1] > best[1] ? entry : best), entries[0]);
  const extras = [];
  const addExtra = (id, effortScale) => {
    if (!id || effortScale <= 0) return;
    if (extras.some(extra => extra.id === id)) return;
    extras.push({ id, effortScale });
  };
  switch (dominantType) {
    case 'stone':
      addExtra('masonry', 0.7);
      break;
    case 'wood':
      addExtra('carpentry', 0.7);
      break;
    case 'metal':
      addExtra('smelting', 0.55);
      break;
    default:
      break;
  }
  entries.forEach(([type]) => {
    if (type === dominantType) return;
    if (type === 'stone') addExtra('masonry', 0.45);
    if (type === 'wood') addExtra('carpentry', 0.45);
    if (type === 'metal') addExtra('smelting', 0.35);
  });
  return { primary: 'construction', extras };
}

export function evaluateBuilding(typeId) {
  const type = buildingTypes.get(typeId);
  if (!type) return null;
  const unlocked = isUnlocked(type);
  const maxCount = getMaxCount(type);
  const existing = countBuildings(typeId);
  const canBuildMore = existing < maxCount;
  const location = getPrimaryLocation();
  const terrainOk = locationSupports(type, location);
  const { siteOk, status: siteStatus } = computeSiteStatus(type, location);
  const locationOk = terrainOk && siteOk;
  const resourceStatus = computeResourceStatus(type.stats.coreResources);
  const totalResourceStatus = computeResourceStatus(type.stats.totalResources);
  const craftedStatus = computeResourceStatus(type.requirements?.craftedGoods || {});
  const unlockStatus = evaluateUnlockRequirements(type.unlock);
  return {
    type,
    unlocked,
    canBuildMore,
    terrainOk,
    siteOk,
    locationOk,
    hasResources: resourceStatus.missing.length === 0,
    resourceStatus,
    craftedStatus,
    totalResourceStatus,
    siteStatus,
    existing,
    maxCount,
    unlockStatus
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

export function beginConstruction(typeId, { workers, locationId, x = null, y = null } = {}) {
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
  const coreResources = cloneResourceMap(type.stats.coreResources);
  const proficiencyProfile = resolveConstructionProficiencies(totalResources);
  const siteCategory = (evaluation?.siteStatus?.selected?.category || type.stats.site?.primaryCategory || null);
  const normalizedSiteCategory = siteCategory ? String(siteCategory).toLowerCase() : null;
  const siteSurfaceArea = type.stats.site?.surfaceArea || 0;
  const coreComponentId = type.stats.coreComponent?.id || null;
  const hasCoords = Number.isFinite(x) && Number.isFinite(y);
  const tileCoords = hasCoords ? { x: Math.trunc(x), y: Math.trunc(y) } : null;

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
    addons: [],
    coreResources,
    coreComponentId,
    siteCategory: normalizedSiteCategory,
    siteSurfaceArea,
    tile: tileCoords
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
        proficiencyId: proficiencyProfile.primary,
        additionalProficiencies: proficiencyProfile.extras.length ? proficiencyProfile.extras : undefined,
        taskId: `construction:${typeId}`,
        tile: tileCoords
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
  const type = getBuildingType(project.typeId);
  const completedAt = timeInfo ? timeInfo() : null;
  const update = {
    id: projectId,
    status: 'completed',
    progressHours: project.totalLaborHours,
    completedAt
  };
  store.updateItem('buildings', update);
  if (type) {
    applyBuildingUnlockEffects(type);
  }
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
