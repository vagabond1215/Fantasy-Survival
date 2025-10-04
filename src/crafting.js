import { getItem, addItem } from './inventory.js';
import { getJobs } from './jobs.js';

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

function evaluateInputs(recipe) {
  const missing = [];
  Object.entries(recipe.inputs || {}).forEach(([name, required]) => {
    if (!required) return;
    const available = getItem(name).quantity || 0;
    if (available < required) {
      missing.push({ name, required, available });
    }
  });
  return missing;
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
  const missingMaterials = evaluateInputs(recipe);
  return {
    recipe,
    unlocked,
    hasTools: missingTools.length === 0,
    hasMaterials: missingMaterials.length === 0,
    missingTools,
    missingMaterials,
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

  Object.entries(info.recipe.inputs || {}).forEach(([name, amount]) => {
    if (!amount) return;
    addItem(name, -amount);
  });

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
