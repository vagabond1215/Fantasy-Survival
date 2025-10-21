import { getItem, addItem } from './inventory.js';
import { getJobs } from './jobs.js';
import { STURDY_STICK_RESOURCES } from './gathering.js';
import { getEquipmentDefinition } from './data/equipment.js';
import { recipeGroups } from './data/recipes.js';
import { hasTechnology } from './technology.js';
import { hasCompletedBuilding, getBuildingType } from './buildings.js';

/**
 * @typedef {Object} UnlockRequirements
 * @property {boolean} [always]
 * @property {string[]} [technologies]
 * @property {string[]} [anyTechnology]
 * @property {string[]} [buildings]
 * @property {string[]} [anyBuilding]
 */

/**
 * @typedef {Object} MissingRequirements
 * @property {string[]} [technologies]
 * @property {string[]} [anyTechnology]
 * @property {string[]} [buildings]
 * @property {string[]} [anyBuilding]
 */

function requireEquipment(id) {
  const spec = getEquipmentDefinition(id);
  if (!spec) {
    throw new Error(`Missing equipment definition for ${id}`);
  }
  return spec;
}

const STURDY_STICK_OPTIONS = Array.from(new Set(STURDY_STICK_RESOURCES || [])).filter(Boolean);

function cloneValue(value) {
  if (Array.isArray(value)) {
    return value.map(entry => cloneValue(entry));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, val]) => [key, cloneValue(val)]));
  }
  return value;
}

function resolveDynamicValue(value) {
  if (Array.isArray(value)) {
    return value.map(entry => resolveDynamicValue(entry));
  }
  if (value && typeof value === 'object') {
    const result = {};
    Object.entries(value).forEach(([key, val]) => {
      result[key] = resolveDynamicValue(val);
    });
    if (result.dynamicOptions === 'sturdy-stick') {
      const options = STURDY_STICK_OPTIONS.length ? [...STURDY_STICK_OPTIONS] : ['sturdy haft stick'];
      result.options = options;
      delete result.dynamicOptions;
      if (!result.label) {
        result.label = 'sturdy haft stick';
      }
      const quantityKeys = ['quantity', 'amount', 'count', 'required', 'qty', 'value'];
      const hasQuantityKey = quantityKeys.some(key => result[key] !== undefined);
      if (!hasQuantityKey) {
        result.quantity = 1;
      }
    }
    return result;
  }
  return value;
}

function resolveDynamicInputs(inputs) {
  if (!inputs) return {};
  if (Array.isArray(inputs)) {
    return inputs.map(entry => resolveDynamicValue(entry));
  }
  if (typeof inputs !== 'object') {
    return inputs;
  }
  const result = {};
  Object.entries(inputs).forEach(([name, spec]) => {
    result[name] = resolveDynamicValue(spec);
  });
  return result;
}

function normalizeBatch(batch) {
  if (!batch || typeof batch !== 'object') {
    return { defaultSize: 1, maxSize: 1, label: 'batches' };
  }
  const defaultSize = Math.max(1, Math.floor(batch.defaultSize ?? batch.size ?? 1));
  const maxSize = Math.max(defaultSize, Math.floor(batch.maxSize ?? batch.maximum ?? defaultSize));
  const label = batch.label || batch.unit || 'batches';
  return { defaultSize, maxSize, label };
}

/**
 * @param {any} unlock
 * @returns {UnlockRequirements | null}
 */
function normalizeUnlock(unlock) {
  if (!unlock) return null;
  if (unlock === 'always') return { always: true };
  if (typeof unlock === 'string') {
    return { technologies: [unlock] };
  }
  /** @type {UnlockRequirements} */
  const normalized = {};
  if (unlock.always) normalized.always = true;

  const techSet = new Set();
  const anyTechSet = new Set();
  const buildingSet = new Set();
  const anyBuildingSet = new Set();

  function addAll(target, values) {
    if (!values) return;
    const list = Array.isArray(values) ? values : [values];
    list.forEach(value => {
      if (!value && value !== 0) return;
      target.add(String(value));
    });
  }

  addAll(techSet, unlock.technology);
  addAll(techSet, unlock.technologies);
  addAll(techSet, unlock.tech);
  addAll(techSet, unlock.requiredTech);
  addAll(anyTechSet, unlock.anyTechnology);
  addAll(anyTechSet, unlock.anyTechnologies);
  addAll(anyTechSet, unlock.anyTech);

  addAll(buildingSet, unlock.building);
  addAll(buildingSet, unlock.buildings);
  addAll(buildingSet, unlock.structures);
  addAll(anyBuildingSet, unlock.anyBuilding);
  addAll(anyBuildingSet, unlock.anyBuildings);

  if (techSet.size) normalized.technologies = [...techSet];
  if (anyTechSet.size) normalized.anyTechnology = [...anyTechSet];
  if (buildingSet.size) normalized.buildings = [...buildingSet];
  if (anyBuildingSet.size) normalized.anyBuilding = [...anyBuildingSet];

  return Object.keys(normalized).length ? normalized : null;
}

