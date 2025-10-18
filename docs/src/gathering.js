import store from './state.js';
import { getCurrentAbsoluteHours } from './time.js';

function slugify(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const DEFAULT_STICK_SEASON_WEIGHTS = { Thawbound: 2, Sunheight: 3, Emberwane: 3, Frostshroud: 2 };

const STURDY_TREE_STICK_CONFIG = [
  {
    name: 'Rowan',
    habitats: ['forest'],
    encounterName: 'storm-felled rowan limb',
    successSuffix: 'from a storm-felled rowan branch ideal for hafting tools.'
  },
  {
    name: 'Buttonwood',
    habitats: ['water'],
    encounterName: 'salt-hardened buttonwood branch',
    successSuffix: 'from the tide-smoothed buttonwood branch, tough enough for sturdy grips.'
  },
  {
    name: 'Carob',
    habitats: ['forest', 'open'],
    encounterName: 'fallen carob limb',
    successSuffix: 'after trimming a dense carob branch suited for tool hafts.'
  }
];

const STURDY_TREE_STICK_ITEMS = STURDY_TREE_STICK_CONFIG.map(config => {
  const slug = slugify(config.name);
  const lowerName = config.name.toLowerCase();
  const resourceName = `sturdy ${lowerName} stick`;
  return {
    id: `sturdy-stick-${slug}`,
    resource: resourceName,
    singularName: resourceName,
    encounterName: config.encounterName || `fallen ${lowerName} branch`,
    type: 'loose',
    habitats: Array.isArray(config.habitats) && config.habitats.length ? [...config.habitats] : ['forest'],
    baseWeight: Number.isFinite(config.baseWeight) ? config.baseWeight : 2,
    seasonWeights: { ...DEFAULT_STICK_SEASON_WEIGHTS, ...(config.seasonWeights || {}) },
    minQuantity: Number.isFinite(config.minQuantity) ? config.minQuantity : 1,
    maxQuantity: Number.isFinite(config.maxQuantity) ? config.maxQuantity : 2,
    timePerUnit: Number.isFinite(config.timePerUnit) ? config.timePerUnit : 0.35,
    respawnHours: Number.isFinite(config.respawnHours) ? config.respawnHours : 16,
    successSuffix:
      typeof config.successSuffix === 'string'
        ? config.successSuffix
        : `from a resilient ${lowerName} branch ready to be carved into handles.`,
    blockedVerb: 'gather'
  };
});

const BASE_HABITAT_ITEMS = [
  {
    id: 'forest-mushrooms',
    resource: 'mushrooms',
    singularName: 'mushroom',
    encounterName: 'cluster of mushrooms',
    type: 'loose',
    habitats: ['forest'],
    baseWeight: 3,
    seasonWeights: { Thawbound: 4, Sunheight: 2, Emberwane: 5, Frostshroud: 1 },
    minQuantity: 1,
    maxQuantity: 4,
    timePerUnit: 0.15,
    respawnHours: 20,
    successSuffix: 'from the forest floor.'
  },
  {
    id: 'forest-firewood',
    resource: 'firewood',
    singularName: 'bundle of firewood',
    encounterName: 'fallen branches',
    type: 'loose',
    habitats: ['forest'],
    baseWeight: 3,
    seasonWeights: { Thawbound: 3, Sunheight: 3, Emberwane: 3, Frostshroud: 2 },
    minQuantity: 1,
    maxQuantity: 3,
    timePerUnit: 0.25,
    respawnHours: 12,
    successSuffix: 'from the surrounding forest.'
  },
  {
    id: 'forest-pinecones',
    resource: 'pinecones',
    singularName: 'pinecone',
    encounterName: 'scatter of pinecones',
    type: 'loose',
    habitats: ['forest'],
    baseWeight: 2,
    seasonWeights: { Thawbound: 2, Sunheight: 3, Emberwane: 3, Frostshroud: 1 },
    minQuantity: 2,
    maxQuantity: 6,
    timePerUnit: 0.05,
    respawnHours: 10,
    successSuffix: 'from beneath the conifers.'
  },
  {
    id: 'forest-herbs',
    resource: 'herbs',
    singularName: 'bundle of herbs',
    encounterName: 'patch of herbs',
    type: 'loose',
    habitats: ['forest'],
    baseWeight: 2,
    seasonWeights: { Thawbound: 2, Sunheight: 3, Emberwane: 4, Frostshroud: 1 },
    minQuantity: 1,
    maxQuantity: 3,
    timePerUnit: 0.2,
    respawnHours: 18,
    successSuffix: 'from a shaded glade.'
  },
  {
    id: 'open-fibers',
    resource: 'plant fibers',
    singularName: 'bundle of plant fibers',
    encounterName: 'tough meadow grasses',
    type: 'loose',
    habitats: ['open'],
    baseWeight: 3,
    seasonWeights: { Thawbound: 2, Sunheight: 4, Emberwane: 3, Frostshroud: 1 },
    minQuantity: 1,
    maxQuantity: 4,
    timePerUnit: 0.2,
    respawnHours: 16,
    successSuffix: 'by stripping tough grasses.'
  },
  {
    id: 'open-berries',
    resource: 'berries',
    singularName: 'handful of berries',
    encounterName: 'tangle of blackberries',
    type: 'harvest',
    habitats: ['open', 'forest'],
    baseWeight: 2,
    seasonWeights: { Thawbound: 0, Sunheight: 4, Emberwane: 5, Frostshroud: 1 },
    minQuantity: 3,
    maxQuantity: 8,
    timePerUnit: 0.18,
    respawnHours: 48,
    successSuffix: 'from a tangled bramble.',
    blockedVerb: 'harvest'
  },
  {
    id: 'open-stones',
    resource: 'small stones',
    singularName: 'small stone',
    encounterName: 'scatter of stones',
    type: 'loose',
    habitats: ['open', 'ore'],
    baseWeight: 3,
    seasonWeights: { Thawbound: 3, Sunheight: 3, Emberwane: 3, Frostshroud: 2 },
    minQuantity: 2,
    maxQuantity: 5,
    timePerUnit: 0.08,
    respawnHours: 8,
    successSuffix: 'from the ground.'
  },
  {
    id: 'shore-driftwood',
    resource: 'firewood',
    singularName: 'driftwood log',
    encounterName: 'driftwood',
    type: 'loose',
    habitats: ['water'],
    baseWeight: 2,
    seasonWeights: { Thawbound: 2, Sunheight: 2, Emberwane: 3, Frostshroud: 2 },
    minQuantity: 1,
    maxQuantity: 3,
    timePerUnit: 0.22,
    respawnHours: 14,
    successSuffix: 'washed up along the shore.'
  },
  {
    id: 'shore-herbs',
    resource: 'herbs',
    singularName: 'bundle of shoreline herbs',
    encounterName: 'stand of shoreline herbs',
    type: 'loose',
    habitats: ['water'],
    baseWeight: 1,
    seasonWeights: { Thawbound: 1, Sunheight: 2, Emberwane: 3, Frostshroud: 1 },
    minQuantity: 1,
    maxQuantity: 2,
    timePerUnit: 0.18,
    respawnHours: 20,
    successSuffix: 'from the marshy banks.'
  },
  {
    id: 'forest-log',
    resource: 'firewood',
    singularName: 'length of timber',
    encounterName: 'fallen log',
    type: 'harvest',
    habitats: ['forest'],
    baseWeight: 1.5,
    seasonWeights: { Thawbound: 2, Sunheight: 2, Emberwane: 2, Frostshroud: 1 },
    minQuantity: 3,
    maxQuantity: 6,
    timePerUnit: 0.35,
    respawnHours: 72,
    toolsRequired: ['stone hand axe'],
    successSuffix: 'after chopping apart a fallen log.',
    blockedVerb: 'fell'
  },
  {
    id: 'ore-vein',
    resource: 'raw ore',
    singularName: 'chunk of raw ore',
    encounterName: 'vein of ore',
    type: 'harvest',
    habitats: ['ore'],
    baseWeight: 1.2,
    seasonWeights: { Thawbound: 2, Sunheight: 2, Emberwane: 2, Frostshroud: 2 },
    minQuantity: 1,
    maxQuantity: 2,
    timePerUnit: 1.5,
    respawnHours: 0,
    toolsRequired: ['stone hand axe', 'wooden hammer'],
    successSuffix: 'from the exposed vein.',
    blockedVerb: 'mine'
  }
];

const HABITAT_ITEMS = [...BASE_HABITAT_ITEMS, ...STURDY_TREE_STICK_ITEMS];

export function getHabitatProspects(terrain) {
  if (!terrain) return [];
  const normalized = String(terrain).trim().toLowerCase();
  if (!normalized) return [];
  return HABITAT_ITEMS.filter(item => item.habitats.includes(normalized)).map(item => ({
    id: item.id,
    resource: item.resource,
    encounterName: item.encounterName || item.resource,
    type: item.type,
    toolsRequired: Array.isArray(item.toolsRequired) ? [...item.toolsRequired] : []
  }));
}

export const STURDY_STICK_RESOURCES = STURDY_TREE_STICK_ITEMS.map(item => item.resource);

function ensureGatherStore() {
  if (!(store.gatherNodes instanceof Map)) {
    const entries = Array.isArray(store.gatherNodes) ? store.gatherNodes : [];
    store.gatherNodes = new Map(entries);
  }
  return store.gatherNodes;
}

function nodeKey(locationId, x, y, itemId) {
  const loc = locationId || 'global';
  const safeX = Number.isFinite(x) ? Math.trunc(x) : 0;
  const safeY = Number.isFinite(y) ? Math.trunc(y) : 0;
  return `${loc}:${safeX}:${safeY}:${itemId}`;
}

function chooseWeighted(items, season) {
  const weights = items.map(item => {
    const weight = item.seasonWeights?.[season] ?? item.baseWeight ?? 0;
    return weight > 0 ? weight : 0;
  });
  const total = weights.reduce((sum, value) => sum + value, 0);
  if (!total) return null;
  let roll = Math.random() * total;
  for (let i = 0; i < items.length; i += 1) {
    roll -= weights[i];
    if (roll <= 0) {
      return items[i];
    }
  }
  return items[items.length - 1];
}

function randomInt(min, max) {
  const low = Math.min(min, max);
  const high = Math.max(min, max);
  const span = high - low + 1;
  return low + Math.floor(Math.random() * span);
}

function isNodeAvailable(node, currentHour) {
  if (!node) return true;
  if (node.depleted) return false;
  if (!Number.isFinite(node.availableAtHour)) return true;
  return currentHour >= node.availableAtHour;
}

function recordNodeHarvest(key, baseData, respawnHours, currentHour) {
  const node = {
    ...baseData,
    availableAtHour: Number.isFinite(respawnHours) && respawnHours > 0 ? currentHour + respawnHours : Infinity,
    respawnHours,
    depleted: respawnHours === 0
  };
  ensureGatherStore().set(key, node);
  return node;
}

function ensureNodePresence(key, baseData) {
  const map = ensureGatherStore();
  if (!map.has(key)) {
    map.set(key, { ...baseData, availableAtHour: baseData.availableAtHour ?? 0, respawnHours: baseData.respawnHours ?? 0, depleted: false });
  }
  return map.get(key);
}

function formatAmount(item, quantity) {
  const name = quantity === 1 && item.singularName ? item.singularName : item.resource;
  return `${quantity} ${name}`;
}

function formatSuccessMessage(item, quantity) {
  const verb = item.type === 'harvest' ? 'harvest' : 'gather';
  const amount = formatAmount(item, quantity);
  const suffix = item.successSuffix ? ` ${item.successSuffix}` : '.';
  const trimmedSuffix = suffix.trimEnd();
  const ending = trimmedSuffix.endsWith('.') ? trimmedSuffix : `${trimmedSuffix}.`;
  return `You ${verb} ${amount} ${ending}`.replace(/\s+/g, ' ').trim();
}

function articleFor(word = '') {
  const trimmed = word.trim().toLowerCase();
  if (!trimmed) return 'a';
  const vowels = ['a', 'e', 'i', 'o', 'u'];
  if (trimmed.startsWith('hour')) return 'an';
  return vowels.includes(trimmed[0]) ? 'an' : 'a';
}

function joinList(items = [], conjunction = 'and') {
  if (items.length <= 1) return items[0] || '';
  if (items.length === 2) return `${items[0]} ${conjunction} ${items[1]}`;
  const head = items.slice(0, -1).join(', ');
  const tail = items[items.length - 1];
  return `${head}, ${conjunction} ${tail}`;
}

export function formatBlockedMessages(blocked = []) {
  if (!Array.isArray(blocked) || !blocked.length) return [];
  const groups = new Map();
  blocked.forEach(entry => {
    const verb = entry.verb || 'harvest';
    if (!groups.has(verb)) groups.set(verb, []);
    groups.get(verb).push(entry);
  });
  const messages = [];
  groups.forEach(entries => {
    const verb = entries[0]?.verb || 'harvest';
    const objects = entries.map(item => `${articleFor(item.name)} ${item.name}`);
    const tools = Array.from(
      new Set(entries.flatMap(item => item.tools || []).filter(Boolean))
    );
    const objectText = joinList(objects, 'and');
    const toolPhrases = tools.length
      ? joinList(tools.map(tool => `${articleFor(tool)} ${tool}`), 'or')
      : '';
    const pronoun = entries.length > 1 ? 'them' : 'it';
    if (toolPhrases) {
      messages.push(`You see ${objectText} but don't have ${toolPhrases} to ${verb} ${pronoun}.`);
    } else {
      messages.push(`You see ${objectText} but lack the means to ${verb} ${pronoun}.`);
    }
  });
  return messages;
}

export function performGathering({
  locationId = null,
  x = 0,
  y = 0,
  terrain = 'open',
  season = 'Thawbound',
  availableTools = []
} = {}) {
  const tools = new Set((availableTools || []).map(tool => String(tool).toLowerCase()));
  const currentHour = getCurrentAbsoluteHours();
  const candidates = HABITAT_ITEMS.filter(item => item.habitats.includes(terrain));
  if (!candidates.length) {
    return { gathered: [], blocked: [], elapsedHours: 0 };
  }

  const attempts = Math.max(1, Math.round(Math.random() * 2) + 1);
  const gathered = [];
  const blocked = [];
  let elapsedHours = 0;

  for (let i = 0; i < attempts; i += 1) {
    const item = chooseWeighted(candidates, season);
    if (!item) continue;
    const key = nodeKey(locationId, x, y, item.id);
    const baseData = {
      key,
      itemId: item.id,
      locationId: locationId || 'global',
      x: Number.isFinite(x) ? Math.trunc(x) : 0,
      y: Number.isFinite(y) ? Math.trunc(y) : 0,
      respawnHours: item.respawnHours ?? 0,
      availableAtHour: currentHour
    };
    const node = ensureGatherStore().get(key) || ensureNodePresence(key, baseData);
    if (!isNodeAvailable(node, currentHour)) {
      continue;
    }

    if (Array.isArray(item.toolsRequired) && item.toolsRequired.length) {
      const missing = item.toolsRequired.filter(tool => !tools.has(tool.toLowerCase()));
      if (missing.length) {
        blocked.push({ name: item.encounterName || item.resource, tools: item.toolsRequired, verb: item.blockedVerb || 'harvest' });
        continue;
      }
    }

    const quantity = randomInt(item.minQuantity || 1, item.maxQuantity || 1);
    if (quantity <= 0) continue;
    const timePerUnit = Number.isFinite(item.timePerUnit) ? Math.max(0, item.timePerUnit) : 0.25;
    const timeSpent = timePerUnit * quantity;
    elapsedHours += timeSpent;

    gathered.push({
      resource: item.resource,
      quantity,
      timeHours: timeSpent,
      message: formatSuccessMessage(item, quantity),
      encounterName: item.encounterName || item.resource,
      itemId: item.id
    });

    recordNodeHarvest(key, baseData, item.respawnHours ?? 0, currentHour);
  }

  return { gathered, blocked, elapsedHours };
}

export default performGathering;
