import { getItem, addItem } from './inventory.js';
import { getJobs } from './jobs.js';
import { STURDY_STICK_RESOURCES } from './gathering.js';

const STURDY_STICK_OPTIONS = Array.from(new Set(STURDY_STICK_RESOURCES || [])).filter(Boolean);

const CRAFTING_RECIPES = [
  {
    id: 'cord',
    name: 'Cord',
    icon: '🪢',
    description: 'Twist pliable fibers into sturdy cord for lashings and traps.',
    inputs: { 'plant fibers': 3 },
    outputs: { cord: 1 },
    laborHours: 0.5,
    timeHours: 0.5,
    toolsRequired: ['stone knife'],
    unlock: { always: true }
  },
  {
    id: 'sharpened-stone',
    name: 'Sharpened Stone',
    icon: '🗡️',
    description: 'Shape a keen stone edge for scraping hides or cutting cords.',
    inputs: { 'small stones': 1 },
    outputs: { 'sharpened stone': 1 },
    laborHours: 0.25,
    timeHours: 0.25,
    toolsRequired: ['wooden hammer'],
    unlock: { always: true }
  },
  {
    id: 'stone-hand-axe',
    name: 'Stone Hand Axe',
    icon: '🪓',
    description: 'Haft a sharpened stone blade onto a seasoned branch for chopping timber.',
    inputs: {
      cord: 1,
      'sharpened stone': 1,
      'sturdy haft stick': {
        label: 'sturdy haft stick',
        options: STURDY_STICK_OPTIONS.length ? STURDY_STICK_OPTIONS : ['sturdy haft stick'],
        quantity: 1
      }
    },
    outputs: { 'stone hand axe': 1 },
    laborHours: 2,
    timeHours: 2,
    toolsRequired: ['stone knife', 'wooden hammer'],
    unlock: { always: true }
  }
];

function recipeById(id) {
  return CRAFTING_RECIPES.find(entry => entry.id === id) || null;
}

function isUnlocked(recipe) {
  if (!recipe?.unlock) return false;
  if (recipe.unlock.always) return true;
  return true;
}

function safeQuantity(value, fallback = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  if (numeric <= 0) return 0;
  return Math.max(0, Math.trunc(numeric));
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
  return [...CRAFTING_RECIPES];
}

export function evaluateRecipe(id, { availableTools = [] } = {}) {
  const recipe = recipeById(id);
  if (!recipe) return null;
  const unlocked = isUnlocked(recipe);
  const laborHours = Number.isFinite(recipe.laborHours)
    ? Math.max(0, recipe.laborHours)
    : Math.max(0, recipe.timeHours || 0);
  const toolSet = new Set((availableTools || []).map(tool => String(tool).toLowerCase()));
  const requiredTools = recipe.toolsRequired || [];
  const missingTools = requiredTools.filter(tool => !toolSet.has(String(tool).toLowerCase()));
  const { missingMaterials, materialPlan, requirements } = evaluateInputs(recipe);
  return {
    recipe,
    unlocked,
    hasTools: missingTools.length === 0,
    hasMaterials: missingMaterials.length === 0,
    missingTools,
    missingMaterials,
    materialPlan,
    materialRequirements: requirements,
    laborHours
  };
}

export function getUnlockedRecipes({ availableTools = [] } = {}) {
  return CRAFTING_RECIPES.map(recipe => evaluateRecipe(recipe.id, { availableTools })).filter(info => info && info.unlocked);
}

export function craftRecipe(id, { availableTools = [] } = {}) {
  const info = evaluateRecipe(id, { availableTools });
  if (!info) {
    throw new Error('Unknown recipe.');
  }
  if (!info.unlocked) {
    throw new Error(`${info.recipe.name} is not unlocked yet.`);
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
  const laborHours = info.laborHours || 0;
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
    workforce: availableCrafters
  };
}

export default {
  listCraftingRecipes,
  evaluateRecipe,
  getUnlockedRecipes,
  craftRecipe
};