function normalizeEfficiency(efficiency) {
  if (!Array.isArray(efficiency)) return [];
  return efficiency
    .map(entry => {
      if (!entry) return null;
      const type = entry.type || entry.kind;
      const id = entry.id || entry.building || entry.technology;
      if (!type || !id) return null;
      const effectSpec = entry.effect || {};
      const inputMultiplier = Number.isFinite(effectSpec.inputMultiplier ?? entry.inputMultiplier)
        ? effectSpec.inputMultiplier ?? entry.inputMultiplier
        : 1;
      const outputMultiplier = Number.isFinite(effectSpec.outputMultiplier ?? entry.outputMultiplier)
        ? effectSpec.outputMultiplier ?? entry.outputMultiplier
        : 1;
      const laborMultiplier = Number.isFinite(effectSpec.laborMultiplier ?? entry.laborMultiplier)
        ? effectSpec.laborMultiplier ?? entry.laborMultiplier
        : 1;
      const timeMultiplier = Number.isFinite(effectSpec.timeMultiplier ?? entry.timeMultiplier)
        ? effectSpec.timeMultiplier ?? entry.timeMultiplier
        : 1;
      const batchBonus = Number.isFinite(effectSpec.batchBonus ?? entry.batchBonus)
        ? effectSpec.batchBonus ?? entry.batchBonus
        : 0;
      return {
        type: String(type),
        id: String(id),
        effect: {
          inputMultiplier,
          outputMultiplier,
          laborMultiplier,
          timeMultiplier,
          batchBonus
        }
      };
    })
    .filter(Boolean);
}

function normalizeProductionEffect(entry = {}) {
  const effect = entry.effect || {};
  const inputMultiplier = Number.isFinite(effect.inputMultiplier ?? entry.inputMultiplier)
    ? effect.inputMultiplier ?? entry.inputMultiplier
    : 1;
  const outputMultiplier = Number.isFinite(effect.outputMultiplier ?? entry.outputMultiplier)
    ? effect.outputMultiplier ?? entry.outputMultiplier
    : 1;
  const laborMultiplier = Number.isFinite(effect.laborMultiplier ?? entry.laborMultiplier)
    ? effect.laborMultiplier ?? entry.laborMultiplier
    : 1;
  const timeMultiplier = Number.isFinite(effect.timeMultiplier ?? entry.timeMultiplier)
    ? effect.timeMultiplier ?? entry.timeMultiplier
    : 1;
  const batchBonus = Number.isFinite(effect.batchBonus ?? entry.batchBonus)
    ? effect.batchBonus ?? entry.batchBonus
    : 0;
  return { inputMultiplier, outputMultiplier, laborMultiplier, timeMultiplier, batchBonus };
}

function normalizeProductionMode(entry, index = 0) {
  if (!entry) return null;
  const modeId = entry.id || entry.mode || entry.name || entry.building || `mode-${index}`;
  const typeValue = entry.type || entry.kind || (entry.building ? 'building' : 'manual');
  const normalizedType = String(typeValue || 'manual').toLowerCase() === 'hand' ? 'manual' : String(typeValue || 'manual');
  const label = entry.label || entry.name || (entry.building ? `${entry.building} station` : 'Manual Work');
  const basePriority = Number.isFinite(entry.priority) ? Number(entry.priority) : normalizedType === 'manual' ? 0 : 10 + index;
  const description = entry.description || '';

  const requirementSpec = entry.requires || entry.requirement || entry.unlock || null;
  /** @type {UnlockRequirements | null} */
  let requirements = normalizeUnlock(requirementSpec);
  const buildingId = entry.building || entry.structure || entry.station || null;
  if (buildingId) {
    const normalizedId = String(buildingId);
    /** @type {UnlockRequirements} */
    const base = requirements ? { ...requirements } : {};
    const buildingSet = new Set(base.buildings || []);
    buildingSet.add(normalizedId);
    base.buildings = [...buildingSet];
    requirements = Object.keys(base).length ? base : null;
  }

  const effect = normalizeProductionEffect(entry);

  return {
    id: String(modeId),
    label,
    type: normalizedType,
    buildingId: buildingId ? String(buildingId) : null,
    effect,
    requirements,
    priority: basePriority,
    description
  };
}

function normalizeProductionModes(list) {
  if (!Array.isArray(list) || !list.length) {
    return [
      normalizeProductionMode(
        {
          id: 'manual',
          label: 'Hand Crafting',
          type: 'manual',
          effect: { inputMultiplier: 1, outputMultiplier: 1, laborMultiplier: 1, timeMultiplier: 1, batchBonus: 0 },
          priority: 0
        },
        0
      )
    ];
  }
  return list.map((mode, index) => normalizeProductionMode(mode, index)).filter(Boolean);
}

/**
 * @param {UnlockRequirements | null} requirements
 */
function evaluateRequirementStatus(requirements) {
  if (!requirements) {
    return { available: true, missing: null };
  }
  if (requirements.always) {
    return { available: true, missing: null };
  }
  /** @type {MissingRequirements} */
  const missing = { technologies: [], anyTechnology: [], buildings: [], anyBuilding: [] };
  let available = true;

  const techList = [];
  if (Array.isArray(requirements.technologies)) techList.push(...requirements.technologies);
  if (techList.length) {
    const unmet = techList.filter(id => !hasTechnology(id));
    if (unmet.length) {
      available = false;
      missing.technologies = [...new Set(unmet.map(id => String(id)))];
    }
  }

  const anyTechList = Array.isArray(requirements.anyTechnology) ? requirements.anyTechnology : [];
  if (anyTechList.length) {
    const satisfied = anyTechList.some(id => hasTechnology(id));
    if (!satisfied) {
      available = false;
      missing.anyTechnology = [...new Set(anyTechList.map(id => String(id)))];
    }
  }

  const buildingList = [];
  if (Array.isArray(requirements.buildings)) buildingList.push(...requirements.buildings);
  if (buildingList.length) {
    const unmetBuildings = buildingList.filter(id => !hasCompletedBuilding(id));
    if (unmetBuildings.length) {
      available = false;
      missing.buildings = [...new Set(unmetBuildings.map(id => String(id)))];
    }
  }

  const anyBuildingList = Array.isArray(requirements.anyBuilding) ? requirements.anyBuilding : [];
  if (anyBuildingList.length) {
    const satisfied = anyBuildingList.some(id => hasCompletedBuilding(id));
    if (!satisfied) {
      available = false;
      missing.anyBuilding = [...new Set(anyBuildingList.map(id => String(id)))];
    }
  }

  Object.keys(missing).forEach(key => {
    if (Array.isArray(missing[key]) && !missing[key].length) {
      delete missing[key];
    }
  });

  return { available, missing: Object.keys(missing).length ? missing : null };
}

function resolveProductionModes(recipe, requestedId = null) {
  const modes = (recipe?.productionModes || []).map((mode, index) => {
    const status = evaluateRequirementStatus(mode.requirements);
    return { ...mode, index, status };
  });

  const availableModes = modes.filter(mode => mode.status.available);
  let selected = null;
  if (requestedId) {
    const normalizedId = String(requestedId);
    selected = modes.find(mode => mode.id === normalizedId && mode.status.available) || null;
  }
  if (!selected && availableModes.length) {
    selected = [...availableModes].sort((a, b) => {
      if (b.priority === a.priority) return a.index - b.index;
      return b.priority - a.priority;
    })[0];
  }
  const requestedMode = requestedId ? modes.find(mode => mode.id === String(requestedId)) || null : null;
  const fallback = selected || requestedMode || (modes.length ? modes[0] : null);
  return { modes, selected, fallback };
}

function normalizeRecipe(entry, groupId, groupLabel) {
  const id = String(entry.id);
  const tools = (entry.tools || []).map(toolId => requireEquipment(toolId));
  const baseInputs = resolveDynamicInputs(entry.inputs || {});
  const baseOutputs = cloneValue(entry.outputs || {});
  const laborHours = Number.isFinite(entry.laborHours)
    ? entry.laborHours
    : Number.isFinite(entry.timeHours)
    ? entry.timeHours
    : 0;
  const timeHours = Number.isFinite(entry.timeHours)
    ? entry.timeHours
    : Number.isFinite(entry.laborHours)
    ? entry.laborHours
    : 0;

  return {
    id,
    name: entry.name || id,
    icon: entry.icon || '🛠️',
    description: entry.description || '',
    category: entry.category || groupId,
    groupId,
    groupLabel,
    baseInputs,
    baseOutputs,
    inputs: cloneValue(baseInputs),
    outputs: cloneValue(baseOutputs),
    laborHours,
    timeHours,
    baseLaborHours: laborHours,
    baseTimeHours: timeHours,
    toolsRequired: tools.map(tool => tool.id),
    toolDetails: tools,
    unlock: normalizeUnlock(entry.unlock),
    batch: normalizeBatch(entry.batch),
    efficiencyBonuses: normalizeEfficiency(entry.efficiency),
    productionModes: normalizeProductionModes(entry.production || entry.workstations || entry.stations)
  };
}

function buildRecipeList(groups) {
  const list = [];
  (groups || []).forEach(group => {
    const groupId = group?.id || 'general';
    const groupLabel = group?.label || groupId;
    (group?.recipes || []).forEach(entry => {
      list.push(normalizeRecipe(entry, groupId, groupLabel));
    });
  });
  return list;
}

const CRAFTING_RECIPES = buildRecipeList(recipeGroups);

function recipeById(id) {
  return CRAFTING_RECIPES.find(entry => entry.id === id) || null;
}

/**
 * @param {ReturnType<typeof normalizeRecipe>} recipe
 */
function evaluateUnlockStatus(recipe) {
  const unlock = recipe?.unlock;
  if (!unlock) {
    return { unlocked: false, gated: false, missing: null };
  }
  if (unlock.always) {
    return { unlocked: true, gated: false, missing: null };
  }

  let gated = false;
  let unlocked = true;
  const missing = { technologies: [], anyTechnology: [], buildings: [], anyBuilding: [] };

  const technologies = Array.isArray(unlock.technologies) ? [...unlock.technologies] : [];
  if (technologies.length) {
    gated = true;
    const unmet = technologies.filter(id => !hasTechnology(id));
    if (unmet.length) {
      unlocked = false;
      missing.technologies = [...new Set(unmet.map(id => String(id)))];
    }
  }

  const anyTechnology = Array.isArray(unlock.anyTechnology) ? [...unlock.anyTechnology] : [];
  if (anyTechnology.length) {
    gated = true;
    const satisfied = anyTechnology.some(id => hasTechnology(id));
    if (!satisfied) {
      unlocked = false;
      missing.anyTechnology = [...new Set(anyTechnology.map(id => String(id)))];
    }
  }

  const buildings = Array.isArray(unlock.buildings) ? [...unlock.buildings] : [];
  if (buildings.length) {
    gated = true;
    const unmetBuildings = buildings.filter(id => !hasCompletedBuilding(id));
    if (unmetBuildings.length) {
      unlocked = false;
      missing.buildings = [...new Set(unmetBuildings.map(id => String(id)))];
    }
  }

  const anyBuilding = Array.isArray(unlock.anyBuilding) ? [...unlock.anyBuilding] : [];
  if (anyBuilding.length) {
    gated = true;
    const satisfied = anyBuilding.some(id => hasCompletedBuilding(id));
    if (!satisfied) {
      unlocked = false;
      missing.anyBuilding = [...new Set(anyBuilding.map(id => String(id)))];
    }
  }

  Object.keys(missing).forEach(key => {
    if (Array.isArray(missing[key]) && !missing[key].length) {
      delete missing[key];
    }
  });

  if (!gated) {
    return { unlocked: false, gated: false, missing: null };
  }

  return { unlocked, gated: true, missing: Object.keys(missing).length ? missing : null };
}

function safeQuantity(value, fallback = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  if (numeric <= 0) return 0;
  return Math.max(0, Math.trunc(numeric));
}

const INPUT_QUANTITY_KEYS = ['quantity', 'amount', 'count', 'required', 'qty', 'value'];

function scaleInputSpec(spec, factor) {
  const cloned = cloneValue(spec);
  if (typeof cloned === 'number') {
    if (cloned <= 0) return 0;
    const scaled = cloned * factor;
    if (!Number.isFinite(scaled) || scaled <= 0) return 0;
    return Math.ceil(scaled - 1e-9);
  }
  if (typeof cloned === 'string') return cloned;
  if (Array.isArray(cloned)) {
    return cloned.map(item => scaleInputSpec(item, factor));
  }
  if (cloned && typeof cloned === 'object') {
    const result = { ...cloned };
    let baseQuantity = null;
    INPUT_QUANTITY_KEYS.forEach(key => {
      if (baseQuantity === null && Number.isFinite(cloned[key])) {
        baseQuantity = Number(cloned[key]);
      }
    });
    if (baseQuantity !== null) {
      const baseValue = baseQuantity;
      const scaled = baseValue * factor;
      let finalQuantity = 0;
      if (Number.isFinite(scaled) && scaled > 0) {
        finalQuantity = Math.ceil(scaled - 1e-9);
        if (finalQuantity <= 0 && baseValue > 0) finalQuantity = 1;
      }
      INPUT_QUANTITY_KEYS.forEach(key => {
        if (cloned[key] !== undefined) {
          result[key] = finalQuantity;
        }
      });
    }
    return result;
  }
  return cloned;
}

function scaleInputs(baseInputs, factor) {
  if (!baseInputs) return {};
  if (Array.isArray(baseInputs)) {
    return baseInputs.map(item => scaleInputSpec(item, factor));
  }
  if (typeof baseInputs !== 'object') {
    return scaleInputSpec(baseInputs, factor);
  }
  const result = {};
  Object.entries(baseInputs).forEach(([name, spec]) => {
    result[name] = scaleInputSpec(spec, factor);
  });
  return result;
}

const OUTPUT_QUANTITY_KEYS = ['quantity', 'amount', 'count', 'qty', 'value'];

function scaleOutputSpec(spec, factor) {
  const cloned = cloneValue(spec);
  if (typeof cloned === 'number') {
    if (cloned <= 0) return 0;
    const scaled = cloned * factor;
    if (!Number.isFinite(scaled) || scaled <= 0) return 0;
    const rounded = Math.round(scaled);
    return rounded <= 0 ? 1 : rounded;
  }
  if (typeof cloned === 'string') return cloned;
  if (Array.isArray(cloned)) {
    return cloned.map(item => scaleOutputSpec(item, factor));
  }
  if (cloned && typeof cloned === 'object') {
    const result = { ...cloned };
    let baseQuantity = null;
    OUTPUT_QUANTITY_KEYS.forEach(key => {
      if (baseQuantity === null && Number.isFinite(cloned[key])) {
        baseQuantity = Number(cloned[key]);
      }
    });
    if (baseQuantity !== null) {
      const baseValue = baseQuantity;
      const scaled = baseValue * factor;
      let finalQuantity = 0;
      if (Number.isFinite(scaled) && scaled > 0) {
        finalQuantity = Math.round(scaled);
        if (finalQuantity <= 0 && scaled > 0) finalQuantity = 1;
      }
      OUTPUT_QUANTITY_KEYS.forEach(key => {
        if (cloned[key] !== undefined) {
          result[key] = finalQuantity;
        }
      });
    }
    return result;
  }
  return cloned;
}

function scaleOutputs(baseOutputs, factor) {
  if (!baseOutputs) return {};
  if (Array.isArray(baseOutputs)) {
    return baseOutputs.map(item => scaleOutputSpec(item, factor));
  }
  if (typeof baseOutputs !== 'object') {
    return scaleOutputSpec(baseOutputs, factor);
  }
  const result = {};
  Object.entries(baseOutputs).forEach(([name, spec]) => {
    result[name] = scaleOutputSpec(spec, factor);
  });
  return result;
}

function collectActiveBonuses(recipe) {
  const active = [];
  (recipe?.efficiencyBonuses || []).forEach(bonus => {
    if (!bonus) return;
    const type = String(bonus.type || '').toLowerCase();
    if (type === 'technology') {
      if (hasTechnology(bonus.id)) active.push(bonus);
    } else if (type === 'building') {
      if (hasCompletedBuilding(bonus.id)) active.push(bonus);
    } else {
      if (hasTechnology(bonus.id) || hasCompletedBuilding(bonus.id)) {
        active.push(bonus);
      }
    }
  });
  return active;
}

function instantiateRecipe(recipe, { batchSize = null, productionMode = null } = {}) {
  const batch = recipe?.batch || { defaultSize: 1, maxSize: 1 };
  const baseBatchSize = Math.max(1, Math.floor(batch.defaultSize || 1));
  const maxBatchSize = Math.max(baseBatchSize, Math.floor(batch.maxSize || baseBatchSize));
  const requestedSize = Number.isFinite(batchSize) ? Math.max(1, Math.floor(batchSize)) : baseBatchSize;
  const appliedBonuses = collectActiveBonuses(recipe);
  if (productionMode?.effect) {
    appliedBonuses.push({
      type: 'production',
      id: productionMode.id,
      label: productionMode.label,
      effect: { ...productionMode.effect }
    });
  }
  const totals = appliedBonuses.reduce(
    (acc, bonus) => {
      const effect = bonus.effect || {};
      if (Number.isFinite(effect.inputMultiplier)) acc.inputMultiplier *= effect.inputMultiplier;
      if (Number.isFinite(effect.outputMultiplier)) acc.outputMultiplier *= effect.outputMultiplier;
      if (Number.isFinite(effect.laborMultiplier)) acc.laborMultiplier *= effect.laborMultiplier;
      if (Number.isFinite(effect.timeMultiplier)) acc.timeMultiplier *= effect.timeMultiplier;
      if (Number.isFinite(effect.batchBonus)) acc.batchBonus += effect.batchBonus;
      return acc;
    },
    { inputMultiplier: 1, outputMultiplier: 1, laborMultiplier: 1, timeMultiplier: 1, batchBonus: 0 }
  );
  let effectiveBatch = Number.isFinite(requestedSize + totals.batchBonus)
    ? Math.floor(requestedSize + totals.batchBonus)
    : requestedSize;
  if (effectiveBatch <= 0) effectiveBatch = requestedSize;
  effectiveBatch = Math.max(1, Math.min(maxBatchSize, effectiveBatch));

  const inputFactor = effectiveBatch * totals.inputMultiplier;
  const outputFactor = effectiveBatch * totals.outputMultiplier;
  const laborBase = Number.isFinite(recipe.baseLaborHours) ? recipe.baseLaborHours : recipe.laborHours || 0;
  const timeBase = Number.isFinite(recipe.baseTimeHours) ? recipe.baseTimeHours : recipe.timeHours || laborBase;
  const laborHours = laborBase * effectiveBatch * totals.laborMultiplier;
  const timeHours = timeBase * effectiveBatch * totals.timeMultiplier;

  const inputs = scaleInputs(recipe.baseInputs, inputFactor);
  const outputs = scaleOutputs(recipe.baseOutputs, outputFactor);

  return {
    instance: {
      ...recipe,
      inputs,
      outputs,
      laborHours,
      timeHours,
      batchSize: effectiveBatch,
      appliedBonuses,
      productionMode: productionMode
        ? {
            id: productionMode.id,
            label: productionMode.label,
            type: productionMode.type,
            buildingId: productionMode.buildingId || null
          }
        : null
    },
    batchSize: effectiveBatch,
    requestedBatchSize: requestedSize,
    appliedBonuses
  };
}

function normalizeRequirement(label, spec) {
  if (spec == null) return null;
  const nameLabel = label ? String(label) : '';
  if (typeof spec === 'number') {
    const quantity = safeQuantity(spec, 0);
    if (!quantity) return null;
    const option = nameLabel || '';
    const options = option ? [option] : [];
    return options.length ? { label: nameLabel || option, options, quantity } : null;
  }
  if (typeof spec === 'string') {
    const option = String(spec);
    const resolvedLabel = nameLabel || option;
    return { label: resolvedLabel, options: [option], quantity: 1 };
  }
  if (Array.isArray(spec)) {
    const options = spec.map(option => String(option)).filter(Boolean);
    if (!options.length) return null;
    const resolvedLabel = nameLabel || options[0];
    return { label: resolvedLabel, options, quantity: 1 };
  }
  if (typeof spec === 'object') {
    const optionLists = [];
    if (Array.isArray(spec.options)) optionLists.push(spec.options);
    if (Array.isArray(spec.anyOf)) optionLists.push(spec.anyOf);
    if (Array.isArray(spec.choices)) optionLists.push(spec.choices);
    if (Array.isArray(spec.items)) optionLists.push(spec.items);
    let options = optionLists.flat().map(option => String(option)).filter(Boolean);
    if (!options.length && typeof spec.name === 'string') {
      options = [spec.name];
    }
    if (!options.length && nameLabel) {
      options = [nameLabel];
    }
    const quantity = safeQuantity(
      spec.quantity ?? spec.amount ?? spec.count ?? spec.required ?? spec.qty ?? spec.value,
      1
    ) || 1;
    const resolvedLabel = spec.label || nameLabel || options[0] || '';
    return options.length ? { label: resolvedLabel, options, quantity } : null;
  }
  return null;
}

function getRecipeRequirements(recipe) {
  const requirements = [];
  const inputs = recipe?.inputs;
  if (!inputs) return requirements;
  if (Array.isArray(inputs)) {
    inputs.forEach(entry => {
      if (!entry) return;
      if (typeof entry === 'string') {
        const requirement = normalizeRequirement(entry, entry);
        if (requirement) requirements.push(requirement);
      } else if (Array.isArray(entry)) {
        const requirement = normalizeRequirement('', entry);
        if (requirement) requirements.push(requirement);
      } else if (typeof entry === 'object') {
        const label = entry.label || entry.name || entry.id || '';
        const requirement = normalizeRequirement(label, entry);
        if (requirement) requirements.push(requirement);
      }
    });
    return requirements;
  }
  if (typeof inputs === 'object') {
    Object.entries(inputs).forEach(([label, spec]) => {
      const requirement = normalizeRequirement(label, spec);
      if (requirement) requirements.push(requirement);
    });
  }
  return requirements;
}

function evaluateInputs(recipe) {
  const requirements = getRecipeRequirements(recipe);
  const missingMaterials = [];
  const materialPlan = [];

  requirements.forEach(requirement => {
    const { label, options, quantity } = requirement;
    const optionAvailability = options.map(option => {
      const record = getItem(option);
      const available = Number.isFinite(record?.quantity) ? record.quantity : 0;
      return { item: option, available };
    });
    const totalAvailable = optionAvailability.reduce((sum, entry) => sum + entry.available, 0);
    const satisfied = Math.min(quantity, totalAvailable);
    let remaining = satisfied;
    const usage = [];
    optionAvailability.forEach(entry => {
      if (remaining <= 0) return;
      if (entry.available <= 0) return;
      const amount = Math.min(entry.available, remaining);
      if (amount > 0) {
        usage.push({ item: entry.item, amount });
        remaining -= amount;
      }
    });
    if (totalAvailable < quantity) {
      missingMaterials.push({ name: label, required: quantity, available: totalAvailable });
    }
    materialPlan.push({ label, quantity, options: optionAvailability.map(entry => entry.item), usage });
  });

  return { requirements, missingMaterials, materialPlan };
}

export function listCraftingRecipes() {
  return CRAFTING_RECIPES.map(recipe => ({ ...recipe }));
}

export function evaluateRecipe(id, { availableTools = [], batchSize = null, productionModeId = null } = {}) {
  const recipe = recipeById(id);
  if (!recipe) return null;
  const unlockStatus = evaluateUnlockStatus(recipe);
  const { modes: productionModes, selected, fallback } = resolveProductionModes(recipe, productionModeId);
  const hasProductionAccess = productionModes.some(mode => mode.status.available);
  const activeMode = selected || fallback || null;
  const { instance, batchSize: effectiveBatch, appliedBonuses } = instantiateRecipe(recipe, {
    batchSize,
    productionMode: activeMode
  });
  const unlocked = Boolean(unlockStatus.unlocked && hasProductionAccess);
  const laborHours = Math.max(0, Number.isFinite(instance.laborHours) ? instance.laborHours : instance.timeHours || 0);
  const toolSet = new Set((availableTools || []).map(tool => String(tool).toLowerCase()));
  const requiredTools = instance.toolsRequired || [];
  const missingTools = requiredTools.filter(tool => !toolSet.has(String(tool).toLowerCase()));
  const { missingMaterials, materialPlan, requirements } = evaluateInputs(instance);
  const productionModeDetails = productionModes.map(mode => ({
    id: mode.id,
    label: mode.label,
    type: mode.type,
    buildingId: mode.buildingId,
    effect: mode.effect,
    priority: mode.priority,
    available: mode.status.available,
    missing: mode.status.missing
  }));
  const missingProduction = productionModeDetails.filter(mode => !mode.available);
  return {
    recipe: instance,
    baseRecipe: recipe,
    unlocked,
    unlockStatus,
    hasProductionAccess,
    productionMode: instance.productionMode,
    productionModeAvailable: Boolean(selected),
    productionModes: productionModeDetails,
    missingProduction,
    hasTools: missingTools.length === 0,
    hasMaterials: missingMaterials.length === 0,
    missingTools,
    missingMaterials,
    materialPlan,
    materialRequirements: requirements,
    laborHours,
    batchSize: effectiveBatch,
    appliedBonuses
  };
}

export function getUnlockedRecipes({ availableTools = [], batchSize = null } = {}) {
  return CRAFTING_RECIPES.map(recipe => evaluateRecipe(recipe.id, { availableTools, batchSize })).filter(
    info => info && info.unlocked
  );
}

function describeBuildings(ids = []) {
  return ids
    .map(id => {
      const type = getBuildingType(id);
      return type?.name || String(id);
    })
    .filter(Boolean);
}

export function craftRecipe(id, { availableTools = [], batchSize = null, productionModeId = null } = {}) {
  const info = evaluateRecipe(id, { availableTools, batchSize, productionModeId });
  if (!info) {
    throw new Error('Unknown recipe.');
  }
  if (!info.unlocked) {
    const reasons = [];
    /** @type {MissingRequirements} */
    const missing = info.unlockStatus?.missing || {};
    if (missing.technologies?.length) {
      reasons.push(`missing technology: ${missing.technologies.join(', ')}`);
    }
    if (missing.anyTechnology?.length) {
      reasons.push(`research one of: ${missing.anyTechnology.join(', ')}`);
    }
    if (missing.buildings?.length) {
      const labels = describeBuildings(missing.buildings);
      reasons.push(`construct ${labels.join(', ')}`);
    }
    if (missing.anyBuilding?.length) {
      const labels = describeBuildings(missing.anyBuilding);
      reasons.push(`construct one of: ${labels.join(', ')}`);
    }
    if (!info.hasProductionAccess && info.productionModes?.length) {
        const productionNeeds = info.productionModes
          .filter(mode => !mode.available && mode.missing)
          .map(mode => {
            const parts = [];
            if (mode.missing?.buildings?.length) {
              const labels = describeBuildings(mode.missing.buildings);
              parts.push(`build ${labels.join(', ')}`);
            }
            if (mode.missing?.anyBuilding?.length) {
              const labels = describeBuildings(mode.missing.anyBuilding);
              parts.push(`build one of ${labels.join(', ')}`);
            }
            if (mode.missing?.technologies?.length) {
              parts.push(`research ${mode.missing.technologies.join(', ')}`);
            }
            if (mode.missing?.anyTechnology?.length) {
              parts.push(`research one of ${mode.missing.anyTechnology.join(', ')}`);
            }
            return parts.length ? `${mode.label || mode.id}: ${parts.join('; ')}` : null;
          })
        .filter(Boolean);
      if (productionNeeds.length) {
        reasons.push(`prepare a workstation (${productionNeeds.join(' | ')})`);
      }
    }
    const reasonText = reasons.length ? ` ${reasons.join('; ')}` : '';
    throw new Error(`${info.recipe.name} is not unlocked yet.${reasonText}`);
  }
  if (!info.hasTools) {
    const toolList = info.missingTools.join(', ');
    throw new Error(`Missing required tools: ${toolList}.`);
  }
  if (!info.hasMaterials) {
    const shortage = info.missingMaterials.map(entry => `${entry.name} (${entry.available}/${entry.required})`).join(', ');
    throw new Error(`Insufficient materials: ${shortage}.`);
  }

  const jobs = getJobs();
  const availableCrafters = Math.max(0, Number.isFinite(jobs?.craft) ? Math.trunc(jobs.craft) : 0);
  const laborHours = info.recipe.laborHours ?? info.laborHours ?? 0;
  let timeHours = 0;
  if (laborHours > 0) {
    if (availableCrafters <= 0) {
      throw new Error('Assign at least one Crafter before starting this project.');
    }
    timeHours = laborHours / availableCrafters;
  }

  const materialPlan = Array.isArray(info.materialPlan) ? info.materialPlan : [];
  if (materialPlan.length) {
    materialPlan.forEach(requirement => {
      requirement.usage.forEach(entry => {
        if (!entry || !entry.item || !entry.amount) return;
        addItem(entry.item, -entry.amount);
      });
    });
  } else {
    Object.entries(info.recipe.inputs || {}).forEach(([name, amount]) => {
      if (!amount) return;
      addItem(name, -amount);
    });
  }

  Object.entries(info.recipe.outputs || {}).forEach(([name, amount]) => {
    if (!amount) return;
    addItem(name, amount);
  });

  return {
    recipe: info.recipe,
    timeHours,
    laborHours,
    workforce: availableCrafters,
    batchSize: info.batchSize || info.recipe.batchSize || 1,
    appliedBonuses: info.appliedBonuses || [],
    productionMode: info.productionMode
  };
}

export default {
  listCraftingRecipes,
  evaluateRecipe,
  getUnlockedRecipes,
  craftRecipe
};
